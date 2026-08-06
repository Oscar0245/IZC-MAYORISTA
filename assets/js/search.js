/* Buscador del header: sugiere y redirige resultados. */
(function () {
  'use strict';

  var catalog = null;

  var SYNONYMS = {
    lector: ['scanner', 'escaner', 'barcode', 'codigo', 'barras', 'quickscan', 'imager'],
    camara: ['cctv', 'camera', 'ipc', 'seguridad', 'video', 'vigilancia'],
    monitor: ['pantalla', 'touch', 'tactil', 'lcd', 'display'],
    impresora: ['printer', 'etiqueta', 'etiquetas', 'termica'],
    terminal: ['movil', 'handheld', 'tablet', 'ck65', 'ck62', 'eda52', 'eda10'],
    huella: ['biometrico', 'biometricos', 'fingerprint', 'uareu'],
    grabador: ['nvr', 'dvr', 'recorder'],
    tarjeta: ['rfid', 'proximidad', 'card', 'omnikey'],
    codigo: ['barcode', 'barras', 'codigo'],
    honeywell: ['honewell', 'honey', 'voyager', 'xenon', 'orbit'],
    datalogic: ['data logic', 'magellan', 'quickscan'],
    imou: ['imo', 'ranger', 'cruiser', 'bullet', 'turret'],
    elo: ['pos', 'touchscreen'],
    hid: ['global', 'omnikey', 'uareu']
  };

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var matrix = [];
    var i;
    var j;

    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  function expandWord(word) {
    var expanded = [word];
    var key;

    for (key in SYNONYMS) {
      if (!Object.prototype.hasOwnProperty.call(SYNONYMS, key)) continue;
      var group = [key].concat(SYNONYMS[key]);
      var normalizedGroup = group.map(normalize);
      if (normalizedGroup.indexOf(word) !== -1) {
        expanded = expanded.concat(normalizedGroup);
      }
    }

    var unique = [];
    expanded.forEach(function (item) {
      if (unique.indexOf(item) === -1) unique.push(item);
    });
    return unique;
  }

  function expandQueryWords(query) {
    var words = normalize(query).split(/\s+/).filter(function (w) {
      return w.length >= 2;
    });
    var expanded = [];

    words.forEach(function (word) {
      expandWord(word).forEach(function (variant) {
        if (expanded.indexOf(variant) === -1) expanded.push(variant);
      });
    });

    return {
      original: words,
      expanded: expanded
    };
  }

  function isSimilarWord(queryWord, targetWord) {
    if (!queryWord || !targetWord) return false;
    if (queryWord === targetWord) return true;

    if (queryWord.length >= 3 && targetWord.indexOf(queryWord) !== -1) return true;
    if (targetWord.length >= 3 && queryWord.indexOf(targetWord) !== -1) return true;

    if (queryWord.length >= 4 && targetWord.length >= 4) {
      var maxDistance = queryWord.length <= 5 ? 1 : 2;
      if (levenshtein(queryWord, targetWord) <= maxDistance) return true;
    }

    return false;
  }

  function textMatchesWord(text, word) {
    if (!word) return false;
    var normalizedText = normalize(text);
    if (normalizedText.indexOf(word) !== -1) return true;

    var targetWords = normalizedText.split(/\s+/).filter(Boolean);
    return targetWords.some(function (targetWord) {
      return isSimilarWord(word, targetWord);
    });
  }

  function scoreTextMatch(query, text) {
    var queryData = expandQueryWords(query);
    var originalWords = queryData.original;
    var expandedWords = queryData.expanded;
    var normalizedText = normalize(text);
    var score = 0;
    var matchedOriginal = 0;

    originalWords.forEach(function (word) {
      var variants = expandWord(word);
      var wordMatched = variants.some(function (variant) {
        return textMatchesWord(normalizedText, variant);
      });

      if (wordMatched) {
        matchedOriginal++;
        if (normalizedText.indexOf(word) !== -1) {
          score += 20;
        } else {
          score += 12;
        }
      }
    });

    if (!originalWords.length) return 0;

    expandedWords.forEach(function (word) {
      if (normalizedText.indexOf(word) !== -1) {
        score += 4;
      }
    });

    if (matchedOriginal === originalWords.length) {
      score += 30;
    } else if (matchedOriginal > 0) {
      score += matchedOriginal * 8;
    }

    if (normalizedText.indexOf(normalize(query)) !== -1) {
      score += 25;
    }

    return score;
  }

  function getCurrentPage() {
    var path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
  }

  function extractSku(query) {
    var cleaned = query.replace(/^sku\s*:?\s*/i, '').trim();
    if (/^\d+$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  function findProductsBySku(sku) {
    if (!catalog) return [];
    return catalog.products.filter(function (p) {
      return p.sku === sku;
    });
  }

  function findBrandMatch(query) {
    if (!catalog || query.length < 2) return null;
    var norm = normalize(query);
    var bestBrand = null;
    var bestScore = 0;

    catalog.brands.forEach(function (brand) {
      var candidates = [brand.name].concat(brand.keywords || []);
      var brandScore = 0;

      candidates.forEach(function (candidate) {
        var candidateNorm = normalize(candidate);
        if (candidateNorm === norm) {
          brandScore = Math.max(brandScore, 100);
        } else if (candidateNorm.indexOf(norm) !== -1 || norm.indexOf(candidateNorm) !== -1) {
          brandScore = Math.max(brandScore, 70);
        } else if (isSimilarWord(norm, candidateNorm)) {
          brandScore = Math.max(brandScore, 55);
        } else {
          var score = scoreTextMatch(query, candidate);
          brandScore = Math.max(brandScore, score);
        }
      });

      if (brandScore > bestScore) {
        bestScore = brandScore;
        bestBrand = brand;
      }
    });

    return bestScore >= 50 ? bestBrand : null;
  }

  function findProductsByName(query) {
    if (!catalog || query.length < 2) return [];

    var scored = catalog.products.map(function (product) {
      var nameScore = scoreTextMatch(query, product.name);
      var skuScore = product.sku.indexOf(normalize(query).replace(/\D/g, '')) !== -1 ? 40 : 0;
      return {
        product: product,
        score: Math.max(nameScore, skuScore)
      };
    }).filter(function (item) {
      return item.score >= 16;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    return scored.map(function (item) {
      return item.product;
    });
  }

  function findProductType(query) {
    if (window.IZCBuscar && window.IZCBuscar.resolveType) {
      return window.IZCBuscar.resolveType(query);
    }

    var norm = normalize(query);
    var types = {
      lectores: ['lector', 'lectores', 'escaner', 'scanner', 'scaner', 'codigo de barras', 'barcode'],
      impresoras: ['impresora', 'impresoras'],
      monitores: ['monitor', 'monitores', 'touch'],
      camaras: ['camara', 'camaras', 'cctv'],
      movilidad: ['terminal movil', 'movilidad', 'tablet'],
      huella: ['huella', 'biometrico', 'uareu'],
      tarjetas: ['tarjeta', 'rfid', 'omnikey'],
      control: ['control de acceso', 'torniquete', 'barrera'],
      grabadores: ['grabador', 'nvr'],
      digitalizadores: ['digitalizador', 'firma'],
      red: ['switch', 'router', 'access point', 'poe'],
      consumibles: ['consumible', 'ribbon'],
      equipos: ['equipo pos', 'todo en uno']
    };

    var bestId = null;
    var bestScore = 0;

    Object.keys(types).forEach(function (id) {
      types[id].forEach(function (keyword) {
        var keyNorm = normalize(keyword);
        if (norm === keyNorm || id === norm) {
          bestScore = 100;
          bestId = id;
        } else if (norm.indexOf(keyNorm) !== -1 && norm.length >= 3) {
          bestScore = Math.max(bestScore, 80);
          bestId = id;
        }
      });
    });

    return bestScore >= 70 ? bestId : null;
  }

  function countDistinctBrands(products) {
    var brands = {};
    products.forEach(function (product) {
      brands[product.brand] = true;
    });
    return Object.keys(brands).length;
  }

  function findProductsByType(typeId) {
    if (!catalog || !typeId) return [];
    return catalog.products.filter(function (product) {
      return product.type === typeId;
    });
  }

  function preferCurrentBrand(items, brandKey) {
    if (!items.length) return items;
    var current = getCurrentPage();
    var onPage = items.filter(function (item) {
      return item[brandKey] + '.html' === current;
    });
    return onPage.length ? onPage : items;
  }

  function resolveSearch(query) {
    query = String(query || '').trim();
    if (!query || !catalog) return null;

    var sku = extractSku(query);
    if (sku) {
      var skuProducts = findProductsBySku(sku);
      if (skuProducts.length) {
        var product = preferCurrentBrand(skuProducts, 'brand')[0];
        return {
          type: 'sku',
          brand: product.brand,
          sku: product.sku,
          page: product.brand + '.html'
        };
      }
    }

    // Subcategorías del menú (ej. lectores-de-mano) antes que tipos generales
    if (window.IZCBuscar && window.IZCBuscar.resolveSubtype) {
      var subtypeId = window.IZCBuscar.resolveSubtype(query);
      if (subtypeId) {
        return {
          type: 'category',
          query: subtypeId,
          page: 'buscar.html'
        };
      }
    } else {
      var maybeSubtype = String(query || '').trim().toLowerCase();
      if (/^(lectores|impresoras|camaras|grabadores|consumibles|control|accesorios|access|radio|routers|switch|mini|equipos|monitores|terminales|impresoras)-[a-z0-9-]+$/.test(maybeSubtype)) {
        return {
          type: 'category',
          query: maybeSubtype,
          page: 'buscar.html'
        };
      }
    }

    var productType = findProductType(query);
    if (productType) {
      var typeProducts = findProductsByType(productType);
      if (typeProducts.length) {
        return {
          type: 'category',
          query: productType,
          page: 'buscar.html'
        };
      }
    }

    var brand = findBrandMatch(query);
    if (brand) {
      var exactBrand = normalize(brand.name) === normalize(query) ||
        (brand.keywords || []).some(function (k) { return normalize(k) === normalize(query); });
      var likelyBrandOnly = exactBrand || scoreTextMatch(query, brand.name) >= 70;

      if (likelyBrandOnly && normalize(query).length >= 3) {
        return {
          type: 'brand',
          brand: brand.id,
          page: brand.page
        };
      }
    }

    var products = findProductsByName(query);
    if (products.length) {
      if (countDistinctBrands(products) > 1) {
        return {
          type: 'category',
          query: query,
          page: 'buscar.html'
        };
      }
      products = preferCurrentBrand(products, 'brand');
      if (products.length === 1) {
        return {
          type: 'sku',
          brand: products[0].brand,
          sku: products[0].sku,
          page: products[0].brand + '.html'
        };
      }
      return {
        type: 'query',
        brand: products[0].brand,
        query: query,
        page: products[0].brand + '.html'
      };
    }

    if (brand) {
      return {
        type: 'brand',
        brand: brand.id,
        page: brand.page
      };
    }

    return null;
  }

  function buildTargetUrl(result) {
    if (!result) return null;
    if (result.type === 'category') {
      return 'buscar.html?q=' + encodeURIComponent(result.query);
    }
    if (result.type === 'sku') {
      return result.page + '?sku=' + encodeURIComponent(result.sku);
    }
    if (result.type === 'query') {
      return result.page + '?q=' + encodeURIComponent(result.query);
    }
    return result.page;
  }

  function cardMatchesQuery(card, query) {
    var skuElem = card.querySelector('.sku');
    var titleElem = card.querySelector('.product-title');
    var skuText = skuElem ? skuElem.textContent : '';
    var titleText = titleElem ? titleElem.textContent : '';
    var combined = titleText + ' ' + skuText;

    return scoreTextMatch(query, combined) >= 16;
  }

  function updateItemCount(visible) {
    var itemCountDisplay = document.getElementById('itemCountDisplay');
    if (itemCountDisplay) {
      itemCountDisplay.textContent = visible + ' artículos';
    }
    var noProductsMsg = document.getElementById('noProductsMessage');
    if (noProductsMsg) {
      noProductsMsg.style.display = visible === 0 ? 'block' : 'none';
    }
  }

  function filterProductGrid(options) {
    var productGrid = document.getElementById('productGrid');
    if (!productGrid) return false;

    var productCards = productGrid.querySelectorAll('.product-card');
    if (!productCards.length) return false;

    var visible = 0;

    productCards.forEach(function (card) {
      var skuElem = card.querySelector('.sku');
      var skuText = skuElem ? skuElem.textContent.replace(/\D/g, '').trim() : '';
      var show = false;

      if (options.sku) {
        show = skuText === options.sku;
      } else if (options.query) {
        show = cardMatchesQuery(card, options.query);
      } else {
        show = true;
      }

      card.style.display = show ? 'flex' : 'none';
      if (show) visible++;
    });

    updateItemCount(visible);

    var searchInput = document.getElementById('searchInput');
    if (searchInput && (options.sku || options.query)) {
      searchInput.value = options.sku || options.query;
    }

    return true;
  }

  function applyUrlSearchFilter() {
    var params = new URLSearchParams(window.location.search);
    var paramSku = params.get('sku');
    var paramQuery = params.get('q');

    if (paramSku) {
      filterProductGrid({ sku: paramSku.replace(/\D/g, '').trim() });
      return;
    }

    if (paramQuery) {
      filterProductGrid({ query: paramQuery });
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    var searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    var query = searchInput.value.trim();
    if (!query) return;

    var result = resolveSearch(query);
    if (!result) {
      window.alert('No se encontraron productos ni marcas que coincidan con "' + query + '".');
      return;
    }

    var targetUrl = buildTargetUrl(result);
    var currentPage = getCurrentPage();

    if (result.page === currentPage && document.getElementById('productGrid') && result.type !== 'category') {
      if (result.type === 'sku') {
        filterProductGrid({ sku: result.sku });
      } else if (result.type === 'query') {
        filterProductGrid({ query: result.query });
      }
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', targetUrl);
      }
      return;
    }

    window.location.href = targetUrl;
  }

  function initSearchForm() {
    var searchForm = document.getElementById('searchForm');
    if (!searchForm) return;

    searchForm.setAttribute('action', '#');
    searchForm.addEventListener('submit', handleSearchSubmit);
  }

  function init() {
    initSearchForm();
    applyUrlSearchFilter();
  }

  function loadCatalogJson() {
    if (window.IZCData && typeof window.IZCData.loadJson === 'function') {
      return window.IZCData.loadJson('assets/files/catalogo.json');
    }
    return fetch('assets/files/catalogo.json').then(function (response) {
      if (!response.ok) throw new Error('Catalog not found');
      return response.json();
    });
  }

  loadCatalogJson()
    .then(function (data) {
      catalog = data;
      init();
    })
    .catch(function () {
      init();
    });

  window.IZCSearch = {
    resolveSearch: resolveSearch,
    applyUrlSearchFilter: applyUrlSearchFilter,
    filterProductGrid: filterProductGrid,
    scoreTextMatch: scoreTextMatch
  };
})();

(function () {
  'use strict';

  var catalog = null;
  var grid = null;
  var titleEl = null;
  var subtitleEl = null;

  var PRODUCT_TYPES = {
    lectores: {
      label: 'Lectores',
      keywords: ['lectores de codigo de barras', 'lector de codigo de barras', 'codigo de barras', 'barcode', 'quickscan', 'magellan', 'voyager', 'xenon', 'escaner', 'scanner', 'scaner', 'lectores', 'lector']
    },
    impresoras: {
      label: 'Impresoras',
      keywords: ['impresora', 'impresoras', 'etiqueta', 'termica']
    },
    monitores: {
      label: 'Monitores Touch',
      keywords: ['monitor', 'monitores', 'touch', 'pantalla tactil', 'pantalla táctil']
    },
    camaras: {
      label: 'Cámaras',
      keywords: ['camara', 'camaras', 'cctv', 'vigilancia', 'bullet', 'turret', 'ranger', 'cruiser']
    },
    movilidad: {
      label: 'Terminales Móviles',
      keywords: ['terminal movil', 'terminal móvil', 'movilidad', 'handheld', 'tablet', 'ck65', 'eda52', 'eda10']
    },
    huella: {
      label: 'Lectores Biométricos',
      keywords: ['huella', 'biometrico', 'biometricos', 'fingerprint', 'uareu']
    },
    tarjetas: {
      label: 'Lectores de Tarjetas',
      keywords: ['lectores de tarjetas', 'lector de tarjetas', 'tarjeta', 'rfid', 'proximidad', 'omnikey', 'proid']
    },
    control: {
      label: 'Control de Acceso',
      keywords: ['control de acceso', 'torniquete', 'barrera', 'asistencia', 'reconocimiento facial']
    },
    grabadores: {
      label: 'Grabadores NVR',
      keywords: ['grabador', 'nvr', 'dvr']
    },
    digitalizadores: {
      label: 'Digitalizadores',
      keywords: ['digitalizador', 'digitalizadora', 'firma', 'topaz']
    },
    red: {
      label: 'Red y Conectividad',
      keywords: ['switch', 'router', 'access point', 'accesspoint', 'poe', 'wifi', 'reyee', 'ruijie']
    },
    consumibles: {
      label: 'Consumibles',
      keywords: ['consumible', 'ribbon', 'cinta']
    },
    equipos: {
      label: 'Equipos POS',
      keywords: ['equipo pos', 'todo en uno', 'punto de venta']
    }
  };

  var PRODUCT_SUBTYPES = {
    'lectores-de-mano': { label: 'Lectores de Mano', parent: 'lectores' },
    'lectores-inalambricos': { label: 'Lectores Inalámbricos', parent: 'lectores' },
    'lectores-de-mesa': { label: 'Lectores de Mesa', parent: 'lectores' },
    'lectores-empotrables': { label: 'Lectores Empotrables', parent: 'lectores' },
    'equipos-pos': { label: 'Equipos para Punto de Venta', parent: 'equipos' },
    'monitores-touch': { label: 'Monitores Touch', parent: 'monitores' },    'impresoras-escritorio': { label: 'Impresoras de Escritorio', parent: 'impresoras' },
    'impresoras-semi-industriales': { label: 'Impresoras Semi Industriales', parent: 'impresoras' },
    'impresoras-industriales': { label: 'Impresoras Industriales', parent: 'impresoras' },
    'impresoras-carnet': { label: 'Impresoras de Carnet', parent: 'impresoras' },
    'impresoras-manillas': { label: 'Impresoras de Manillas', parent: 'impresoras' },
    'consumibles-etiquetas': { label: 'Etiquetas adhesivas', parent: 'consumibles' },
    'consumibles-ribbons': { label: 'Ribbons o Cintas', parent: 'consumibles' },
    'consumibles-manillas': { label: 'Manillas', parent: 'consumibles' },
    'consumibles-kits': { label: 'Kits de limpieza', parent: 'consumibles' },
    'control-acceso': { label: 'Controles de Acceso', parent: 'control' },
    'accesorios-acceso': { label: 'Accesorios de Control de Acceso', parent: 'control' },
    'lectores-tarjetas': { label: 'Lectores de Tarjetas', parent: 'tarjetas' },
    'camaras-ip': { label: 'Cámaras IP', parent: 'camaras' },
    'camaras-wifi': { label: 'Cámaras WIFI', parent: 'camaras' },
    'grabadores-analogo': { label: 'Grabadores Análogos', parent: 'grabadores' },
    'grabadores-ip': { label: 'Grabadores IP', parent: 'grabadores' },
    'accesorios-cctv': { label: 'Accesorios para CCTV', parent: 'camaras' },
    'access-point': { label: 'Access Point', parent: 'red' },
    'radio-enlaces': { label: 'Radio Enlaces', parent: 'red' },
    'routers': { label: 'Routers', parent: 'red' },
    'switch-poe': { label: 'Switch PoE', parent: 'red' },
    'impresoras-portatiles': { label: 'Impresoras Portátiles', parent: 'impresoras' },
    'terminales-moviles': { label: 'Terminales Móviles', parent: 'movilidad' }
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

  function resolveSubtype(query) {
    var norm = normalize(query).replace(/\s+/g, '-');
    if (!norm) return null;
    if (Object.prototype.hasOwnProperty.call(PRODUCT_SUBTYPES, norm)) return norm;
    if (Object.prototype.hasOwnProperty.call(PRODUCT_SUBTYPES, query)) return query;
    return null;
  }

  function productHasSubtype(product, subtypeId) {
    if (!product || !subtypeId) return false;
    if (product.subtype === subtypeId) return true;
    if (Array.isArray(product.subtypes)) {
      return product.subtypes.indexOf(subtypeId) !== -1;
    }
    return false;
  }

  function resolveType(query) {
    var subtypeId = resolveSubtype(query);
    if (subtypeId) return PRODUCT_SUBTYPES[subtypeId].parent || null;

    var norm = normalize(query);
    if (!norm) return null;

    // Match exact type id first (botones: lectores, tarjetas, etc.)
    if (Object.prototype.hasOwnProperty.call(PRODUCT_TYPES, norm)) {
      return norm;
    }

    var bestId = null;
    var bestScore = 0;

    Object.keys(PRODUCT_TYPES).forEach(function (id) {
      var type = PRODUCT_TYPES[id];
      type.keywords.forEach(function (keyword) {
        var keyNorm = normalize(keyword);
        var score = 0;
        if (norm === keyNorm) {
          score = 100;
        } else if (norm.length >= 4 && norm.indexOf(keyNorm) !== -1) {
          score = 80;
        } else if (norm.length >= 4 && keyNorm.indexOf(norm) !== -1) {
          // Más débil: evita que "lectores" active "lectores de tarjetas"
          score = 40;
        }
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      });
    });

    return bestScore >= 70 ? bestId : null;
  }

  function textScore(query, text) {
    if (window.IZCSearch && window.IZCSearch.scoreTextMatch) {
      return window.IZCSearch.scoreTextMatch(query, text);
    }
    var norm = normalize(text);
    var q = normalize(query);
    if (!q) return 0;
    if (norm.indexOf(q) !== -1) return 50;
    return q.split(/\s+/).every(function (word) {
      return norm.indexOf(word) !== -1;
    }) ? 30 : 0;
  }

  function filterProducts(query) {
    if (!catalog) return [];

    var subtypeId = resolveSubtype(query);
    if (subtypeId) {
      return catalog.products.filter(function (product) {
        return productHasSubtype(product, subtypeId);
      });
    }

    var typeId = resolveType(query);
    if (typeId) {
      var barcodeSubtypes = [
        'lectores-de-mano',
        'lectores-inalambricos',
        'lectores-de-mesa',
        'lectores-empotrables'
      ];
      return catalog.products.filter(function (product) {
        if (product.type === typeId || product.category === typeId) return true;
        if (Array.isArray(product.types) && product.types.indexOf(typeId) !== -1) return true;
        if (typeId === 'tarjetas' && productHasSubtype(product, 'lectores-tarjetas')) return true;
        if (typeId === 'lectores') {
          return barcodeSubtypes.some(function (sub) {
            return productHasSubtype(product, sub);
          });
        }
        return false;
      });
    }

    return catalog.products.filter(function (product) {
      var combined = product.name + ' ' + product.brandName + ' ' + product.sku;
      return textScore(query, combined) >= 16;
    }).sort(function (a, b) {
      return textScore(query, b.name) - textScore(query, a.name);
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderProductCard(product) {
    var brandPage = product.brandPage || (product.brand + '.html');
    var link = 'producto.html?sku=' + encodeURIComponent(product.sku);
    return (
      '<div class="product-card">' +
        '<button class="wishlist-btn" type="button">&#9825;</button>' +
        '<div class="product-img">' +
          '<img src="' + escapeHtml(product.img) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'assets/imgmarcas/' + escapeHtml(product.brandLogo) + '\'">' +
        '</div>' +
        '<div class="product-info">' +
          '<span class="sku">Sku: ' + escapeHtml(product.sku) + '</span>' +
          '<span class="price">$ 0.00</span>' +
          '<h4 class="product-title">' +
            '<a href="' + link + '">' + escapeHtml(product.name) + '</a>' +
          '</h4>' +
        '</div>' +
      '</div>'
    );
  }

  function updateCount(count) {
    var itemCountDisplay = document.getElementById('itemCountDisplay');
    if (itemCountDisplay) {
      itemCountDisplay.textContent = count + ' artículos';
    }
    var noProductsMessage = document.getElementById('noProductsMessage');
    if (noProductsMessage) {
      noProductsMessage.style.display = count === 0 ? 'block' : 'none';
    }
  }

  function renderTypeTags(activeQuery) {
    var container = document.getElementById('searchTypeTags');
    if (!container) return;

    var activeType = resolveType(activeQuery);
    container.innerHTML = Object.keys(PRODUCT_TYPES).map(function (id) {
      var type = PRODUCT_TYPES[id];
      var active = activeType === id ? ' active' : '';
      return '<a href="buscar.html?q=' + encodeURIComponent(id) + '" class="' + active.trim() + '">' + type.label + '</a>';
    }).join('');
  }

  function applyPricesToGrid() {
    if (window.IZCPrices && grid) {
      window.IZCPrices.apply(grid);
    }
  }

  function renderResults(query) {
    if (!grid) return;

    var products = filterProducts(query);
    var subtypeId = resolveSubtype(query);
    var typeId = resolveType(query);
    var label = null;
    if (subtypeId && PRODUCT_SUBTYPES[subtypeId]) {
      label = PRODUCT_SUBTYPES[subtypeId].label;
    } else if (typeId && PRODUCT_TYPES[typeId]) {
      label = PRODUCT_TYPES[typeId].label;
    }

    if (titleEl) {
      titleEl.textContent = label
        ? label + ' — todas las marcas'
        : 'Resultados para "' + query + '"';
    }

    if (subtitleEl) {
      subtitleEl.textContent = products.length
        ? 'Mostrando ' + products.length + ' producto(s) de todas las marcas disponibles.'
        : 'No encontramos productos que coincidan con tu búsqueda.';
    }

    grid.innerHTML = products.map(renderProductCard).join('');
    updateCount(products.length);
    renderTypeTags(query);
    applyPricesToGrid();

    if (window.IZCPrices) {
      window.IZCPrices.load().then(applyPricesToGrid);
    }

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = query;
    }
  }

  function initWishlist() {
    if (window.IZCWishlist && typeof window.IZCWishlist.syncCardButtons === 'function') {
      window.IZCWishlist.syncCardButtons(document);
      return;
    }
  }

  function init() {
    grid = document.getElementById('productGrid');
    titleEl = document.getElementById('searchResultsTitle');
    subtitleEl = document.getElementById('searchResultsSubtitle');

    var params = new URLSearchParams(window.location.search);
    var query = params.get('q') || params.get('tipo') || '';

    if (!query) {
      if (titleEl) titleEl.textContent = 'Buscar productos';
      if (subtitleEl) subtitleEl.textContent = 'Escribe en el buscador o elige una categoría.';
      renderTypeTags('');
      return;
    }

    renderResults(query);
    initWishlist();
  }

  function startApp() {
    var pricesReady = window.IZCPrices
      ? window.IZCPrices.load()
      : Promise.resolve(null);

    pricesReady
      .catch(function () { return null; })
      .then(function () {
        init();
      });
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
      startApp();
    })
    .catch(function () {
      startApp();
    });

  window.IZCBuscar = {
    PRODUCT_TYPES: PRODUCT_TYPES,
    PRODUCT_SUBTYPES: PRODUCT_SUBTYPES,
    resolveType: resolveType,
    resolveSubtype: resolveSubtype,
    filterProducts: filterProducts
  };
})();

/* Lista los productos guardados en favoritos. */
(function () {
  'use strict';

  var grid = null;
  var titleEl = null;
  var subtitleEl = null;

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(product) {
    var brandPage = product.brandPage || ((product.brand || '') + '.html');
    var logo = product.brandLogo || ((product.brandName || product.brand || 'brand') + '.png');
    var link = 'producto.html?sku=' + encodeURIComponent(product.sku);
    var img = product.img || ('assets/imgmarcas/' + logo);
    return (
      '<div class="product-card" data-sku="' + escapeHtml(product.sku) + '">' +
        '<button class="wishlist-btn" type="button" aria-pressed="true">♥</button>' +
        '<div class="product-img">' +
          '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'assets/imgmarcas/' + escapeHtml(logo) + '\'">' +
        '</div>' +
        '<div class="product-info">' +
          '<span class="sku">Sku: ' + escapeHtml(product.sku) + '</span>' +
          '<span class="price">$ 0.00</span>' +
          '<h4 class="product-title">' +
            '<a href="' + escapeHtml(link) + '">' + escapeHtml(product.name) + '</a>' +
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
    var empty = document.getElementById('noProductsMessage');
    if (empty) {
      empty.style.display = count === 0 ? 'block' : 'none';
    }
  }

  function applyPrices() {
    if (window.IZCPrices && grid) {
      window.IZCPrices.apply(grid);
      if (window.IZCPrices.load) {
        window.IZCPrices.load().then(function () {
          window.IZCPrices.apply(grid);
        });
      }
    }
  }

  function renderFavorites(catalog) {
    if (!grid) return;

    var liked = window.IZCWishlist ? window.IZCWishlist.getAll() : [];
    var bySku = {};
    (catalog.products || []).forEach(function (product) {
      bySku[String(product.sku)] = product;
    });

    var products = liked
      .map(function (sku) {
        return bySku[String(sku)];
      })
      .filter(Boolean);

    if (titleEl) titleEl.textContent = 'Mis favoritos';
    if (subtitleEl) {
      subtitleEl.textContent = products.length
        ? 'Tienes ' + products.length + ' producto(s) guardados.'
        : 'Aún no has marcado productos con el corazón.';
    }

    grid.innerHTML = products.map(renderCard).join('');
    updateCount(products.length);
    applyPrices();

    if (window.IZCWishlist) {
      window.IZCWishlist.syncCardButtons(grid);
      window.IZCWishlist.updateHeaderBadge();
    }
  }

  function boot() {
    grid = document.getElementById('productGrid');
    titleEl = document.getElementById('searchResultsTitle');
    subtitleEl = document.getElementById('searchResultsSubtitle');

    var loadCatalog = window.IZCData && typeof window.IZCData.loadJson === 'function'
      ? window.IZCData.loadJson('assets/files/catalogo.json', { cache: 'no-store' })
      : fetch('assets/files/catalogo.json', { cache: 'no-store' }).then(function (response) {
          if (!response.ok) throw new Error('No catalog');
          return response.json();
        });

    loadCatalog
      .then(function (catalog) {
        renderFavorites(catalog);
        document.addEventListener('izc:wishlist-changed', function () {
          renderFavorites(catalog);
        });
      })
      .catch(function (error) {
        console.error('No se pudieron cargar los favoritos:', error);
        if (subtitleEl) subtitleEl.textContent = 'No se pudo cargar el catálogo.';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

(function () {
  'use strict';

  var STORAGE_KEY = 'izc_wishlist_skus';
  var EMPTY = '\u2661';
  var FULL = '\u2665';

  function readSkus() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return list.map(String).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function writeSkus(skus) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skus));
    document.dispatchEvent(new CustomEvent('izc:wishlist-changed', { detail: { skus: skus } }));
  }

  function getAll() {
    return readSkus();
  }

  function has(sku) {
    return readSkus().indexOf(String(sku)) !== -1;
  }

  function count() {
    return readSkus().length;
  }

  function add(sku) {
    sku = String(sku || '');
    if (!sku) return false;
    var skus = readSkus();
    if (skus.indexOf(sku) !== -1) return false;
    skus.push(sku);
    writeSkus(skus);
    return true;
  }

  function remove(sku) {
    sku = String(sku || '');
    var skus = readSkus().filter(function (item) {
      return item !== sku;
    });
    writeSkus(skus);
    return true;
  }

  function toggle(sku) {
    if (has(sku)) {
      remove(sku);
      return false;
    }
    add(sku);
    return true;
  }

  function skuFromCard(card) {
    if (!card) return '';
    if (card.getAttribute('data-sku')) return card.getAttribute('data-sku');
    var skuEl = card.querySelector('.sku');
    if (!skuEl) return '';
    return skuEl.textContent.replace(/\D/g, '').trim();
  }

  function paintButton(btn, liked) {
    if (!btn) return;
    btn.textContent = liked ? FULL : EMPTY;
    btn.style.color = liked ? '#e60000' : '#888';
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    btn.title = liked ? 'Quitar de favoritos' : 'Agregar a favoritos';
  }

  function syncCardButtons(root) {
    var scope = root || document;
    scope.querySelectorAll('.product-card').forEach(function (card) {
      var sku = skuFromCard(card);
      var btn = card.querySelector('.wishlist-btn');
      if (!sku || !btn) return;
      paintButton(btn, has(sku));
    });
  }

  function updateHeaderBadge() {
    var link = document.getElementById('headerWishlist');
    var total = count();
    if (link) {
      link.setAttribute('aria-label', total ? 'Mis favoritos (' + total + ')' : 'Mis favoritos');
      link.classList.toggle('has-items', total > 0);
    }
  }

  function ensureHeaderButton() {
    if (document.getElementById('headerWishlist')) return;
    var form = document.getElementById('searchForm');
    if (!form || !form.parentNode) return;

    var link = document.createElement('a');
    link.href = 'favoritos.html';
    link.className = 'header-wishlist';
    link.id = 'headerWishlist';
    link.title = 'Mis favoritos';
    link.setAttribute('aria-label', 'Mis favoritos');
    link.innerHTML =
      '<span class="header-wishlist-icon" aria-hidden="true">' + FULL + '</span>';

    form.insertAdjacentElement('afterend', link);
  }

  function onWishlistClick(event) {
    var btn = event.target.closest('.wishlist-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();

    var card = btn.closest('.product-card');
    var sku = skuFromCard(card);
    if (!sku) return;

    var liked = toggle(sku);
    paintButton(btn, liked);
    updateHeaderBadge();
  }

  function boot() {
    ensureHeaderButton();
    updateHeaderBadge();
    syncCardButtons(document);

    document.addEventListener('click', onWishlistClick);
    document.addEventListener('izc:wishlist-changed', function () {
      updateHeaderBadge();
      syncCardButtons(document);
    });

    // Re-sync after dynamic grids render
    var observer = new MutationObserver(function (mutations) {
      var needsSync = mutations.some(function (m) {
        return Array.prototype.some.call(m.addedNodes, function (node) {
          return node.nodeType === 1 && (
            (node.classList && node.classList.contains('product-card')) ||
            (node.querySelector && node.querySelector('.product-card'))
          );
        });
      });
      if (needsSync) syncCardButtons(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.IZCWishlist = {
    getAll: getAll,
    has: has,
    count: count,
    add: add,
    remove: remove,
    toggle: toggle,
    syncCardButtons: syncCardButtons,
    updateHeaderBadge: updateHeaderBadge,
    EMPTY: EMPTY,
    FULL: FULL
  };
})();

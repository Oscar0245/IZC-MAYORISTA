/* Aplica precios USD a las tarjetas de productos. */
(function () {
  'use strict';

  var priceMap = null;
  var loadPromise = null;
  var lastStamp = null;
  var POLL_MS = 3000;
  var PRECIOS_PATH = 'assets/files/precios.json';

  function formatUSD(value) {
    return '$ ' + Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function lookupPrice(sku) {
    if (!priceMap || !sku) return null;
    if (Object.prototype.hasOwnProperty.call(priceMap, sku)) return priceMap[sku];
    var skuNoZeros = String(sku).replace(/^0+/, '');
    if (skuNoZeros && Object.prototype.hasOwnProperty.call(priceMap, skuNoZeros)) {
      return priceMap[skuNoZeros];
    }
    return null;
  }

  function applyPrices(root) {
    if (!priceMap) return;
    var scope = root || document;
    scope.querySelectorAll('.product-card, .product-carddatalogic').forEach(function (card) {
      var skuElem = card.querySelector('.sku');
      var priceElem = card.querySelector('.price');
      if (!skuElem || !priceElem) return;
      var price = lookupPrice(skuElem.textContent.replace(/\D/g, '').trim());
      if (price != null) priceElem.textContent = formatUSD(price);
    });

    var detailPrice = document.getElementById('productPrice');
    if (detailPrice && detailPrice.getAttribute('data-sku')) {
      var detailSku = detailPrice.getAttribute('data-sku');
      var detailValue = lookupPrice(detailSku);
      if (detailValue != null) detailPrice.textContent = formatUSD(detailValue);
    }
  }

  function parsePricePayload(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed || trimmed.charAt(0) !== '{') return null;
    try {
      var data = JSON.parse(trimmed);
      if (!data || typeof data !== 'object' || data.error) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function currentStamp() {
    if (typeof window.__IZC_PRICES_STAMP__ !== 'undefined' && window.__IZC_PRICES_STAMP__ != null) {
      return String(window.__IZC_PRICES_STAMP__);
    }
    if (!priceMap) return '';
    var keys = Object.keys(priceMap);
    return String(keys.length);
  }

  function mapsEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (var i = 0; i < keysA.length; i++) {
      var key = keysA[i];
      if (a[key] !== b[key]) return false;
    }
    return true;
  }

  function fromJson(forceReload) {
    if (window.IZCData && typeof window.IZCData.loadJson === 'function') {
      return window.IZCData.loadJson(PRECIOS_PATH, { cache: 'no-store', forceReload: !!forceReload })
        .then(function (data) {
          if (!data || typeof data !== 'object' || data.error) return null;
          return data;
        })
        .catch(function () { return null; });
    }
    var url = PRECIOS_PATH + (forceReload ? ('?t=' + Date.now()) : '');
    return fetch(url, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) return null;
        return response.text().then(parsePricePayload);
      })
      .catch(function () { return null; });
  }

  function loadPrices(options) {
    options = options || {};
    var force = !!options.forceReload;

    if (!force && priceMap) return Promise.resolve(priceMap);
    if (!force && loadPromise) return loadPromise;

    var request = fromJson(force)
      .then(function (mapa) {
        if (mapa) return mapa;
        if (location.protocol === 'file:') return null;
        return fetch('assets/files/precios.php', { cache: 'no-store' }).then(function (response) {
          if (!response.ok) throw new Error('No hay precios');
          return response.text().then(function (text) {
            var data = parsePricePayload(text);
            if (!data) throw new Error('precios.php no devolvió JSON');
            return data;
          });
        });
      })
      .then(function (mapa) {
        var next = mapa || {};
        var stamp = currentStamp();
        var changed = !mapsEqual(priceMap, next) || (stamp && stamp !== lastStamp);
        priceMap = next;
        if (stamp) lastStamp = stamp;
        if (changed) {
          applyPrices();
          try {
            document.dispatchEvent(new CustomEvent('izc:prices-updated', { detail: { stamp: lastStamp } }));
          } catch (e) { /* IE ignore */ }
        }
        return priceMap;
      })
      .catch(function (error) {
        console.error('Error al cargar precios:', error);
        return priceMap;
      })
      .finally(function () {
        if (!force) loadPromise = null;
      });

    if (!force) loadPromise = request;
    return request;
  }

  function startAutoRefresh() {
    if (window.__IZC_PRICES_WATCHING__) return;
    window.__IZC_PRICES_WATCHING__ = true;
    setInterval(function () {
      loadPrices({ forceReload: true });
    }, POLL_MS);
  }

  function boot() {
    loadPrices().then(function () {
      startAutoRefresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.IZCPrices = {
    load: loadPrices,
    reload: function () { return loadPrices({ forceReload: true }); },
    apply: applyPrices,
    get: lookupPrice
  };
})();

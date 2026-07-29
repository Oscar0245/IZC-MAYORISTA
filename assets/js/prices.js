(function () {
  'use strict';

  var priceMap = null;
  var loadPromise = null;

  function formatUSD(value) {
    return '$ ' + Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function lookupPrice(sku) {
    if (!priceMap || !sku) return null;
    if (Object.prototype.hasOwnProperty.call(priceMap, sku)) return priceMap[sku];
    var skuNoZeros = sku.replace(/^0+/, '');
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
  }

  function parsePricePayload(text) {
    var trimmed = String(text || '').trim();
    // GitHub Pages serves precios.php as raw PHP source
    if (!trimmed || trimmed.charAt(0) !== '{') return null;
    try {
      var data = JSON.parse(trimmed);
      if (!data || typeof data !== 'object' || data.error) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function loadPrices() {
    if (priceMap) return Promise.resolve(priceMap);
    if (loadPromise) return loadPromise;

    loadPromise = fetch('assets/files/precios.php', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) return null;
        return response.text().then(parsePricePayload);
      })
      .catch(function () { return null; })
      .then(function (mapa) {
        if (mapa) return mapa;
        return fetch('assets/files/precios.json', { cache: 'no-store' }).then(function (response) {
          if (!response.ok) throw new Error('No se pudo cargar precios.json');
          return response.text().then(function (text) {
            var data = parsePricePayload(text);
            if (!data) throw new Error('precios.json inválido');
            return data;
          });
        });
      })
      .then(function (mapa) {
        priceMap = mapa || {};
        applyPrices();
        return priceMap;
      })
      .catch(function (error) {
        console.error('Error al cargar precios:', error);
        loadPromise = null;
        return null;
      });

    return loadPromise;
  }

  function boot() {
    loadPrices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.IZCPrices = {
    load: loadPrices,
    apply: applyPrices,
    get: lookupPrice
  };
})();

(function () {
  'use strict';

  // precios.php regenera precios.json si el Excel cambió; JSON es respaldo
  var PRICE_URLS = [
    'assets/files/precios.php',
    'assets/files/precios.json'
  ];

  var priceMap = null;
  var loadPromise = null;

  function skuFromElement(skuElem) {
    return skuElem.textContent.replace(/\D/g, '').trim();
  }

  function formatUSD(value) {
    return '$ ' + Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function lookupPrice(sku) {
    if (!priceMap || !sku) return null;
    if (Object.prototype.hasOwnProperty.call(priceMap, sku)) {
      return priceMap[sku];
    }
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

      var price = lookupPrice(skuFromElement(skuElem));
      if (price != null) {
        priceElem.textContent = formatUSD(price);
      }
    });
  }

  function fetchPrices(url) {
    return fetch(url, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('No se pudo cargar ' + url);
      return response.json();
    }).then(function (mapa) {
      if (!mapa || mapa.error) {
        throw new Error((mapa && mapa.error) || 'Respuesta inválida');
      }
      return mapa;
    });
  }

  function loadPrices() {
    if (priceMap) return Promise.resolve(priceMap);
    if (loadPromise) return loadPromise;

    loadPromise = fetchPrices(PRICE_URLS[0])
      .catch(function () { return fetchPrices(PRICE_URLS[1]); })
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

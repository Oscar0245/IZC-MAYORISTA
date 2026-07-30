(function () {
  'use strict';

  window.__IZC_DATA__ = window.__IZC_DATA__ || {};

  function dataScriptPath(jsonPath) {
    return String(jsonPath || '').replace(/\.json$/i, '.data.js');
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-izc-json="' + src + '"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('No se pudo cargar ' + src)); });
        if (existing.getAttribute('data-loaded') === '1') resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.setAttribute('data-izc-json', src);
      script.onload = function () {
        script.setAttribute('data-loaded', '1');
        resolve();
      };
      script.onerror = function () {
        reject(new Error('No se pudo cargar ' + src));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Carga JSON tanto en http(s)/localhost como al abrir HTML con doble clic (file://).
   * En file:// usa el archivo .data.js gemelo (generado desde el .json).
   */
  function loadJson(path, options) {
    options = options || {};
    var cacheMode = options.cache || 'no-store';

    if (location.protocol === 'file:') {
      var scriptPath = dataScriptPath(path);
      if (Object.prototype.hasOwnProperty.call(window.__IZC_DATA__, path)) {
        return Promise.resolve(window.__IZC_DATA__[path]);
      }
      return loadScript(scriptPath).then(function () {
        if (!Object.prototype.hasOwnProperty.call(window.__IZC_DATA__, path)) {
          throw new Error('Sin datos para ' + path);
        }
        return window.__IZC_DATA__[path];
      });
    }

    return fetch(path, { cache: cacheMode }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + path);
      return response.json();
    });
  }

  window.IZCData = {
    loadJson: loadJson,
    dataScriptPath: dataScriptPath
  };
})();

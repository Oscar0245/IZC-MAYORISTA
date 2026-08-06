/* Cotizador: líneas por SKU con USD / COP / IVA y nombre de producto */
(function () {
  'use strict';

  var IVA = 0.19;
  var STORAGE_PREFIX = 'izc_cotizador_items_';
  var TRM_PREFIX = 'izc_cotizador_trm_';
  var DEFAULT_TRM = 3204;
  var PRECIOS_PATH = 'assets/files/precios.json';
  var PRODUCTOS_PATH = 'assets/files/productos.json';

  var priceMap = null;
  var productMap = null;
  var items = [];
  var previewTimer = null;
  var messageTimer = null;

  function isLoggedIn() {
    return !!(window.IZCAuth && IZCAuth.isLoggedIn && IZCAuth.isLoggedIn());
  }

  function getUserNit() {
    if (window.IZCAuth && IZCAuth.getSessionNit) {
      return String(IZCAuth.getSessionNit() || '').replace(/[\s.]/g, '').trim();
    }
    return '';
  }

  function itemsStorageKey() {
    var nit = getUserNit();
    return nit ? STORAGE_PREFIX + nit : '';
  }

  function trmStorageKey() {
    var nit = getUserNit();
    return nit ? TRM_PREFIX + nit : '';
  }

  function setMessage(text, type) {
    var el = document.getElementById('cotizadorMessage');
    if (!el) return;
    window.clearTimeout(messageTimer);
    messageTimer = null;
    el.textContent = text || '';
    el.className = 'cotizador-message' + (type ? ' is-' + type : '');
    if (text && type === 'ok') {
      messageTimer = window.setTimeout(function () {
        if (el.textContent === text) {
          el.textContent = '';
          el.className = 'cotizador-message';
        }
        messageTimer = null;
      }, 7000);
    }
  }

  function formatUSD(value) {
    return '$ ' + Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatCOP(value) {
    return '$ ' + Math.round(Number(value)).toLocaleString('es-CO') + ' COP';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSku(value) {
    return String(value || '').replace(/[^\d]/g, '').trim();
  }

  function getTrm() {
    var input = document.getElementById('cotizadorTrm');
    var n = input ? Number(input.value) : DEFAULT_TRM;
    if (!isFinite(n) || n <= 0) n = DEFAULT_TRM;
    return n;
  }

  function saveTrm() {
    var key = trmStorageKey();
    if (!key) return;
    try { localStorage.setItem(key, String(getTrm())); } catch (e) { /* ignore */ }
  }

  function loadTrm() {
    var input = document.getElementById('cotizadorTrm');
    if (!input) return;
    var key = trmStorageKey();
    if (!key) {
      input.value = DEFAULT_TRM;
      return;
    }
    try {
      var saved = localStorage.getItem(key);
      if (saved && isFinite(Number(saved)) && Number(saved) > 0) {
        input.value = saved;
      } else {
        input.value = DEFAULT_TRM;
      }
    } catch (e) { /* ignore */ }
  }

  function resolveEntry(entry) {
    if (entry == null) return null;
    if (typeof entry === 'number' && isFinite(entry) && entry > 0) {
      return { amount: entry, currency: 'USD' };
    }
    if (typeof entry === 'object') {
      var amount = entry.amount != null ? entry.amount : entry.v;
      var currency = entry.currency || entry.c || 'USD';
      if (amount != null && isFinite(Number(amount)) && Number(amount) > 0) {
        return { amount: Number(amount), currency: String(currency).toUpperCase() };
      }
    }
    return null;
  }

  function lookupPrice(sku) {
    if (!priceMap || !sku) return null;
    if (Object.prototype.hasOwnProperty.call(priceMap, sku)) {
      return resolveEntry(priceMap[sku]);
    }
    var noZeros = String(sku).replace(/^0+/, '');
    if (noZeros && Object.prototype.hasOwnProperty.call(priceMap, noZeros)) {
      return resolveEntry(priceMap[noZeros]);
    }
    return null;
  }

  function lookupName(sku) {
    if (!productMap || !sku) return null;
    if (Object.prototype.hasOwnProperty.call(productMap, sku)) return productMap[sku];
    var noZeros = String(sku).replace(/^0+/, '');
    if (noZeros && Object.prototype.hasOwnProperty.call(productMap, noZeros)) {
      return productMap[noZeros];
    }
    return null;
  }

  function updateSkuPreview() {
    var input = document.getElementById('cotizadorSku');
    var preview = document.getElementById('cotizadorSkuName');
    if (!input || !preview) return;

    var sku = normalizeSku(input.value);
    if (!sku) {
      preview.textContent = '';
      preview.className = 'cotizador-sku-name is-empty';
      return;
    }

    var nombre = lookupName(sku);
    if (nombre) {
      preview.textContent = nombre;
      preview.className = 'cotizador-sku-name';
      return;
    }

    preview.textContent = 'No se encontró producto con el código ' + sku;
    preview.className = 'cotizador-sku-name is-error';
  }

  /* Como se calcula CRM con precio del producto */
  function unitsFromEntry(entry, trm) {
    if (!entry) return null;
    var usd;
    var cop;
    if (entry.currency === 'COP') {
      cop = entry.amount;
      usd = entry.amount / trm;
    } else {
      usd = entry.amount;
      cop = entry.amount * trm;
    }
    return {
      usd: usd,
      cop: cop,
      usdIva: usd * (1 + IVA),
      copIva: cop * (1 + IVA)
    };
  }

  function readItems() {
    var key = itemsStorageKey();
    if (!key) return [];
    try {
      var raw = localStorage.getItem(key);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeItems(list) {
    var key = itemsStorageKey();
    if (!key) return;
    items = list;
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function reloadUserData() {
    items = readItems();
    loadTrm();
    render();
  }

  function loadJson(path) {
    if (window.IZCData && typeof IZCData.loadJson === 'function') {
      return IZCData.loadJson(path, { cache: 'no-store' });
    }
    return fetch(path + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('sin datos');
      return r.json();
    });
  }

  function loadPrices() {
    if (window.IZCPrices && typeof IZCPrices.load === 'function') {
      return IZCPrices.load().then(function (map) {
        priceMap = map || null;
        return priceMap;
      });
    }
    return loadJson(PRECIOS_PATH).then(function (data) {
      priceMap = data && typeof data === 'object' ? data : null;
      return priceMap;
    }).catch(function () {
      priceMap = null;
      return null;
    });
  }

  function loadProducts() {
    return loadJson(PRODUCTOS_PATH).then(function (data) {
      productMap = data && typeof data === 'object' ? data : {};
      return productMap;
    }).catch(function () {
      productMap = {};
      return productMap;
    });
  }

  function lineCalc(item, trm) {
    var entry = lookupPrice(item.sku);
    var units = unitsFromEntry(entry, trm);
    var nombre = lookupName(item.sku) || '—';
    if (!units) {
      return { ok: false, sku: item.sku, name: nombre, qty: item.qty };
    }
    return {
      ok: true,
      sku: item.sku,
      name: nombre,
      qty: item.qty,
      usd: units.usd,
      cop: units.cop,
      usdIva: units.usdIva,
      copIva: units.copIva,
      totalUsdIva: units.usdIva * item.qty,
      totalCopIva: units.copIva * item.qty,
      totalUsd: units.usd * item.qty,
      totalCop: units.cop * item.qty
    };
  }

  function render() {
    var body = document.getElementById('cotizadorBody');
    if (!body) return;
    var trm = getTrm();
    var rows = items.map(function (item) { return lineCalc(item, trm); });

    if (!rows.length) {
      body.innerHTML = '<tr class="cotizador-empty-row"><td colspan="10">Aún no hay productos en la cotización.</td></tr>';
    } else {
      body.innerHTML = rows.map(function (row, idx) {
        if (!row.ok) {
          return (
            '<tr>' +
              '<td>' + escapeHtml(row.sku) + '</td>' +
              '<td>' + escapeHtml(row.name) + '</td>' +
              '<td class="cotizador-qty-cell">' + qtyInputHtml(idx, row.qty) + '</td>' +
              '<td colspan="6">Sin precio en lista</td>' +
              '<td><button type="button" class="cotizador-remove" data-idx="' + idx + '">Quitar</button></td>' +
            '</tr>'
          );
        }
        return (
          '<tr>' +
            '<td>' + escapeHtml(row.sku) + '</td>' +
            '<td>' + escapeHtml(row.name) + '</td>' +
            '<td class="cotizador-qty-cell">' + qtyInputHtml(idx, row.qty) + '</td>' +
            '<td>' + formatUSD(row.usd) + '</td>' +
            '<td>' + formatCOP(row.cop) + '</td>' +
            '<td>' + formatUSD(row.totalUsd) + '</td>' +
            '<td>' + formatCOP(row.totalCop) + '</td>' +
            '<td>' + formatUSD(row.totalUsdIva) + '</td>' +
            '<td>' + formatCOP(row.totalCopIva) + '</td>' +
            '<td><button type="button" class="cotizador-remove" data-idx="' + idx + '">Quitar</button></td>' +
          '</tr>'
        );
      }).join('');
    }

    var qty = 0;
    var totalUsd = 0;
    var totalCop = 0;
    var totalUsdIva = 0;
    var totalCopIva = 0;
    rows.forEach(function (row) {
      if (!row.ok) return;
      qty += row.qty;
      totalUsd += row.totalUsd;
      totalCop += row.totalCop;
      totalUsdIva += row.totalUsdIva;
      totalCopIva += row.totalCopIva;
    });

    var elQty = document.getElementById('totalQty');
    var elUsd = document.getElementById('totalUsd');
    var elCop = document.getElementById('totalCop');
    var elUsdIva = document.getElementById('totalUsdIva');
    var elCopIva = document.getElementById('totalCopIva');
    if (elQty) elQty.textContent = String(qty);
    if (elUsd) elUsd.textContent = formatUSD(totalUsd);
    if (elCop) elCop.textContent = formatCOP(totalCop);
    if (elUsdIva) elUsdIva.textContent = formatUSD(totalUsdIva);
    if (elCopIva) elCopIva.textContent = formatCOP(totalCopIva);
  }

  function addItem(sku, qty) {
    sku = normalizeSku(sku);
    qty = Math.max(1, Math.floor(Number(qty) || 1));
    if (!sku) {
      setMessage('Ingresa un código de producto.', 'error');
      return;
    }
    if (!lookupPrice(sku)) {
      setMessage('No hay precio para el código ' + sku + '.', 'error');
      return;
    }
    
    var list = items.slice();
    var found = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].sku === sku) { found = i; break; }
    }
    if (found >= 0) {
      list[found].qty += qty;
    } else {
      list.push({ sku: sku, qty: qty });
    }
    writeItems(list);

    var nombre = lookupName(sku);
    setMessage(
      nombre ? 'Producto agregado: ' + nombre : 'Producto ' + sku + ' agregado.',
      'ok'
    );
    render();
  }
  
  function removeItem(idx) {
    var list = items.slice();
    if (idx < 0 || idx >= list.length) return;
    list.splice(idx, 1);
    writeItems(list);
    setMessage('Producto quitado.', 'ok');
    render();
  }
  
  function updateItemQty(idx, qty) {
    qty = Math.max(1, Math.floor(Number(qty) || 1));
    var list = items.slice();
    if (idx < 0 || idx >= list.length) return;
    if (list[idx].qty === qty) return;
    list[idx].qty = qty;
    writeItems(list);
    render();
  }
  
  function qtyInputHtml(idx, qty) {
    return (
      '<input type="number" class="cotizador-qty-input" data-idx="' + idx + '" ' +
      'min="1" step="1" value="' + qty + '" aria-label="Cantidad">'
    );
  }
  
  function applyGate() {
    var gate = document.getElementById('cotizadorGate');
    var panel = document.getElementById('cotizadorPanel');
    var logged = isLoggedIn();
    if (gate) gate.hidden = logged;
    if (panel) panel.hidden = !logged;
    return logged;
  }
  
  function bind() {
    var form = document.getElementById('cotizadorAddForm');
    var skuInput = document.getElementById('cotizadorSku');
    var trmInput = document.getElementById('cotizadorTrm');
    var clearBtn = document.getElementById('cotizadorClear');
    var body = document.getElementById('cotizadorBody');
    
    if (skuInput) {
      skuInput.addEventListener('input', function () {
        window.clearTimeout(previewTimer);
        previewTimer = window.setTimeout(updateSkuPreview, 150);
      });
    }
    
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!isLoggedIn()) {
          window.location.href = 'login.html';
          return;
        }
        var sku = document.getElementById('cotizadorSku');
        var qty = document.getElementById('cotizadorQty');
        addItem(sku ? sku.value : '', qty ? qty.value : 1);
        if (sku) sku.value = '';
        if (qty) qty.value = '1';
        updateSkuPreview();
        if (sku) sku.focus();
      });
    }
    
    if (trmInput) {
      trmInput.addEventListener('change', function () {
        saveTrm();
        render();
      });
      trmInput.addEventListener('input', function () {
        render();
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!items.length) return;
        writeItems([]);
        setMessage('Cotización vacía.', 'ok');
        render();
      });
    }
    
    var removeModal = document.getElementById('cotizadorRemoveModal');
    var removeModalText = document.getElementById('cotizadorRemoveText');
    var removeConfirmBtn = document.getElementById('cotizadorRemoveConfirm');
    var pendingRemoveIdx = -1;
    
    function closeRemoveModal() {
      if (removeModal) removeModal.hidden = true;
      pendingRemoveIdx = -1;
    }
    
    function openRemoveModal(idx) {
      pendingRemoveIdx = idx;
      var item = items[idx];
      var name = item ? (lookupName(item.sku) || item.sku) : '';
      if (removeModalText) {
        removeModalText.textContent = name
          ? '¿Quieres quitar "' + name + '" de la cotización?'
          : '¿Quieres quitar este producto de la cotización?';
      }
      if (removeModal) removeModal.hidden = false;
      if (removeConfirmBtn) removeConfirmBtn.focus();
    }
    
    if (removeModal) {
      removeModal.addEventListener('click', function (e) {
        if (e.target.closest('[data-modal-close]')) closeRemoveModal();
      });
    }
    
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && removeModal && !removeModal.hidden) closeRemoveModal();
    });

    if (removeConfirmBtn) {
      removeConfirmBtn.addEventListener('click', function () {
        var idx = pendingRemoveIdx;
        closeRemoveModal();
        if (idx >= 0) removeItem(idx);
      });
    }

    if (body) {
      body.addEventListener('click', function (e) {
        var btn = e.target.closest('.cotizador-remove');
        if (!btn) return;
        openRemoveModal(Number(btn.getAttribute('data-idx')));
      });

      body.addEventListener('change', function (e) {
        var input = e.target.closest('.cotizador-qty-input');
        if (!input) return;
        updateItemQty(Number(input.getAttribute('data-idx')), input.value);
      });

      body.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var input = e.target.closest('.cotizador-qty-input');
        if (!input) return;
        e.preventDefault();
        input.blur();
      });
    }

    document.addEventListener('izc:auth-changed', function () {
      if (!applyGate()) {
        items = [];
        render();
        return;
      }
      reloadUserData();
      Promise.all([loadPrices(), loadProducts()]).then(function () {
        updateSkuPreview();
        render();
      });
    });
  }

  function init() {
    bind();
    var productsPromise = loadProducts();
    if (!applyGate()) return;
    reloadUserData();
    Promise.all([loadPrices(), productsPromise]).then(function () {
      updateSkuPreview();
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

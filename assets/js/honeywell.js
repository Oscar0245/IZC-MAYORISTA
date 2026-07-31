/* Interacciones UI de la página Honeywell. */
document.addEventListener('DOMContentLoaded', function () {

  // 1. Colapsables del Filtro Lateral
  const filterHeaders = document.querySelectorAll('.filter-header');

  filterHeaders.forEach(header => {
    header.addEventListener('click', function () {
      const list = this.nextElementSibling;
      const arrow = this.querySelector('.arrow');
      
      if (!list) return;

      if (list.style.display === 'none') {
        list.style.display = 'block';
        if (arrow) arrow.textContent = '▲';
      } else {
        list.style.display = 'none';
        if (arrow) arrow.textContent = '▼';
      }
    });
  });

  // 3. Carrusel de Marcas Destacadas
  const track = document.getElementById('brandsTrack');
  const prevBtn = document.getElementById('prevBrand');
  const nextBtn = document.getElementById('nextBrand');

  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const columns = track.querySelectorAll('.brand-column');
    const maxSlide = Math.max(0, columns.length - 2);
    const wrapper = track.parentElement || track;
    let isDragging = false;
    let hasDragged = false;
    let startX = 0;
    let baseX = 0;
    let currentX = 0;
    let pointerId = null;

    function stepWidth() {
      var col = columns[0];
      return col ? col.getBoundingClientRect().width : 0;
    }

    function updateCarousel() {
      var step = stepWidth();
      baseX = -(currentSlide * step);
      currentX = baseX;
      track.style.transition = 'transform 0.4s ease-in-out';
      track.style.transform = 'translateX(' + baseX + 'px)';
    }

    function goNext() {
      currentSlide = currentSlide < maxSlide ? currentSlide + 1 : 0;
      updateCarousel();
    }

    function goPrev() {
      currentSlide = currentSlide > 0 ? currentSlide - 1 : maxSlide;
      updateCarousel();
    }

    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);
    window.addEventListener('resize', updateCarousel);

    track.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
        }
        hasDragged = false;
      });
    });

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      baseX = -(currentSlide * stepWidth());
      currentX = baseX;
      pointerId = e.pointerId;
      track.style.transition = 'none';
      try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onPointerMove(e) {
      if (!isDragging || (pointerId != null && e.pointerId !== pointerId)) return;
      var diff = e.clientX - startX;
      if (Math.abs(diff) > 12) hasDragged = true;
      currentX = baseX + diff;
      track.style.transform = 'translateX(' + currentX + 'px)';
    }

    function onPointerUp(e) {
      if (!isDragging || (pointerId != null && e.pointerId !== pointerId)) return;
      isDragging = false;
      pointerId = null;
      var movedBy = currentX - baseX;
      if (movedBy < -40) {
        goNext();
      } else if (movedBy > 40) {
        goPrev();
      } else {
        updateCarousel();
      }
    }

    wrapper.style.touchAction = 'pan-y';
    wrapper.style.cursor = 'grab';
    wrapper.addEventListener('pointerdown', onPointerDown);
    wrapper.addEventListener('pointermove', onPointerMove);
    wrapper.addEventListener('pointerup', onPointerUp);
    wrapper.addEventListener('pointercancel', onPointerUp);
    wrapper.addEventListener('pointerleave', function (e) {
      if (isDragging) onPointerUp(e);
    });
  }

  // Wishlist: manejado por wishlist.js

  // 5. Menú Flyout (Categorías y Paneles)
  const flyouts = document.querySelectorAll('.flyout');

  flyouts.forEach(function (flyout) {
    const cats = flyout.querySelectorAll('.flyout-cat');
    const panels = flyout.querySelectorAll('.flyout-panel-content');

    function activatePanel(panelId) {
      cats.forEach(function (c) {
        if (c.dataset.panel === panelId) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });

      panels.forEach(function (p) {
        if (p.dataset.panel === panelId) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    cats.forEach(function (cat) {
      cat.addEventListener('mouseenter', function () {
        activatePanel(this.dataset.panel);
      });

      cat.addEventListener('click', function (e) {
        e.preventDefault();
        activatePanel(this.dataset.panel);
      });
    });
  });

  // ==========================================
  // 6. FILTRADO DINÁMICO DE CATEGORÍAS HONEYWELL
  // ==========================================
  const catFilterBtns = document.querySelectorAll('.cat-filter-btn');
  const sortSelect = document.getElementById('sortSelect');
  const productCards = document.querySelectorAll('#productGrid .product-card');
  const itemCountDisplay = document.getElementById('itemCountDisplay');
  const noProductsMsg = document.getElementById('noProductsMessage');

  function filtrarCategorias(categoria) {
    let visibles = 0;

    productCards.forEach(card => {
      const catTarjeta = card.getAttribute('data-category');

      if (categoria === 'all' || catTarjeta === categoria) {
        card.style.display = 'flex';
        visibles++;
      } else {
        card.style.display = 'none';
      }
    });

    if (itemCountDisplay) {
      itemCountDisplay.textContent = `${visibles} artículos`;
    }

    if (noProductsMsg) {
      noProductsMsg.style.display = visibles === 0 ? 'block' : 'none';
    }

    if (sortSelect && sortSelect.value !== categoria) {
      sortSelect.value = categoria;
    }

    catFilterBtns.forEach(btn => {
      if (btn.getAttribute('data-category') === categoria) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  catFilterBtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const cat = this.getAttribute('data-category');
      filtrarCategorias(cat);
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      filtrarCategorias(this.value);
    });
  }

  // Precios USD: intenta precios.php (XAMPP); si no es JSON valido usa precios.json (GitHub Pages)
  async function cargarPreciosUSD() {
    try {
      let mapaPrecios = null;

      // 1) precios.json (http o file:// via IZCData)
      try {
        if (window.IZCData && typeof window.IZCData.loadJson === 'function') {
          const data = await window.IZCData.loadJson('assets/files/precios.json', { cache: 'no-store' });
          if (data && !data.error) mapaPrecios = data;
        } else {
          const jsonRes = await fetch('assets/files/precios.json', { cache: 'no-store' });
          if (jsonRes.ok) {
            const data = await jsonRes.json();
            if (data && !data.error) mapaPrecios = data;
          }
        }
      } catch (_) {}

      // 2) precios.php solo con servidor (XAMPP); no en file://
      if (!mapaPrecios && location.protocol !== 'file:') {
        try {
          const phpRes = await fetch('assets/files/precios.php', { cache: 'no-store' });
          if (phpRes.ok) {
            const text = await phpRes.text();
            if (text.trim().startsWith('{')) {
              const data = JSON.parse(text);
              if (data && !data.error) mapaPrecios = data;
            }
          }
        } catch (_) {}
      }

      if (!mapaPrecios) return;

      if (window.IZCPrices && typeof window.IZCPrices.apply === 'function') {
        window.IZCPrices.apply();
        return;
      }

      function formatEntry(entry) {
        if (entry == null) return null;
        if (typeof entry === 'object' && entry.currency === 'COP') {
          return '$ ' + Math.round(Number(entry.amount)).toLocaleString('es-CO') + ' COP';
        }
        var amount = typeof entry === 'object' ? entry.amount : entry;
        if (amount == null) return null;
        return '$ ' + Number(amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }

      document.querySelectorAll('.product-card, .product-carddatalogic').forEach(tarjeta => {
        const skuElem = tarjeta.querySelector('.sku');
        const priceElem = tarjeta.querySelector('.price');
        if (!skuElem || !priceElem) return;

        const skuTexto = skuElem.textContent.replace(/\D/g, '').trim();
        if (!skuTexto) return;

        let entry = mapaPrecios[skuTexto];
        if (entry == null) {
          const skuSinCeros = skuTexto.replace(/^0+/, '');
          entry = mapaPrecios[skuSinCeros];
        }

        const text = formatEntry(entry);
        if (text) priceElem.textContent = text;
      });
    } catch (error) {
      console.error('Error al actualizar precios:', error);
    }
  }

  cargarPreciosUSD();

});
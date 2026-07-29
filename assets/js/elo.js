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

  // 2. Carrusel de Marcas Destacadas
  const track = document.getElementById('brandsTrack');
  const prevBtn = document.getElementById('prevBrand');
  const nextBtn = document.getElementById('nextBrand');

  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.brand-slide');
    const totalSlides = slides.length;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    nextBtn.addEventListener('click', function () {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
      } else {
        currentSlide = 0;
      }
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      if (currentSlide > 0) {
        currentSlide--;
      } else {
        currentSlide = totalSlides - 1;
      }
      updateCarousel();
    });
  }

  // 3. Selección de Favoritos (Wishlist)
  const wishlistBtns = document.querySelectorAll('.wishlist-btn');

  wishlistBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      if (this.textContent.trim() === '♡') {
        this.textContent = '♥';
        this.style.color = '#e60000';
      } else {
        this.textContent = '♡';
        this.style.color = '#888';
      }
    });
  });

  // 4. Filtrado Dinámico por Categorías y Búsqueda URL
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

  // Precios USD: precios.php regenera desde Excel (A=SKU, BM=USD) si cambió
  async function cargarPreciosUSD() {
    try {
      let response = await fetch('assets/files/precios.php', { cache: 'no-store' });
      if (!response.ok) {
        response = await fetch('assets/files/precios.json', { cache: 'no-store' });
      }
      if (!response.ok) return;

      const mapaPrecios = await response.json();
      if (!mapaPrecios || mapaPrecios.error) return;

      document.querySelectorAll('.product-card, .product-carddatalogic').forEach(tarjeta => {
        const skuElem = tarjeta.querySelector('.sku');
        const priceElem = tarjeta.querySelector('.price');
        if (!skuElem || !priceElem) return;

        const skuTexto = skuElem.textContent.replace(/\D/g, '').trim();
        if (!skuTexto) return;

        let precioUSD = mapaPrecios[skuTexto];
        if (precioUSD == null) {
          const skuSinCeros = skuTexto.replace(/^0+/, '');
          precioUSD = mapaPrecios[skuSinCeros];
        }

        if (precioUSD != null) {
          priceElem.textContent = `$ ${Number(precioUSD).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`;
        }
      });
    } catch (error) {
      console.error('Error al actualizar precios:', error);
    }
  }

  cargarPreciosUSD();

});
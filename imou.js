document.addEventListener('DOMContentLoaded', function () {

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
      currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
      updateCarousel();
    });

    prevBtn.addEventListener('click', function () {
      currentSlide = currentSlide > 0 ? currentSlide - 1 : totalSlides - 1;
      updateCarousel();
    });
  }

  document.querySelectorAll('.wishlist-btn').forEach(btn => {
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

  document.querySelectorAll('.flyout').forEach(function (flyout) {
    const cats = flyout.querySelectorAll('.flyout-cat');
    const panels = flyout.querySelectorAll('.flyout-panel-content');

    function activatePanel(panelId) {
      cats.forEach(function (c) {
        c.classList.toggle('active', c.dataset.panel === panelId);
      });

      panels.forEach(function (p) {
        p.classList.toggle('active', p.dataset.panel === panelId);
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

  const pageBtns = document.querySelectorAll('.page-btn[data-page]');
  const prevPageBtn = document.querySelector('.prev-page');
  const nextPageBtn = document.querySelector('.next-page');
  const perPageSelect = document.getElementById('perPageSelect');
  const productCards = document.querySelectorAll('#productGrid .product-card');
  const itemCountDisplay = document.getElementById('itemCountDisplay');
  const catFilterBtns = document.querySelectorAll('.cat-filter-btn');
  const sortSelect = document.getElementById('sortSelect');
  const noProductsMsg = document.getElementById('noProductsMessage');

  const TOTAL_PAGES = 2;

  let currentActivePage = 1;
  let currentCategory = 'all';
  let itemsPerPage = 32;

  function getCardsForCategory(categoria) {
    return Array.from(productCards).filter(card => {
      const cardCat = card.getAttribute('data-category');
      return categoria === 'all' || cardCat === categoria;
    });
  }

  function updatePaginationButtons() {
    pageBtns.forEach(btn => {
      const pageNum = parseInt(btn.getAttribute('data-page'), 10);
      btn.classList.toggle('active', pageNum === currentActivePage);
    });

    if (prevPageBtn) {
      prevPageBtn.disabled = currentActivePage === 1;
    }

    if (nextPageBtn) {
      nextPageBtn.disabled = currentActivePage === TOTAL_PAGES;
    }
  }

  function cambiarPagina(pagina) {
    currentActivePage = pagina;
    const cards = getCardsForCategory(currentCategory);
    let visibles = 0;

    if (currentCategory === 'memorias') {
      productCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (cardCat === 'memorias') {
          card.style.display = 'flex';
          visibles++;
        } else {
          card.style.display = 'none';
        }
      });
      currentActivePage = 2;
    } else if (currentCategory !== 'all') {
      productCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (cardCat === currentCategory) {
          card.style.display = 'flex';
          visibles++;
        } else {
          card.style.display = 'none';
        }
      });
      currentActivePage = 1;
    } else if (itemsPerPage >= 34) {
      cards.forEach(card => {
        card.style.display = 'flex';
        visibles++;
      });
      currentActivePage = 1;
    } else {
      productCards.forEach(card => {
        const cardPage = parseInt(card.getAttribute('data-page'), 10);
        const cardCat = card.getAttribute('data-category');
        const matchCategory = currentCategory === 'all' || cardCat === currentCategory;
        const matchPage = cardPage === pagina;

        if (matchCategory && matchPage) {
          card.style.display = 'flex';
          visibles++;
        } else {
          card.style.display = 'none';
        }
      });
    }

    if (itemCountDisplay) {
      if (currentCategory === 'all' && itemsPerPage < 34) {
        itemCountDisplay.textContent = `${visibles} artículos`;
      } else {
        itemCountDisplay.textContent = `${cards.length} artículos`;
      }
    }

    if (noProductsMsg) {
      noProductsMsg.style.display = visibles === 0 ? 'block' : 'none';
    }

    updatePaginationButtons();
  }

  pageBtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      currentCategory = 'all';

      catFilterBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-category') === 'all');
      });

      if (sortSelect) {
        sortSelect.value = 'all';
      }

      cambiarPagina(parseInt(this.getAttribute('data-page'), 10));
    });
  });

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function () {
      if (currentActivePage > 1) {
        currentCategory = 'all';
        if (sortSelect) sortSelect.value = 'all';
        catFilterBtns.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-category') === 'all');
        });
        cambiarPagina(currentActivePage - 1);
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function () {
      if (currentActivePage < TOTAL_PAGES) {
        currentCategory = 'all';
        if (sortSelect) sortSelect.value = 'all';
        catFilterBtns.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-category') === 'all');
        });
        cambiarPagina(currentActivePage + 1);
      }
    });
  }

  function filtrarCategorias(categoria) {
    currentCategory = categoria;

    catFilterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === categoria);
    });

    if (sortSelect && sortSelect.value !== categoria) {
      sortSelect.value = categoria;
    }

    if (categoria === 'memorias') {
      itemsPerPage = 32;
      if (perPageSelect) perPageSelect.value = '32';
      cambiarPagina(2);
      return;
    }

    cambiarPagina(1);
  }

  catFilterBtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      filtrarCategorias(this.getAttribute('data-category'));
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      filtrarCategorias(this.value);
    });
  }

  if (perPageSelect) {
    perPageSelect.addEventListener('change', function () {
      itemsPerPage = parseInt(this.value, 10);

      if (itemsPerPage >= 34) {
        currentCategory = 'all';
        catFilterBtns.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-category') === 'all');
        });
        if (sortSelect) sortSelect.value = 'all';
      }

      cambiarPagina(itemsPerPage >= 34 ? 1 : currentActivePage);
    });
  }

  cambiarPagina(1);

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

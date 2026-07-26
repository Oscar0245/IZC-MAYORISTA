document.addEventListener('DOMContentLoaded', function () {

  // ==========================================
  // 1. REDIRECCIÓN DEL BUSCADOR
  // ==========================================
  var searchForm = document.getElementById('searchForm');
  var searchInput = document.getElementById('searchInput');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', function (e) {
      var query = searchInput.value.trim();
      if (!query) {
        e.preventDefault();
      }
    });
  }

  // ==========================================
  // 2. MENÚ FLYOUT
  // ==========================================
  var flyouts = document.querySelectorAll('.flyout');

  flyouts.forEach(function (flyout) {
    var cats = flyout.querySelectorAll('.flyout-cat');
    var panels = flyout.querySelectorAll('.flyout-panel-content');

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
  // 3. CARRUSEL DE MARCAS (Táctil + Arrastre + Flechas)
  // ==========================================
  const track = document.getElementById('brandsTrack');
  const prevBtn = document.getElementById('prevBrandBtn');
  const nextBtn = document.getElementById('nextBrandBtn');
  const cards = document.querySelectorAll('.brand-card');

  if (!track || cards.length === 0) return;

  let currentIndex = 0;
  let isDragging = false;
  let startPos = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let animationID = 0;
  let hasDragged = false;

  function getCardStepWidth() {
    return cards[0].offsetWidth + 15; // Ancho + gap (15px)
  }

  function getVisibleCards() {
    const containerWidth = track.parentElement.offsetWidth;
    return Math.round(containerWidth / getCardStepWidth()) || 1;
  }

  function getMaxIndex() {
    return Math.max(0, cards.length - getVisibleCards());
  }

  function updateCarousel() {
    const maxIndex = getMaxIndex();
    if (currentIndex > maxIndex) currentIndex = maxIndex;
    if (currentIndex < 0) currentIndex = 0;

    currentTranslate = -(currentIndex * getCardStepWidth());
    prevTranslate = currentTranslate;

    track.style.transition = 'transform 0.4s ease-out';
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  // Controles por botones
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentIndex < getMaxIndex()) {
        currentIndex++;
      } else {
        currentIndex = 0;
      }
      updateCarousel();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentIndex > 0) {
        currentIndex--;
      } else {
        currentIndex = getMaxIndex();
      }
      updateCarousel();
    });
  }

  // Previene clics accidentales si el usuario arrastra las tarjetas
  const brandLinks = track.querySelectorAll('a');
  brandLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      if (hasDragged) {
        e.preventDefault();
      }
    });
  });

  // Eventos táctiles y de ratón
  cards.forEach((card) => {
    card.addEventListener('touchstart', touchStart, { passive: true });
    card.addEventListener('touchend', touchEnd);
    card.addEventListener('touchmove', touchMove, { passive: true });

    card.addEventListener('mousedown', touchStart);
    card.addEventListener('mouseup', touchEnd);
    card.addEventListener('mouseleave', touchEnd);
    card.addEventListener('mousemove', touchMove);
  });

  function touchStart(event) {
    isDragging = true;
    hasDragged = false;
    startPos = getPositionX(event);
    track.style.transition = 'none';
    animationID = requestAnimationFrame(animation);
  }

  function touchMove(event) {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    const diff = currentPosition - startPos;
    
    if (Math.abs(diff) > 5) {
      hasDragged = true;
    }
    
    currentTranslate = prevTranslate + diff;
  }

  function touchEnd() {
    if (!isDragging) return;
    isDragging = false;
    cancelAnimationFrame(animationID);

    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -50 && currentIndex < getMaxIndex()) {
      currentIndex += 1;
    } else if (movedBy > 50 && currentIndex > 0) {
      currentIndex -= 1;
    }

    updateCarousel();
  }

  function getPositionX(event) {
    return event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
  }

  function animation() {
    setSliderPosition();
    if (isDragging) requestAnimationFrame(animation);
  }

  function setSliderPosition() {
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  window.addEventListener('resize', updateCarousel);
});
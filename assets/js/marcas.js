document.addEventListener('DOMContentLoaded', function () {

  // ==========================================
  // 1. SELECTOR DE CATEGORÍAS (Buscador)
  // ==========================================
  const catBtn = document.getElementById('catSelectBtn');
  const catSelect = document.querySelector('.cat-select');
  const catLabel = document.getElementById('catSelectLabel');
  const catLinks = document.querySelectorAll('.cat-link');

  if (catBtn && catSelect) {
    catBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      catSelect.classList.toggle('open');
    });

    catLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        catLabel.textContent = this.textContent;
        catSelect.classList.remove('open');
      });
    });

    document.addEventListener('click', function () {
      catSelect.classList.remove('open');
    });
  }

  // ==========================================
  // 2. MENÚ FLYOUT
  // ==========================================
  const flyoutCats = document.querySelectorAll('.flyout-cat');
  const flyoutPanels = document.querySelectorAll('.flyout-panel-content');

  flyoutCats.forEach(function (cat) {
    cat.addEventListener('mouseenter', function () {
      const targetPanel = this.getAttribute('data-panel');

      flyoutCats.forEach(function (c) { c.classList.remove('active'); });
      flyoutPanels.forEach(function (p) { p.classList.remove('active'); });

      this.classList.add('active');
      const activePanel = document.querySelector('.flyout-panel-content[data-panel="' + targetPanel + '"]');
      if (activePanel) {
        activePanel.classList.add('active');
      }
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

  // Evita que los enlaces funcionen al arrastrar en táctil o mouse
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
    track.style.transition = 'none'; // Quita la transición para seguir el dedo instantáneamente
    animationID = requestAnimationFrame(animation);
  }

  function touchMove(event) {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    const diff = currentPosition - startPos;
    
    // Marcar como arrastrado si el movimiento supera los 5px
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

    // Si se desplazó más de 50px se cambia de tarjeta
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

  // Redimensionamiento dinámico
  window.addEventListener('resize', updateCarousel);
});
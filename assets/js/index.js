document.addEventListener('DOMContentLoaded', function () {

  // Menu desplegable del filtro de categorías en el buscador
  var catSelect = document.querySelector('.cat-select');
  if (catSelect) {
    var catBtn = document.getElementById('catSelectBtn');
    var catLabel = document.getElementById('catSelectLabel');
    var catPanel = document.getElementById('catSelectPanel');

    if (catBtn) {
      catBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        catSelect.classList.toggle('open');
      });
    }

    document.addEventListener('click', function (e) {
      if (!catSelect.contains(e.target)) {
        catSelect.classList.remove('open');
      }
    });

    if (catPanel && catLabel) {
      catPanel.querySelectorAll('.cat-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          catLabel.textContent = link.textContent.trim();
          catSelect.classList.remove('open');
        });
      });
    }
  }

  // Comportamiento del menú Flyout de "Nuestros Productos"
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

});
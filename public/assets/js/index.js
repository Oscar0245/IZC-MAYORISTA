document.addEventListener('DOMContentLoaded', function () {

  // Menu desplegable del filtro de categorías en el buscador
  var catSelect = document.querySelector('.cat-select');
  if (catSelect) {
    var catBtn = document.getElementById('catSelectBtn');
    var catLabel = document.getElementById('catSelectLabel');
    var catPanel = document.getElementById('catSelectPanel');

    catBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      catSelect.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!catSelect.contains(e.target)) {
        catSelect.classList.remove('open');
      }
    });

    catPanel.querySelectorAll('.cat-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        catLabel.textContent = link.textContent.trim();
        catSelect.classList.remove('open');
      });
    });
  }

  // Comportamiento del menú Flyout de "Nuestros Productos"
  var flyouts = document.querySelectorAll('.flyout');

  flyouts.forEach(function (flyout) {
    var cats = flyout.querySelectorAll('.flyout-cat');
    var panels = flyout.querySelectorAll('.flyout-panel-content');

    cats.forEach(function (cat) {
      cat.addEventListener('mouseenter', function () {
        activatePanel(cat.dataset.panel);
      });
      cat.addEventListener('click', function (e) {
        e.preventDefault();
        activatePanel(cat.dataset.panel);
      });
    });

    function activatePanel(panelId) {
      cats.forEach(function (c) {
        c.classList.toggle('active', c.dataset.panel === panelId);
      });
      panels.forEach(function (p) {
        p.classList.toggle('active', p.dataset.panel === panelId);
      });
    }
  });

});
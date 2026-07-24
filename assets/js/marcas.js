// Lógica para alternar el menú desplegable (Flyout)
document.addEventListener('DOMContentLoaded', function () {
  var flyoutCats = document.querySelectorAll('.flyout-cat');
  var flyoutPanels = document.querySelectorAll('.flyout-panel-content');

  flyoutCats.forEach(function (cat) {
    cat.addEventListener('mouseenter', function () {
      var targetPanel = this.getAttribute('data-panel');

      // 1. Quitar estado activo a todas las opciones de la izquierda
      flyoutCats.forEach(function (c) {
        c.classList.remove('active');
      });

      // 2. Ocultar todos los paneles del contenido derecho
      flyoutPanels.forEach(function (p) {
        p.classList.remove('active');
      });

      // 3. Activar el ítem actual y su panel correspondiente
      this.classList.add('active');
      var activePanel = document.querySelector('.flyout-panel-content[data-panel="' + targetPanel + '"]');
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });
});
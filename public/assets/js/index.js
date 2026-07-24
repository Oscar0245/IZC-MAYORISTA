document.addEventListener('DOMContentLoaded', function () {
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

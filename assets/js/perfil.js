/* Lógica de la página Mi perfil */
(function () {
  'use strict';

  function fillProfile() {
    var nit = (window.IZCAuth && IZCAuth.getSessionNit()) || '';
    var nombre = (window.IZCAuth && IZCAuth.getSessionNombre && IZCAuth.getSessionNombre()) || '';
    var input = document.getElementById('profileNit');
    var nombreInput = document.getElementById('profileNombre');
    var msg = document.getElementById('authMessage');
    var greet = document.getElementById('profileGreeting');

    if (!nit) {
      if (msg) {
        msg.className = 'auth-message is-error';
        msg.textContent = 'Debes iniciar sesión para ver tu perfil.';
      }
      if (input) input.value = '';
      if (nombreInput) nombreInput.value = '';
      if (greet) greet.textContent = 'Hola';
      setTimeout(function () {
        window.location.href = 'login.html';
      }, 800);
      return;
    }

    if (input) input.value = nit;
    if (nombreInput) {
      nombreInput.value = nombre || '—';
      nombreInput.readOnly = true;
    }
    if (greet) greet.textContent = 'Hola ' + (nombre || 'cliente');
  }

  function bindLogout() {
    var btn = document.getElementById('profileLogout');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.IZCAuth && IZCAuth.logout) IZCAuth.logout();
      else window.location.href = 'index.html';
    });
  }

  function init() {
    fillProfile();
    bindLogout();
    document.addEventListener('izc:auth-changed', fillProfile);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Sesión NIT/contraseña. Guarda siempre en data/usuarios.json vía servidor local. */
(function () {
  'use strict';

  var SESSION_KEY = 'izc_session_nit';
  var SESSION_NAME_KEY = 'izc_session_nombre';
  var USERS_KEY = 'izc_users';
  var NIT_RE = /^\d{6,15}(-\d)?$/;
  var API = 'http://127.0.0.1:8080/api/auth';
  var USERS_URL = 'http://127.0.0.1:8080/data/usuarios.json';
  var LOCAL_ORIGIN = 'http://127.0.0.1:8080';

  /** Si abrieron el HTML como archivo, saltar al servidor local (único que puede escribir el JSON). */
  function forceLocalServer() {
    if (location.protocol !== 'file:') return false;
    var name = (location.pathname.split('/').pop() || 'index.html');
    location.replace(LOCAL_ORIGIN + '/' + name + location.search + location.hash);
    return true;
  }

  function getSessionNit() {
    try { return localStorage.getItem(SESSION_KEY) || ''; } catch (e) { return ''; }
  }

  function getSessionNombre() {
    try { return localStorage.getItem(SESSION_NAME_KEY) || ''; } catch (e) { return ''; }
  }

  function setSessionNombre(nombre) {
    try {
      if (nombre) localStorage.setItem(SESSION_NAME_KEY, String(nombre));
      else localStorage.removeItem(SESSION_NAME_KEY);
    } catch (e) { /* ignore */ }
  }

  function setSessionNit(nit, nombre) {
    try {
      if (nit) localStorage.setItem(SESSION_KEY, String(nit));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
    if (arguments.length > 1) setSessionNombre(nombre || '');
    else if (!nit) setSessionNombre('');
    renderHeaderAuth();
    applyGuestMode();
    try {
      document.dispatchEvent(new CustomEvent('izc:auth-changed', {
        detail: { nit: nit || '', nombre: getSessionNombre(), loggedIn: !!nit }
      }));
    } catch (e) { /* ignore */ }
  }

  function logout() {
    setSessionNit('', '');
    window.location.href = 'index.html';
  }

  function isLoggedIn() {
    return !!getSessionNit();
  }

  function requireLogin(message) {
    if (isLoggedIn()) return true;
    var text = message || 'Para continuar debes iniciar sesión con tu NIT.';
    var go = window.confirm(text + '\n\n¿Ir a iniciar sesión?');
    if (go) window.location.href = 'login.html';
    return false;
  }

  function ensureProfileButton() {
    if (document.getElementById('headerProfile')) return;
    var heart = document.getElementById('headerWishlist');
    var host = heart && heart.parentNode
      ? heart.parentNode
      : document.querySelector('.main-header-inner');
    if (!host) return;

    var link = document.createElement('a');
    link.href = 'perfil.html';
    link.id = 'headerProfile';
    link.className = 'header-profile';
    link.title = 'Mi perfil';
    link.setAttribute('aria-label', 'Mi perfil');
    link.innerHTML = '<img src="assets/logo/perfil.png" alt="" class="header-profile-img" width="28" height="28">';

    if (heart && heart.parentNode === host) {
      heart.insertAdjacentElement('afterend', link);
    } else {
      host.appendChild(link);
    }
  }

  function applyGuestMode() {
    var logged = isLoggedIn();
    if (!document.body) return;
    document.body.classList.toggle('is-logged-in', logged);
    document.body.classList.toggle('is-guest', !logged);
    ensureProfileButton();
  }

  function isCommerceAction(el) {
    if (!el || !el.closest) return null;
    return el.closest([
      '.wishlist-btn',
      '#productWishlistBtn',
      '#headerWishlist',
      'a.btn-download',
      'a[href*="lista-precios"]',
      'a[href*="precios.json"]',
      '[data-requires-login]'
    ].join(','));
  }

  function bindGuestGuards() {
    document.addEventListener('click', function (event) {
      if (isLoggedIn()) return;
      var target = isCommerceAction(event.target);
      if (!target) return;

      // Permitir ir a favoritos.html solo para ver el aviso de login (no bloquear navegación a la página)
      if (target.id === 'headerWishlist' || (target.getAttribute && target.getAttribute('href') === 'favoritos.html')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      var msg = 'Para continuar debes iniciar sesión con tu NIT.';
      if ((target.classList && target.classList.contains('wishlist-btn')) || target.id === 'productWishlistBtn') {
        msg = 'Para agregar favoritos debes iniciar sesión con tu NIT.';
      } else if (
        (target.classList && target.classList.contains('btn-download')) ||
        (target.getAttribute && /lista-precios|precios/i.test(String(target.getAttribute('href') || '') + ' ' + String(target.getAttribute('download') || '')))
      ) {
        msg = 'Para descargar la lista de precios debes iniciar sesión con tu NIT.';
      }
      requireLogin(msg);
    }, true);
  }

  function normalizeNit(nit) {
    return String(nit || '').replace(/[\s.]/g, '').trim();
  }

  function readUsersLocal() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function writeUsersLocal(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) { /* ignore */ }
  }

  function findUser(users, nit) {
    var n = normalizeNit(nit);
    for (var i = 0; i < users.length; i++) {
      if (normalizeNit(users[i].nit) === n) return users[i];
    }
    return null;
  }

  function postAuth(payload) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!data || typeof data !== 'object') throw new Error('Respuesta inválida');
        data._http = res.status;
        return data;
      });
    });
  }

  function loadUsersFromFile() {
    return fetch(USERS_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('No se pudo leer usuarios.json');
        return res.json();
      })
      .then(function (list) {
        if (!Array.isArray(list)) throw new Error('usuarios.json inválido');
        writeUsersLocal(list);
        return list;
      });
  }

  function serverDownMessage() {
    return 'No hay servidor local. Cierra esta ventana, ejecuta tools\\ABRIR.bat y vuelve a intentar.';
  }

  function register(nit, password, nombre) {
    nit = normalizeNit(nit);
    password = String(password || '');
    nombre = String(nombre || '').trim();

    if (!nombre || nombre.length < 2) {
      return Promise.resolve({ ok: false, error: 'Ingresa un nombre válido (mínimo 2 caracteres).' });
    }
    if (!nit || !NIT_RE.test(nit)) {
      return Promise.resolve({ ok: false, error: 'NIT inválido. Usa solo números (opcional dígito de verificación).' });
    }
    if (password.length < 4) {
      return Promise.resolve({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    return postAuth({ action: 'register', nit: nit, password: password, nombre: nombre })
      .then(function (data) {
        if (!data.ok) return data;
        // Verificar que quedó en el archivo
        return loadUsersFromFile().then(function (users) {
          if (!findUser(users, nit)) {
            return { ok: false, error: 'No se confirmó el guardado en data\\usuarios.json.' };
          }
          writeUsersLocal(users);
          setSessionNit('', '');
          return { ok: true, nit: nit, nombre: nombre, message: 'Registro exitoso. Ahora inicia sesión.' };
        });
      })
      .catch(function () {
        return { ok: false, error: serverDownMessage() };
      });
  }

  function login(nit, password) {
    nit = normalizeNit(nit);
    password = String(password || '');

    if (!nit || !password) {
      return Promise.resolve({ ok: false, error: 'Ingresa NIT y contraseña.' });
    }

    // El login siempre va por API: compara contra password_hash del JSON
    return postAuth({ action: 'login', nit: nit, password: password })
      .then(function (data) {
        if (data.ok) setSessionNit(data.nit, data.nombre || '');
        return data;
      })
      .catch(function () {
        return { ok: false, error: serverDownMessage() };
      });
  }

  function renderHeaderAuth() {
    var bar = document.querySelector('.top-bar-inner');
    if (!bar) return;
    var slot = document.getElementById('headerAuth');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'headerAuth';
      slot.className = 'header-auth';
      bar.insertBefore(slot, bar.firstChild);
    }
    var nit = getSessionNit();
    if (nit) {
      slot.innerHTML =
        '<span class="header-auth-nit">NIT ' + escapeHtml(nit) + '</span>';
    } else {
      slot.innerHTML =
        '<a class="header-auth-link" href="login.html">Iniciar sesión</a>' +
        '<a class="header-auth-link" href="registro.html">Registrarse</a>';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bindAuthForms() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitAuthForm(loginForm, 'login');
      });
    }
    var regForm = document.getElementById('registroForm');
    if (regForm) {
      regForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitAuthForm(regForm, 'register');
      });
    }
  }

  function submitAuthForm(form, mode) {
    var msg = document.getElementById('authMessage');
    var nitInput = form.querySelector('[name="nit"]');
    var passInput = form.querySelector('[name="password"]');
    var nombreInput = form.querySelector('[name="nombre"]');
    var btn = form.querySelector('button[type="submit"]');
    var nit = nitInput ? nitInput.value.trim() : '';
    var password = passInput ? passInput.value : '';
    var nombre = nombreInput ? nombreInput.value.trim() : '';

    setMessage(msg, '', '');
    if (btn) btn.disabled = true;

    var action = mode === 'register' ? register(nit, password, nombre) : login(nit, password);
    action.then(function (data) {
      if (data.ok) {
        setMessage(msg, data.message || 'Listo.', 'ok');
        setTimeout(function () {
          window.location.href = mode === 'register' ? 'login.html' : 'index.html';
        }, 700);
      } else {
        setMessage(msg, data.error || 'No se pudo completar la operación.', 'error');
      }
    }).catch(function (err) {
      setMessage(msg, 'Ocurrió un error inesperado.', 'error');
      console.error(err);
    }).finally(function () {
      if (btn) btn.disabled = false;
    });
  }

  function setMessage(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-message' + (type ? ' is-' + type : '');
  }

  function showServerBannerIfNeeded() {
    if (location.protocol === 'file:') return;
    if (location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') return;

    fetch(USERS_URL + '?t=' + Date.now(), { cache: 'no-store' }).catch(function () {
      var host = document.querySelector('.auth-card') || document.body;
      if (!host || document.getElementById('izcServerBanner')) return;
      var box = document.createElement('p');
      box.id = 'izcServerBanner';
      box.className = 'auth-message is-error';
      box.textContent = serverDownMessage();
      host.insertBefore(box, host.firstChild);
    });
  }

  window.IZCAuth = {
    getSessionNit: getSessionNit,
    getSessionNombre: getSessionNombre,
    isLoggedIn: isLoggedIn,
    requireLogin: requireLogin,
    login: login,
    register: register,
    logout: logout,
    getUsers: readUsersLocal,
    applyGuestMode: applyGuestMode
  };

  function init() {
    if (forceLocalServer()) return;
    applyGuestMode();
    renderHeaderAuth();
    bindAuthForms();
    bindGuestGuards();
    showServerBannerIfNeeded();
    document.addEventListener('izc:auth-changed', applyGuestMode);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

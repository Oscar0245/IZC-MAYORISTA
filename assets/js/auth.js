/* Sesión NIT/contraseña.
 * - En PC local (127.0.0.1): usa el servidor y data/usuarios.json
 * - En GitHub Pages / celular: usa almacenamiento del navegador (localStorage)
 */
(function () {
  'use strict';

  var SESSION_KEY = 'izc_session_nit';
  var SESSION_NAME_KEY = 'izc_session_nombre';
  var USERS_KEY = 'izc_users';
  var NIT_RE = /^\d{6,15}(-\d)?$/;
  var LOCAL_ORIGIN = 'http://127.0.0.1:8080';
  // NITs con acceso a la página de administrador
  var ADMIN_NITS = ['03166122778'];

  function isDevHost() {
    var h = location.hostname;
    return h === '127.0.0.1' || h === 'localhost';
  }

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

  function isAdmin() {
    var nit = normalizeNit(getSessionNit());
    return !!nit && ADMIN_NITS.indexOf(nit) !== -1;
  }

  function isAdminNit(nit) {
    return ADMIN_NITS.indexOf(normalizeNit(nit)) !== -1;
  }

  function publicUserView(user) {
    return {
      nit: user && user.nit ? String(user.nit) : '',
      nombre: user && user.nombre ? String(user.nombre) : '',
      created_at: user && user.created_at ? String(user.created_at) : ''
    };
  }

  function listUsersForAdmin() {
    if (!isAdmin()) {
      return Promise.resolve({ ok: false, error: 'No autorizado.' });
    }

    function fromLocal() {
      return {
        ok: true,
        users: readUsersLocal().map(publicUserView),
        source: 'navegador'
      };
    }

    if (!isDevHost()) {
      return Promise.resolve(fromLocal());
    }

    return postAuth({ action: 'list', admin_nit: getSessionNit() })
      .then(function (data) {
        if (!data.ok) return fromLocal();
        var users = Array.isArray(data.users) ? data.users.map(publicUserView) : [];
        return { ok: true, users: users, source: 'servidor' };
      })
      .catch(function () {
        return fromLocal();
      });
  }

  function deleteUserForAdmin(nit) {
    nit = normalizeNit(nit);
    if (!isAdmin()) {
      return Promise.resolve({ ok: false, error: 'No autorizado.' });
    }
    if (!nit) {
      return Promise.resolve({ ok: false, error: 'NIT inválido.' });
    }
    if (nit === normalizeNit(getSessionNit())) {
      return Promise.resolve({ ok: false, error: 'No puedes eliminar tu propia cuenta de administrador.' });
    }

    function deleteLocal() {
      var before = readUsersLocal();
      var after = before.filter(function (u) {
        return normalizeNit(u.nit) !== nit;
      });
      if (after.length === before.length) {
        return { ok: false, error: 'Usuario no encontrado.' };
      }
      writeUsersLocal(after);
      return { ok: true, message: 'Usuario eliminado.', source: 'navegador' };
    }

    if (!isDevHost()) {
      return Promise.resolve(deleteLocal());
    }

    return postAuth({ action: 'delete', nit: nit, admin_nit: getSessionNit() })
      .then(function (data) {
        if (data.ok) {
          // Espejo local
          writeUsersLocal(readUsersLocal().filter(function (u) {
            return normalizeNit(u.nit) !== nit;
          }));
          return data;
        }
        return deleteLocal();
      })
      .catch(function () {
        return deleteLocal();
      });
  }

  function requireLogin(message) {
    if (isLoggedIn()) return true;
    var text = message || 'Para continuar debes iniciar sesión con tu NIT.';
    var go = window.confirm(text + '\n\n¿Ir a iniciar sesión?');
    if (go) window.location.href = 'login.html';
    return false;
  }

  function ensureProfileButton() {
    var heart = document.getElementById('headerWishlist');
    var host = heart && heart.parentNode
      ? heart.parentNode
      : document.querySelector('.main-header-inner');
    if (!host) return;

    var link = document.getElementById('headerProfile');
    if (!link) {
      link = document.createElement('a');
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

    // Admin -> admin.html (su perfil); cliente -> perfil.html
    link.href = isAdmin() ? 'admin.html' : 'perfil.html';
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

  // En GitHub Pages: cuenta compartida desde data/usuarios.json (publicado)
  function fetchRemoteUsers() {
    if (isDevHost()) return Promise.resolve([]);
    return fetch('data/usuarios.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) return [];
        return res.json().then(function (list) {
          return Array.isArray(list) ? list : [];
        });
      })
      .catch(function () { return []; });
  }

  function mergeUsers(local, remote) {
    var map = {};
    (remote || []).forEach(function (u) {
      if (u && u.nit) map[normalizeNit(u.nit)] = u;
    });
    (local || []).forEach(function (u) {
      if (u && u.nit) map[normalizeNit(u.nit)] = u;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function cacheUserLocally(user) {
    if (!user || !user.nit) return;
    var users = readUsersLocal().filter(function (u) {
      return normalizeNit(u.nit) !== normalizeNit(user.nit);
    });
    users.push({
      nit: user.nit,
      nombre: user.nombre || '',
      password_hash: user.password_hash || '',
      created_at: user.created_at || new Date().toISOString()
    });
    writeUsersLocal(users);
  }

  function bufferToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function base64ToBuffer(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function hashPassword(password) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.reject(new Error('Este navegador no soporta cifrado de contraseñas.'));
    }
    var iterations = 100000;
    var salt = crypto.getRandomValues(new Uint8Array(16));
    return crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    ).then(function (keyMaterial) {
      return crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
        keyMaterial,
        256
      );
    }).then(function (bits) {
      return 'pbkdf2$' + iterations + '$' + bufferToBase64(salt) + '$' + bufferToBase64(bits);
    });
  }

  function verifyPassword(password, user) {
    var stored = String((user && (user.password_hash || user.password)) || '');
    if (!stored) return Promise.resolve(false);

    if (stored.indexOf('pbkdf2$') !== 0) {
      return Promise.resolve(stored === password);
    }

    if (!window.crypto || !crypto.subtle) {
      return Promise.resolve(false);
    }

    var parts = stored.split('$');
    if (parts.length !== 4) return Promise.resolve(false);
    var iterations = parseInt(parts[1], 10);
    var salt = base64ToBuffer(parts[2]);
    var expected = new Uint8Array(base64ToBuffer(parts[3]));

    return crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    ).then(function (keyMaterial) {
      return crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
        keyMaterial,
        expected.length * 8
      );
    }).then(function (bits) {
      var actual = new Uint8Array(bits);
      if (actual.length !== expected.length) return false;
      var ok = true;
      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) ok = false;
      }
      return ok;
    }).catch(function () {
      return false;
    });
  }

  function apiEndpoints() {
    var list = [];
    if (isDevHost()) {
      list.push(LOCAL_ORIGIN + '/api/auth');
      list.push('api/auth');
    }
    list.push('api/auth.php');
    return list;
  }

  function postAuth(payload) {
    var body = JSON.stringify(payload);
    var endpoints = apiEndpoints();
    var lastErr = null;

    function tryOne(i) {
      if (i >= endpoints.length) {
        return Promise.reject(lastErr || new Error('sin api'));
      }
      return fetch(endpoints[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!data || typeof data !== 'object') throw new Error('Respuesta inválida');
          data._http = res.status;
          return data;
        });
      }).catch(function (err) {
        lastErr = err;
        return tryOne(i + 1);
      });
    }

    return tryOne(0);
  }

  function registerLocal(nit, password, nombre) {
    return fetchRemoteUsers().then(function (remote) {
      var users = mergeUsers(readUsersLocal(), remote);
      if (findUser(users, nit)) {
        return { ok: false, error: 'Este NIT ya está registrado.' };
      }
      return hashPassword(password).then(function (passwordHash) {
        var local = readUsersLocal();
        local.push({
          nit: nit,
          nombre: nombre,
          password_hash: passwordHash,
          created_at: new Date().toISOString()
        });
        writeUsersLocal(local);
        setSessionNit('', '');
        return { ok: true, nit: nit, nombre: nombre, message: 'Registro exitoso. Ahora inicia sesión.' };
      });
    });
  }

  function loginLocal(nit, password) {
    return fetchRemoteUsers().then(function (remote) {
      var user = findUser(mergeUsers(readUsersLocal(), remote), nit);
      if (!user) {
        return { ok: false, error: 'NIT no registrado. Primero crea tu cuenta en Registrarse.' };
      }
      return verifyPassword(password, user).then(function (ok) {
        if (!ok) return { ok: false, error: 'NIT o contraseña incorrectos.' };
        cacheUserLocally(user);
        setSessionNit(user.nit, user.nombre || '');
        return { ok: true, nit: user.nit, nombre: user.nombre || '', message: 'Sesión iniciada.' };
      });
    });
  }

  function validateRegister(nit, password, nombre) {
    if (!nombre || nombre.length < 2) {
      return { ok: false, error: 'Ingresa un nombre válido (mínimo 2 caracteres).' };
    }
    if (!nit || !NIT_RE.test(nit)) {
      return { ok: false, error: 'NIT inválido. Usa solo números (opcional dígito de verificación).' };
    }
    if (password.length < 4) {
      return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }
    return null;
  }

  function register(nit, password, nombre) {
    nit = normalizeNit(nit);
    password = String(password || '');
    nombre = String(nombre || '').trim();

    var invalid = validateRegister(nit, password, nombre);
    if (invalid) return Promise.resolve(invalid);

    // En web pública (GitHub Pages / celular): solo navegador
    if (!isDevHost()) {
      return registerLocal(nit, password, nombre);
    }

    // En local: intenta servidor; si no responde, usa navegador
    return postAuth({ action: 'register', nit: nit, password: password, nombre: nombre })
      .then(function (data) {
        if (!data.ok) return data;
        // Espejo local para poder entrar también sin servidor
        return hashPassword(password).then(function (passwordHash) {
          var users = readUsersLocal().filter(function (u) {
            return normalizeNit(u.nit) !== nit;
          });
          users.push({
            nit: nit,
            nombre: nombre,
            password_hash: passwordHash,
            created_at: new Date().toISOString()
          });
          writeUsersLocal(users);
          setSessionNit('', '');
          return {
            ok: true,
            nit: nit,
            nombre: nombre,
            message: data.message || 'Registro exitoso. Ahora inicia sesión.'
          };
        });
      })
      .catch(function () {
        return registerLocal(nit, password, nombre);
      });
  }

  function login(nit, password) {
    nit = normalizeNit(nit);
    password = String(password || '');

    if (!nit || !password) {
      return Promise.resolve({ ok: false, error: 'Ingresa NIT y contraseña.' });
    }

    if (!isDevHost()) {
      return loginLocal(nit, password);
    }

    return postAuth({ action: 'login', nit: nit, password: password })
      .then(function (data) {
        if (data.ok) setSessionNit(data.nit, data.nombre || '');
        return data;
      })
      .catch(function () {
        return loginLocal(nit, password);
      });
  }

  function renderHeaderAuth() {
    var topBar = document.querySelector('.top-bar-inner');
    var header = document.querySelector('.main-header-inner');
    var nit = getSessionNit();

    // Slot NIT en la barra azul (izquierda)
    var topSlot = document.getElementById('headerAuthNit');
    if (topBar) {
      if (!topSlot) {
        topSlot = document.createElement('div');
        topSlot.id = 'headerAuthNit';
        topSlot.className = 'header-auth-top';
        topBar.insertBefore(topSlot, topBar.firstChild);
      }
      if (nit) {
        topSlot.innerHTML =
          '<span class="header-auth-nit">NIT ' + escapeHtml(nit) + '</span>';
        topSlot.hidden = false;
      } else {
        topSlot.innerHTML = '';
        topSlot.hidden = true;
      }
    }

    // Botones Iniciar sesión / Registrarse junto al buscador (solo sin sesión)
    if (!header) return;
    var slot = document.getElementById('headerAuth');
    if (slot && slot.parentNode !== header) {
      slot.parentNode.removeChild(slot);
      slot = null;
    }
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'headerAuth';
      slot.className = 'header-auth';
      var search = header.querySelector('.search-bar');
      var wishlist = document.getElementById('headerWishlist');
      if (search) {
        search.insertAdjacentElement('afterend', slot);
      } else if (wishlist) {
        wishlist.insertAdjacentElement('beforebegin', slot);
      } else {
        header.appendChild(slot);
      }
    }

    if (nit) {
      slot.innerHTML = '';
      slot.hidden = true;
    } else {
      slot.hidden = false;
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

  function clearAuthForm(form) {
    if (!form) return;
    var fields = form.querySelectorAll('input[name="nit"], input[name="password"], input[name="nombre"]');
    for (var i = 0; i < fields.length; i++) {
      fields[i].value = '';
    }
    var msg = document.getElementById('authMessage');
    setMessage(msg, '', '');
  }

  function bindAuthForms() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
      clearAuthForm(loginForm);
      // El navegador a veces rellena después del load; limpiar otra vez
      setTimeout(function () { clearAuthForm(loginForm); }, 50);
      setTimeout(function () { clearAuthForm(loginForm); }, 300);
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitAuthForm(loginForm, 'login');
      });
    }
    var regForm = document.getElementById('registroForm');
    if (regForm) {
      clearAuthForm(regForm);
      setTimeout(function () { clearAuthForm(regForm); }, 50);
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

  window.IZCAuth = {
    getSessionNit: getSessionNit,
    getSessionNombre: getSessionNombre,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    isAdminNit: isAdminNit,
    requireLogin: requireLogin,
    login: login,
    register: register,
    logout: logout,
    getUsers: readUsersLocal,
    listUsersForAdmin: listUsersForAdmin,
    deleteUserForAdmin: deleteUserForAdmin,
    applyGuestMode: applyGuestMode
  };

  function init() {
    if (forceLocalServer()) return;
    applyGuestMode();
    renderHeaderAuth();
    bindAuthForms();
    bindGuestGuards();
    document.addEventListener('izc:auth-changed', applyGuestMode);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

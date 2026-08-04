/* Perfil del administrador: datos de sesión + panel de clientes */
(function () {
  'use strict';

  function setMessage(elId, text, type) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-message' + (type ? ' is-' + type : '');
  }

  function formatDate(value) {
    if (!value) return '—';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fillProfile() {
    var nit = (window.IZCAuth && IZCAuth.getSessionNit()) || '';
    var nombre = (window.IZCAuth && IZCAuth.getSessionNombre && IZCAuth.getSessionNombre()) || '';
    var input = document.getElementById('profileNit');
    var nombreInput = document.getElementById('profileNombre');
    var greet = document.getElementById('profileGreeting');

    if (!nit) {
      setMessage('authMessage', 'Debes iniciar sesión como administrador.', 'error');
      if (input) input.value = '';
      if (nombreInput) nombreInput.value = '';
      if (greet) greet.textContent = 'Hola';
      setTimeout(function () {
        window.location.href = 'login.html';
      }, 800);
      return false;
    }

    if (!IZCAuth.isAdmin || !IZCAuth.isAdmin()) {
      window.location.replace('perfil.html');
      return false;
    }

    if (input) input.value = nit;
    if (nombreInput) {
      nombreInput.value = nombre || '—';
      nombreInput.readOnly = true;
    }
    if (greet) greet.textContent = 'Hola ' + (nombre || 'admin');
    setMessage('authMessage', '', '');
    return true;
  }

  function renderUsers(users) {
    var body = document.getElementById('adminUsersBody');
    var count = document.getElementById('adminUserCount');
    if (count) count.textContent = String((users && users.length) || 0);
    if (!body) return;

    if (!users || !users.length) {
      body.innerHTML = '<tr><td colspan="4" class="admin-empty">No hay usuarios registrados.</td></tr>';
      return;
    }

    body.innerHTML = users.map(function (u) {
      var nit = u.nit || '';
      var btn = '<button type="button" class="admin-delete" data-nit="' + escapeHtml(nit) + '">Eliminar</button>';
      return (
        '<tr>' +
          '<td>' + escapeHtml(u.nombre || '—') + '</td>' +
          '<td>' + escapeHtml(nit) + '</td>' +
          '<td>' + escapeHtml(formatDate(u.created_at)) + '</td>' +
          '<td class="admin-actions">' + btn + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function loadUsers() {
    if (!window.IZCAuth || !IZCAuth.listUsersForAdmin) return;
    setMessage('adminMessage', 'Cargando…', '');
    IZCAuth.listUsersForAdmin().then(function (data) {
      if (!data.ok) {
        setMessage('adminMessage', data.error || 'No se pudo cargar.', 'error');
        return;
      }
      var sourceEl = document.getElementById('adminSource');
      if (sourceEl) sourceEl.textContent = data.source || '—';
      // No mostrar al admin en la tabla; sí permanece en usuarios.json
      var users = (data.users || []).filter(function (u) {
        return !(IZCAuth.isAdminNit && IZCAuth.isAdminNit(u.nit));
      });
      renderUsers(users);
      setMessage('adminMessage', '', '');
    }).catch(function (err) {
      console.error(err);
      setMessage('adminMessage', 'Error al cargar usuarios.', 'error');
    });
  }

  function bindTable() {
    var body = document.getElementById('adminUsersBody');
    if (!body) return;
    body.addEventListener('click', function (e) {
      var btn = e.target.closest('.admin-delete');
      if (!btn || !window.IZCAuth) return;
      var nit = btn.getAttribute('data-nit') || '';
      if (!nit) return;
      if (!window.confirm('¿Eliminar el cliente NIT ' + nit + '?')) return;

      btn.disabled = true;
      IZCAuth.deleteUserForAdmin(nit).then(function (data) {
        if (!data.ok) {
          setMessage('adminMessage', data.error || 'No se pudo eliminar.', 'error');
          btn.disabled = false;
          return;
        }
        setMessage('adminMessage', data.message || 'Usuario eliminado.', 'ok');
        loadUsers();
      }).catch(function (err) {
        console.error(err);
        setMessage('adminMessage', 'Error al eliminar.', 'error');
        btn.disabled = false;
      });
    });
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
    if (!fillProfile()) return;
    bindLogout();
    bindTable();
    var refresh = document.getElementById('adminRefresh');
    if (refresh) refresh.addEventListener('click', loadUsers);
    loadUsers();
    document.addEventListener('izc:auth-changed', function () {
      if (fillProfile()) loadUsers();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

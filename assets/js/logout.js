// assets/js/logout.js
(function () {
  // pinta el usuario si existe el span
  var u = localStorage.getItem('dw_user');
  var el = document.getElementById('dw-user');
  if (el) el.textContent = u || '';

  // handler logout
  function doLogout(){
    ['dw_auth','dw_user','dw_scope','dw_home'].forEach(k => localStorage.removeItem(k));
    location.href = 'index.html'; // o 'login.html' si prefieres
  }

  // botón estándar
  var btn = document.getElementById('dw-logout');
  if (btn) btn.addEventListener('click', doLogout);

  // expone utilidad global (opcional)
  window.dwLogout = doLogout;
})();

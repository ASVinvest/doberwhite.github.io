<script>
(async function(){
  const form = document.getElementById('dw-login');
  const err  = document.getElementById('err');

  // Ruta al CSV (misma carpeta y cache buster)
  const CSV_PATH = 'assets/data/dashboard/users.csv?v=' + Date.now();

  // Helpers
  const clean = (s) => (s||'')
    .replace(/^\uFEFF/, '')           // BOM
    .replace(/^["']|["']$/g,'')       // comillas borde
    .trim()
    .normalize('NFKC');

  async function loadUsers(){
    const res = await fetch(CSV_PATH, { cache:'no-store' });
    if(!res.ok){ console.warn('No se pudo leer users.csv', res.status); return []; }
    const txt = await res.text();

    const lines = txt.replace(/\r/g,'').split('\n').filter(l => l.trim().length);
    if(!lines.length) return [];

    const header = clean(lines[0]);
    const sep = header.includes(';') ? ';' : ',';

    const cols = header.split(sep).map(c => clean(c).toLowerCase());
    const iEmail = cols.indexOf('email');
    const iPass  = cols.indexOf('password');
    const iAct   = cols.indexOf('active');
    const iScope = cols.indexOf('scope'); // opcional
    const iHome  = cols.indexOf('home');  // opcional

    const users = [];
    for(let i=1;i<lines.length;i++){
      const raw = lines[i];
      if(!raw.trim()) continue;
      const parts = raw.split(sep).map(clean);

      const email = (parts[iEmail] || '').toLowerCase();
      const password = parts[iPass] || '';
      const activeStr = ((iAct>-1?parts[iAct]:'true') || 'true').toLowerCase();
      const active = activeStr === 'true' || activeStr === '1' || activeStr === 'yes';

      const scope = (iScope>-1 && parts[iScope]) ? parts[iScope].toLowerCase() : 'main'; // default
      const home  = (iHome>-1 && parts[iHome])   ? parts[iHome] : (scope==='small' ? 'dashboard_s.html' : 'dashboard.html');

      if(email && password){
        users.push({ email, password, active, scope, home });
      }
    }
    return users;
  }

  let users = [];
  try { users = await loadUsers(); } catch(e){ console.error(e); }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    err.style.display = 'none';

    const email = document.getElementById('email').value.trim().toLowerCase();
    const pass  = document.getElementById('password').value;

    const u = users.find(x => x.email === email && x.password === pass && x.active);
    if(!u){
      err.style.display = 'block';
      return;
    }

    // Marca sesión y rol
    localStorage.setItem('dw_auth','ok');
    localStorage.setItem('dw_user', email);
    localStorage.setItem('dw_scope', u.scope || 'main');
    localStorage.setItem('dw_home',  u.home  || (u.scope==='small'?'dashboard_s.html':'dashboard.html'));

    // Prioriza ?next= si venía de una página protegida
    const next = new URLSearchParams(location.search).get('next');
    window.location.href = next || localStorage.getItem('dw_home') || 'dashboard.html';
  });
})();
</script>

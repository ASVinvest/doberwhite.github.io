// assets/js/login.js
(async function(){
  const form = document.getElementById('dw-login');
  const err  = document.getElementById('err');

  const CSV_PATH = 'assets/data/dashboard/users.csv?v=' + Date.now();

  const clean = s => (s||'')
    .replace(/^\uFEFF/, '')      // BOM
    .replace(/^["']|["']$/g,'')  // comillas
    .trim()
    .normalize('NFKC');

  async function loadUsers(){
    const res = await fetch(CSV_PATH, { cache:'no-store' });
    if(!res.ok) return [];
    const txt = await res.text();

    const lines = txt.replace(/\r/g,'').split('\n').filter(l => l.trim().length);
    if(!lines.length) return [];

    const header = clean(lines[0]);
    const sep = header.includes(';') ? ';' : ',';
    const cols = header.split(sep).map(c => clean(c).toLowerCase());

    const iEmail = cols.indexOf('email');
    const iPass  = cols.indexOf('password');
    const iAct   = cols.indexOf('active');
    const iScope = cols.indexOf('scope');
    const iHome  = cols.indexOf('home');

    const users = [];
    for(let i=1;i<lines.length;i++){
      const parts = lines[i].split(sep).map(clean);
      const email = (parts[iEmail]||'').toLowerCase();
      const password = parts[iPass]||'';
      const activeStr = (parts[iAct]||'true').toLowerCase();
      const scope = (parts[iScope]||'').trim().toLowerCase();
      let home = (parts[iHome]||'').trim();

      const active = ['true','1','yes','si','sí'].includes(activeStr);
      if(!home){
        home = (scope === 'small' ? 'dashboard_s.html' : 'dashboard.html');
      }

      if(email && password){
        users.push({ email, password, active, scope, home });
      }
    }
    return users;
  }

  // seguridad: sólo permitimos como next estas dos páginas
  function basePage(p){
    if(!p) return '';
    try{
      const name = p.split('?')[0].split('#')[0].split('/').pop().trim();
      return name;
    }catch(e){ return ''; }
  }
  function getNext(){
    try{
      const u = new URL(location.href);
      return basePage(u.searchParams.get('next') || '');
    }catch(e){ return ''; }
  }

  // lo que cada rol puede ver
  function isAllowed(scope, page){
    if(!page) return false;
    if(scope === 'small') return page === 'dashboard_s.html';
    if(scope === 'main' || scope === 'admin') return page === 'dashboard.html';
    return false;
  }

  let users = [];
  try { users = await loadUsers(); } catch(e){ console.error(e); }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    if(err) err.style.display = 'none';

    const email = document.getElementById('email').value.trim().toLowerCase();
    const pass  = document.getElementById('password').value;

    const u = users.find(x => x.email === email && x.password === pass && x.active);
    if(!u){
      if(err) err.style.display = 'block';
      return;
    }

    // sesión
    localStorage.setItem('dw_auth','ok');
    localStorage.setItem('dw_user',  u.email);
    localStorage.setItem('dw_scope', u.scope);
    localStorage.setItem('dw_home',  u.home);

    // decide destino
    const req = getNext();                            // lo que pidió la URL
    const target = isAllowed(u.scope, req) ? req      // si está permitido, vamos ahí
                  : (isAllowed(u.scope, u.home) ? u.home  // si no, a su home válido
                  : (u.scope === 'small' ? 'dashboard_s.html' : 'dashboard.html')); // fallback

    window.location.href = target;
  });
})();

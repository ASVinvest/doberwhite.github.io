(async function(){
  const form = document.getElementById('dw-login');
  const err  = document.getElementById('err');

  // 👉 Ruta correcta al CSV (carpeta /data/dashboard) + cache buster
  const CSV_PATH = 'assets/data/dashboard/users.csv?v=' + Date.now();

  // Normaliza una celda: quita BOM, comillas, espacios raros
  const clean = (s) => (s||'')
    .replace(/^\uFEFF/, '')           // BOM al inicio
    .replace(/^["']|["']$/g,'')       // comillas al borde
    .trim()
    .normalize('NFKC');

  // Lee CSV simple (email,password,active) con coma o punto y coma
  async function loadUsers(){
    const res = await fetch(CSV_PATH, { cache:'no-store' });
    if(!res.ok) {
      console.warn('No se pudo leer users.csv', res.status);
      return [];
    }
    const txt = await res.text();

    // Normaliza CRLF y separa líneas
    const lines = txt.replace(/\r/g,'').split('\n').filter(l => l.trim().length);
    if(!lines.length) return [];

    // Detecta separador por la cabecera
    const header = clean(lines[0]);
    const sep = header.includes(';') ? ';' : ',';

    // Índices por nombre (por si el orden cambia)
    const cols = header.split(sep).map(c => clean(c).toLowerCase());
    const iEmail = cols.indexOf('email');
    const iPass  = cols.indexOf('password');
    const iAct   = cols.indexOf('active');

    const users = [];
    for(let i=1;i<lines.length;i++){
      const raw = lines[i];
      if(!raw.trim()) continue;
      const parts = raw.split(sep).map(clean);

      const email = (parts[iEmail] || '').toLowerCase();
      const password = parts[iPass] || '';
      const activeStr = (parts[iAct] || 'true').toLowerCase(); // si falta, asume true
      const active = activeStr === 'true' || activeStr === '1' || activeStr === 'yes';

      if(email && password){
        users.push({ email, password, active });
      }
    }
    return users;
  }

  let users = [];
  try { users = await loadUsers(); }
  catch(e){ console.error(e); }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    err.style.display = 'none';

    const email = document.getElementById('email').value.trim().toLowerCase();
    const pass  = document.getElementById('password').value;

    // Busca coincidencia exacta (case-insensitive para email)
    const u = users.find(x => x.email === email && x.password === pass && x.active);

    if(!u){
      err.style.display = 'block';
      return;
    }
    // Marca sesión y entra
    localStorage.setItem('dw_auth','ok');
    localStorage.setItem('dw_user', email);
    window.location.href = 'dashboard.html';
  });
})();

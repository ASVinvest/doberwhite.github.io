<script>
// ===== Auth estático con PBKDF2 (CSV público) =====

// lee CSV simple -> array de objetos
async function dwFetchUsersCSV(url = 'assets/data/users.csv'){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error('No se pudo leer users.csv');
  const text = await res.text();
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(',').map(s=>s.trim());
  return lines
    .filter(l => l.trim().length)
    .map(l => {
      const c = l.split(',').map(s=>s.trim());
      const obj = {};
      cols.forEach((k,i)=>obj[k]=c[i]||'');
      return obj;
    });
}

// PBKDF2-SHA256 -> hex
async function pbkdf2Hex(password, saltHex, iter=120000, lengthBits=256){
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveBits']
  );
  const salt = Uint8Array.from(saltHex.match(/.{1,2}/g).map(h=>parseInt(h,16)));
  const bits = await crypto.subtle.deriveBits(
    {name:'PBKDF2', hash:'SHA-256', salt, iterations: Number(iter)},
    passKey, lengthBits
  );
  const bytes = new Uint8Array(bits);
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function dwLogin(email, pass){
  email = (email||'').trim().toLowerCase();
  const users = await dwFetchUsersCSV();
  const u = users.find(x => (x.email||'').toLowerCase() === email);
  if(!u) return {ok:false, msg:'Usuario no encontrado'};
  if(String(u.active) !== '1') return {ok:false, msg:'Usuario inactivo'};

  const iter = Number(u.iter || 120000);
  const dk = await pbkdf2Hex(pass, u.salt, iter, 256);
  if(dk !== u.dk) return {ok:false, msg:'Credenciales inválidas'};

  sessionStorage.setItem('dw_auth', JSON.stringify({
    email: u.email, role: u.role||'viewer', i: iter, t: Date.now()
  }));
  return {ok:true};
}

export function dwGate(opts = {}){
  const sess = sessionStorage.getItem('dw_auth');
  if(!sess){ location.href = opts.login || 'login.html'; return; }
  try{
    const obj = JSON.parse(sess);
    const maxAge = (opts.maxAgeMs ?? 12*60*60*1000);
    if(Date.now() - obj.t > maxAge) throw 0;
  }catch(e){
    sessionStorage.removeItem('dw_auth');
    location.href = opts.login || 'login.html';
  }
}

export function dwLogout(){
  sessionStorage.removeItem('dw_auth');
  location.href = 'login.html';
}
</script>

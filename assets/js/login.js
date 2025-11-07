(async function(){
    const form = document.getElementById('dw-login');
    const err  = document.getElementById('err');
  
    // Utilidad: lee CSV simple (email,password,active)
    async function loadUsers(){
      const res = await fetch('assets/data/users.csv', {cache:'no-store'});
      if(!res.ok) throw new Error('No se pudo leer users.csv');
      const txt = await res.text();
      const lines = txt.trim().split(/\r?\n/);
      const header = lines.shift(); // "email,password,active"
      return lines.map(l=>{
        const [email,password,active] = l.split(',');
        return { email: (email||'').trim().toLowerCase(),
                 password: (password||'').trim(),
                 active: ((active||'').trim().toLowerCase()==='true') };
      });
    }
  
    const users = await loadUsers().catch(()=>[]);
  
    form.addEventListener('submit', e=>{
      e.preventDefault();
      err.style.display='none';
  
      const email = document.getElementById('email').value.trim().toLowerCase();
      const pass  = document.getElementById('password').value;
  
      const u = users.find(x=>x.email===email && x.password===pass && x.active);
      if(!u){
        err.style.display='block';
        return;
      }
      // Marca sesión y redirige al dashboard
      localStorage.setItem('dw_auth','ok');
      localStorage.setItem('dw_user', email);
      window.location.href = 'dashboard.html';
    });
  })();
  
// Menú minimal, accesible y sin dependencias
(function(){
	const root = document.documentElement;
	function toggleMenu(e){ if(e) e.preventDefault(); document.body.classList.toggle('is-open'); }
	document.addEventListener('click', (e)=>{
	  const trigger = e.target.closest('a[href="#menu"]');
	  if (trigger) { toggleMenu(e); return; }
	  if (document.body.classList.contains('is-open') && !e.target.closest('.site-menu')) {
		document.body.classList.remove('is-open');
	  }
	});
	document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') document.body.classList.remove('is-open'); });
  })();
   
/* JS minimal: abre/cierra menú y aplica fondo de banner */
(function(){
	// Menú toggle
	function toggleMenu(e){ if(e) e.preventDefault(); document.body.classList.toggle('is-menu-visible'); }
	document.addEventListener('click', e=>{
	  const a=e.target.closest('a[href="#menu"]');
	  if(a){ e.preventDefault(); toggleMenu(); }
	  // cerrar si clic fuera de panel cuando abierto
	  if(document.body.classList.contains('is-menu-visible') && !e.target.closest('#menu') && !a){
		document.body.classList.remove('is-menu-visible');
	  }
	});
	document.addEventListener('keydown', e=>{ if(e.key==='Escape') document.body.classList.remove('is-menu-visible'); });
  
	// Opcional: usa <img> interno o data-bg para banner
	document.querySelectorAll('#banner').forEach(b=>{
	  const img = b.querySelector('img');
	  if(img){ b.style.backgroundImage = `url('${img.getAttribute('src')}')`; img.style.display='none'; }
	});
  })();
  
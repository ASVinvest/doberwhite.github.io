/* Minimal JS: menú + banner-bg + accesibilidad */
(function () {
	// Toggle menú (independiente de otras libs)
	function toggleMenu(e){
	  if (e) e.preventDefault();
	  document.body.classList.toggle('is-menu-visible');
	}
	document.addEventListener('click', function(e){
	  const a = e.target.closest('a[href="#menu"]');
	  if (a){ e.preventDefault(); toggleMenu(); }
	  // cerrar si clic fuera del panel
	  if (document.body.classList.contains('is-menu-visible') && !e.target.closest('#menu')) {
		if (!e.target.closest('a[href="#menu"]')) document.body.classList.remove('is-menu-visible');
	  }
	});
	document.addEventListener('keydown', e=>{ if (e.key === 'Escape') document.body.classList.remove('is-menu-visible'); });
  
	// Banner: usar data-bg o <img> interno como fondo
	document.querySelectorAll('#banner').forEach(b=>{
	  const holder = b.querySelector('[data-bg]'); // opcional
	  const img = b.querySelector('.inner .image img');
	  const url = holder?.dataset.bg || (img ? img.getAttribute('src') : null);
	  if (url){
		let bg = b.querySelector('.bg');
		if(!bg){ bg = document.createElement('div'); bg.className='bg'; b.prepend(bg); }
		bg.style.backgroundImage = `url('${url}')`;
		if (img) img.parentElement.style.display='none';
	  }
	});
  })();
  
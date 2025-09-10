// assets/js/dw-tiles.js
document.addEventListener('click', function (e) {
    const art = e.target.closest('.tiles article');
    if (!art) return;
    const link = art.querySelector('a[href]');
    if (!link) return;
    if (e.target.closest('a')) return; // si ya clicó en un link, no dupliques
    window.location = link.href;
  });
  
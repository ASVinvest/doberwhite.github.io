/*
 * Forty by HTML5 UP (customised for DoberWhite).
 *
 * Este script restaura el comportamiento interactivo original del tema.
 */

(function ($) {
	var $window = $(window),
		$body = $('body'),
		$wrapper = $('#wrapper'),
		$header = $('#header'),
		$banner = $('#banner');
  
	breakpoints({
	  xlarge: ['1281px', '1680px'],
	  large: ['981px', '1280px'],
	  medium: ['737px', '980px'],
	  small: ['481px', '736px'],
	  xsmall: ['361px', '480px'],
	  xxsmall: [null, '360px']
	});
  
	$.fn._parallax = (browser.name === 'ie' || browser.name === 'edge' || browser.mobile) ? function () {
	  return $(this);
	} : function (intensity) {
	  var $w = $(window),
		  $t = $(this);
  
	  if (!intensity) intensity = 0.25;
  
	  $t.each(function () {
		var $el = $(this);
		function on() {
		  $el.css('background-position', 'center 0px');
		  $w.on('scroll._px', function () {
			var pos = parseInt($w.scrollTop()) - parseInt($el.position().top);
			$el.css('background-position', 'center ' + (pos * (-1 * intensity)) + 'px');
		  });
		}
		function off() {
		  $el.css('background-position', '');
		  $w.off('scroll._px');
		}
		breakpoints.on('<=medium', off);
		breakpoints.on('>medium', on);
	  });
	  $w.off('load._px resize._px').on('load._px resize._px', function () {
		$w.trigger('scroll');
	  });
	  return $(this);
	};
  
	$window.on('load', function () {
	  setTimeout(function () {
		$body.removeClass('is-preload');
	  }, 100);
	});
  
	// Menú responsive
	var $menu = $('#menu'),
		$menuInner;
	$menu.wrapInner('<div class="inner"></div>');
	$menuInner = $menu.children('.inner');
	$menu._locked = false;
	$menu._lock = function () {
	  if ($menu._locked) return false;
	  $menu._locked = true;
	  setTimeout(function () {
		$menu._locked = false;
	  }, 350);
	  return true;
	};
	$menu._toggle = function () {
	  if ($menu._lock()) $body.toggleClass('is-menu-visible');
	};
	$menu._hide = function () {
	  if ($menu._lock()) $body.removeClass('is-menu-visible');
	};
  
	$menuInner.on('click', function (e) {
	  e.stopPropagation();
	}).on('click', 'a', function (e) {
	  var href = $(this).attr('href');
	  e.preventDefault();
	  e.stopPropagation();
	  $menu._hide();
	  setTimeout(function () {
		window.location.href = href;
	  }, 250);
	});
	$menu.appendTo($body).on('click', function (e) {
	  e.stopPropagation();
	  e.preventDefault();
	  $menu._hide();
	});
	$body.on('click', 'a[href="#menu"]', function (e) {
	  e.preventDefault();
	  $menu._toggle();
	}).on('keydown', function (e) {
	  if (e.keyCode === 27) $menu._hide();
	});
  
	// Parallax del banner e inserción de imagen de fondo
	$banner.each(function () {
	  var $el = $(this),
		  $img = $el.find('.inner .image img');
	  $el._parallax(0.275);
	  if ($img.length) {
		$el.css('background-image', 'url(' + $img.attr('src') + ')');
		$el.find('.inner .image').hide();
	  }
	});
  
	// Restaurar tiles (<article>) del tema: asigna fondo y hace clickeable todo
	var $tiles = $('.tiles > article');
	$tiles.each(function () {
	  var $this = $(this),
		  $image = $this.find('.image'),
		  $img = $image.find('img'),
		  $link = $this.find('a.link'),
		  pos;
  
	  if ($img.length > 0) {
		$this.css('background-image', 'url(' + $img.attr('src') + ')');
		if (pos = $img.data('position'))
		  $image.css('background-position', pos);
	  }
	  $image.hide();
	  if ($link.length > 0) {
		var $overlay = $link.clone().text('').addClass('primary').appendTo($this);
		$link = $link.add($overlay);
		$link.on('click', function (event) {
		  var href = $(this).attr('href');
		  event.preventDefault();
		  event.stopPropagation();
		  if ($(this).attr('target') === '_blank') {
			window.open(href);
		  } else {
			$this.addClass('is-transitioning');
			$wrapper.addClass('is-transitioning');
			setTimeout(function () {
			  location.href = href;
			}, 500);
		  }
		});
	  }
	});
  
	// Tiles ancla con data-href (alternativa sencilla)
	$('.tile[data-href]').each(function () {
	  var href = $(this).data('href');
	  $(this).on('click', function (e) {
		e.preventDefault();
		window.location.href = href;
	  });
	});
  
  })(jQuery);
  
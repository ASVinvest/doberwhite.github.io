/*
  Forty by HTML5 UP – versión ajustada.
  Quitamos las etiquetas <script> sueltas que rompían el menú y los tiles,
  y restauramos la funcionalidad completa del tema.
*/
(function($){

	var $window=$(window),
		$body=$('body'),
		$wrapper=$('#wrapper'),
		$header=$('#header'),
		$banner=$('#banner');
  
	// Breakpoints
	breakpoints({
	  xlarge: ['1281px','1680px'],
	  large:  ['981px','1280px'],
	  medium: ['737px','980px'],
	  small:  ['481px','736px'],
	  xsmall: ['361px','480px'],
	  xxsmall:[null,'360px']
	});
  
	// Parallax helper
	$.fn._parallax = (browser.name=='ie'||browser.name=='edge'||browser.mobile)
	  ? function(){ return $(this); }
	  : function(intensity){
		  var $w=$(window);
		  if(!intensity) intensity=0.25;
		  $(this).each(function(){
			var $el=$(this);
			function on(){
			  $el.css('background-position','center 0px');
			  $w.on('scroll._px',function(){
				var pos=parseInt($w.scrollTop())-parseInt($el.position().top);
				$el.css('background-position','center '+(pos*(-1*intensity))+'px');
			  });
			}
			function off(){ $el.css('background-position',''); $w.off('scroll._px'); }
			breakpoints.on('<=medium',off);
			breakpoints.on('>medium',on);
		  });
		  $w.off('load._px resize._px').on('load._px resize._px',function(){ $w.trigger('scroll'); });
		  return $(this);
		};
  
	// Desaparece clase preload al cargar
	$window.on('load',function(){ setTimeout(function(){ $body.removeClass('is-preload'); },100); });
  
	// Fix IE / Edge
	if (browser.name=='ie'||browser.name=='edge') $body.addClass('is-ie');
  
	// Scrolly
	$('.scrolly').scrolly({ offset:function(){ return $header.height()-2; } });
  
	// Hacer clickeables todas las tiles y asignarles fondo
	var $tiles=$('.tiles>article');
	$tiles.each(function(){
	  var $this=$(this),
		  $image=$this.find('.image'), $img=$image.find('img'),
		  $link=$this.find('.link');
	  $this.css('background-image','url('+ $img.attr('src') +')');
	  if ($img.data('position')) $image.css('background-position',$img.data('position'));
	  $image.hide();
	  if ($link.length){
		var $x=$link.clone().text('').addClass('primary').appendTo($this);
		$link=$link.add($x);
		$link.on('click',function(event){
		  var href=$link.attr('href');
		  event.preventDefault(); event.stopPropagation();
		  if($link.attr('target')=='_blank') window.open(href);
		  else {
			$this.addClass('is-transitioning'); $wrapper.addClass('is-transitioning');
			setTimeout(function(){ location.href=href; },500);
		  }
		});
	  }
	});
  
	// Banner y header (parallax + alt)
	if ($banner.length>0 && $header.hasClass('alt')){
	  $window.on('resize',function(){ $window.trigger('scroll'); });
	  $window.on('load',function(){
		$banner.scrollex({
		  bottom:$header.height()+10,
		  terminate:function(){ $header.removeClass('alt'); },
		  enter:function(){ $header.addClass('alt'); },
		  leave:function(){ $header.removeClass('alt'); $header.addClass('reveal'); }
		});
		setTimeout(function(){ $window.triggerHandler('scroll'); },100);
	  });
	}
  
	// Banner → usa imagen interna como fondo y aplica parallax
	$banner.each(function(){
	  var $el=$(this), $image=$el.find('.image'), $img=$image.find('img');
	  $el._parallax(0.275);
	  if($image.length){
		$el.css('background-image','url('+ $img.attr('src') +')');
		$image.hide();
	  }
	});
  
	// Menú responsive (abre, cierra y evita múltiples clicks)
	var $menu=$('#menu'), $menuInner;
	$menu.wrapInner('<div class="inner"></div>');
	$menuInner=$menu.children('.inner');
	$menu._locked=false;
	$menu._lock=function(){ if($menu._locked) return false; $menu._locked=true; setTimeout(function(){ $menu._locked=false; },350); return true; };
	$menu._show=function(){ if($menu._lock()) $body.addClass('is-menu-visible'); };
	$menu._hide=function(){ if($menu._lock()) $body.removeClass('is-menu-visible'); };
	$menu._toggle=function(){ if($menu._lock()) $body.toggleClass('is-menu-visible'); };
  
	$menuInner.on('click',function(event){ event.stopPropagation(); })
			  .on('click','a',function(event){
				var href=$(this).attr('href');
				event.preventDefault(); event.stopPropagation();
				$menu._hide();
				setTimeout(function(){ window.location.href=href; },250);
			  });
  
	$menu.appendTo($body).on('click',function(event){ event.stopPropagation(); event.preventDefault(); $menu._hide(); })
		 .append('<a class="close" href="#menu">Close</a>');
  
	$body.on('click','a[href="#menu"]',function(event){ event.preventDefault(); $menu._toggle(); })
		 .on('keydown',function(event){ if(event.keyCode==27) $menu._hide(); });
  
  })(jQuery);
  
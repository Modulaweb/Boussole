/* Add pois to the POI listing zone */
function addPOIToList(attributes) {
    if (attributes.icon !== undefined) attributes.color = boussoleurl+attributes.icon;
    var li = '<li class="poi chrome_light" data-id="'+attributes.id+'" id="poi_'+attributes.id+'"><img class="icon" src="'+attributes.color+'"></div><span class="title">'+attributes.name+'</span><br><span class="address visuallyhidden">'+attributes.address+'</span></li>';
	$('#pois ul').append(li);
	poisCount++;
}

function displayPOICount() {
	if (poisCount>1)
		$('#pois h2 span.text').html(poisCount + ' points d\'intérêt.');
	else if (poisCount>0)
		$('#pois h2 span.text').html('1 point d\'intérêt.');
	else
		$('#pois h2 span.text').html('Aucun point d\'intérêt.');
}

/* set the pois & footer zones heights */
function setSize() {
	if (mobilemode) return true;
	$('#categories_container').height('65%');
	$('#categories').accordion('resize');
	$('#pois').height($('#main aside').innerHeight()-$('#categories_container').outerHeight());
	$('#pois ul').height($('#pois').innerHeight()-$('#pois h2').outerHeight());
// neutralisatio routing	$('#map_container').height($('#main').height()-$('article footer').height());
	$('#map_container').height($('#main').height());
	$('#map, #map-toolbar').height($('#map_container').height()-$('#addresses').height()-3);
	$('#map').width($('#map_container').innerWidth()-$('#map-toolbar').outerWidth());
	$('#zoomSlider').height($('#map-toolbar').height() - 250);
	$('#addresses .address_input').width(Math.floor(($('#addresses').innerWidth() - $('#switch').outerWidth(true) - $('#address-go').outerWidth(true))/2)-58);
	$('#vKeyboard').css('left',Math.floor($(document).innerWidth() / 2 - $('#vKeyboard').outerWidth() / 2) + 100);
	showPopupModes();
}

/* display the transport modes popup */

function showPopupModes(html) {
	$('#popup_modes')
		.width(745)//Math.floor($('#map').innerWidth()*2/3))
		.height(240)//Math.floor($('#map').innerHeight()*2/3))
		.css('top',$('#map').offset().top + Math.floor($('#map').innerHeight()/2-240/2))//Math.floor($('#map').innerHeight()/3/2))
		.css('left',$('#map').offset().left + Math.floor($('#map').innerWidth()/2-745/2))//Math.floor($('#map').innerWidth()/3/2))
		;
	if (html != undefined)
		$('#popup_modes').html(html).show('puff',500);
}

/* categries background */
function setCatBG() {
	try {
		$('#categories li:not(.root,.public_transport)').each(function() {
			if ($(this).hasClass('active')) {
				var idcat = Number($(this).find('a').attr('href').split('#')[1]);
				$(this).css('background-color',categories[jsonPOICats][idcat].color);
			} else {
				$(this).css('background-color','transparent');
			}
		});
	} catch (e) {
		window.setTimeout(setCatBG,100);
	}
}

/* return a random color */
function getRandomColor() {
    var letters = '89ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 7)];
    }
    return color;
}

/* select the poi on list */
function selectPOIOnList(poi) {
	$('#pois ul').scrollTo(
		poi,
		500,
		{
			easing: 'swing'
		}
	);
	$('#pois li.selected').removeClass('selected');
	$(poi).addClass('selected');
}

function toggleRouting() {
	if (routing_displayed) {
		$('#routing *').hide('slide',500,function(){
			$('#routing').html('<div id="routing_hidden">Itinéraire masqué.<br><a href="#" onclick="toggleRouting(); return false;">Cliquez ici pour l\'afficher de nouveau</a></div>');
		});
		$('#routing_time').hide('slide',500);
		$('#routing_loading').show('clip',500);
		$('.button_mode').hide('slide',500);
		routing_displayed = false;
	} else {
		$('#routing').show('slide',500);
		routing_displayed = true;

		// TODO : faire en sorte que l'itinéraire de départ ne s'affiche pas si le routing est masqué
		// TODO : afficher le routing de nouveau

	}
}
function PTLoadEnd() {
	if (PTLinesLoaded && PTStopsLoaded) {
		notify('Chargement du réseau Tam terminé.','comment');
		$('.cat_loader').parent().html('&nbsp;');
		cleanupPT();
	} else {
		window.setTimeout(PTLoadEnd,100);
	}
}

/******************************************************************************/
$(function() {

    $('#start-add, #end-add')
		.keypress(function(e){/* avoind Enter key on addresses fields */
		    if (e.keyCode == 13) {
		    	e.preventDefault();
		    	if ($(this).attr('id') == 'start-add') {
		    		$('#end-add').focus().select();
		    		return false;
		    	} else {
		    		go();
		    		return false;
		    	}
		    }
		})
		.focusin ( function() { 
		    $(this).addClass('selected');
		})
		.focusout( function() { $(this).removeClass('selected'); })
	;
    $('#start, #end').submit(function(e){ e.preventDefault(); go(); return false; });

	/* indicates that the curent device is a touch device */
	if (isTouchDevice()) $('body').addClass('touch');

	/* Set the sizes when window is resized */
	$(window).resize(function() { window.setTimeout(function(){ setSize(); },500)});

	/* enabling touch scroll on some element */
	if (isTouchDevice()) $('#pois ul, #categories .cat_list, #about .content').touchScroll();
	if (mobilemode) $('#permalink_div').css('overflow','show').touchScroll();

	/* rotation change */
	function adjustToViewport() {
		if (mobilemode) return true;
		if (window.orientation === 0 || window.orientation === 180 || $('body').outerWidth() < 1024) {
			//portrait
			$('body').addClass('portrait');
		} else {
			//paysage
			$('body').removeClass('portrait');
			$('.left_align').show('slide', {direction: 'left'},100,function(){setSize();});
		}
		setSize();
	}

	adjustToViewport();

	$(window).bind('resize orientationchange', function() {
		adjustToViewport();
	});
	$( "#zoomSlider" )
	    .slider({
			orientation: "vertical",
			range: "min",
			min: 13,
			max: 18,
			value: 13,
			slide: function( event, ui ) {
				map.zoomTo(ui.value);
			}
		})
		.find('.ui-slider-handle').html('<span class="icon ir">Faire glisser pour zoomer ou dézoomer</span>')
	;

    function getPointsAndCategories () {
        var catok = false;
        if (localStorage) {
            var data = localStorage.getItem('pointsAndCategories');
            if (data != null) {
		        pointsAndCategories = JSON.parse(data);
		        setPointsAndCategories ();
		        catok = true;
            }
        }
        if (!catok) $.get(boussoleurl+'api/'+boussoleAPIKey+'/getPointsAndCategories_/?domain='+window.location.host+'&callback=?',
		    {lists:lists},
		    function (data) {
		        if (localStorage) localStorage.setItem('pointsAndCategories',JSON.stringify(data));
		        pointsAndCategories = data;
		        setPointsAndCategories ();
		    },
		    'json'
	    );
        
    }
    function setPointsAndCategories () {
        try {
	        var GeoJSON = new OpenLayers.Format.GeoJSON({
		        internalProjection:map.projection,
		        externalProjection:map.displayProjection
	        });
	        var features = GeoJSON.read(pointsAndCategories.points);
	        layers.pois.addFeatures(features);
	        boussoleStart('points');
	        categories = pointsAndCategories.categories;
	        boussoleStart('categories');
        } catch(e) {
            window.setTimeout(setPointsAndCategories,100);
        }
    }
    getPointsAndCategories();
   // window.setTimeout(getPublicTransport,100);

	/* scrolling effect on routing */
    $('#routing').css({overflow: 'hidden'});
    if (!isTouchDevice())
		$('#routing').mousemove(function(e){
			if (!mobilemode)
				$('#routing').scrollLeft((e.pageX - $('#routing').offset().left) * ($('#routing ul').width() - $('#routing').width()) / $('#routing').width());
			else
				$('#routing').scrollTop((e.pageY - $('#routing').offset().top) * ($('#routing ul').height() - $('#routing').height()) / $('#routing').height());
		});
	else
		$('#routing').bind('touchmove',function(event) {
			if (!mobilemode)
				$('#routing').scrollLeft((event.originalEvent.touches[0].pageX - $('#routing').offset().left) * ($('#routing ul').width() - $('#routing').width()) / $('#routing').width());
			else
				$('#routing').scrollTop((event.originalEvent.touches[0].pageY - $('#routing').offset().top) * ($('#routing ul').height() - $('#routing').height()) / $('#routing').height());
			event.preventDefault();
		});




	/* Categories */
	/* Categories load and accordion instanciate */
	var catok = false;
    if (localStorage) {
        var data = localStorage.getItem('getLists');
        if (data != null) {
            data = JSON.parse(data);
            catok = true;
			$('#categories')
				.append(data.html)
				.accordion({
					header: 'h1',
					icons: {
						'header': 'ui-icon-circle-arrow-e',
						'headerSelected': 'ui-icon-circle-arrow-s'
					},
//					clearStyle: true, // no clearstyle by now, or the styles will be messed up !
					fillSpace: true,
					navigation: true,
					animated: 'bounceslide',
					change: function(event,ui) {
						//jsonPOICats = ui.newHeader.attr('list');
						//getPOIsSelected(false,true);
					}
				});
        }
    }
    if (!catok)	$.get(boussoleurl+'api/'+boussoleAPIKey+'/getLists/?domain='+window.location.host+'&callback=?',
		{
			lists: lists,
			format:'html'
		},
		function(data) {
		    if (localStorage && data.status == 'ok') localStorage.setItem('getLists',JSON.stringify(data));
			$('#categories')
				.append(data.html)
				.accordion({
					header: 'h1',
					icons: {
						'header': 'ui-icon-circle-arrow-e',
						'headerSelected': 'ui-icon-circle-arrow-s'
					},
//					clearStyle: true, // no clearstyle by now, or the styles will be messed up !
					fillSpace: true,
					navigation: true,
					animated: 'bounceslide',
					change: function(event,ui) {
						//jsonPOICats = ui.newHeader.attr('list');
						//getPOIsSelected(false,true);
					}
				});
		},
		'json'
	);

    $('#categories li.entry.pois').live('click',function(){
        var date = new Date();                                                  // }
        if ($(this).data('lastclick') > date.getTime() - 750) return false;     // }} allow to disable accidental doubleclick
        $(this).data('lastclick', date.getTime());                              // }
        if ($(this).hasClass('active')) {
            $(this)
                .removeClass('active')
                .find('.count')
                    .css('background','#999')
                    .css('color','#fff')
                    .css('text-shadow','0 -1px 0 rgba(0, 0, 0, 0.25)')
            ;
        } else {
            $(this)
                .addClass('active')
                .find('.count')
                    .css('background',categories[$(this).data('listname')][$(this).data('catid')].color)
                    .css('color',categories[$(this).data('listname')][$(this).data('catid')].inversecolor)
                    .css('text-shadow','0 -1px 0 '+categories[$(this).data('listname')][$(this).data('catid')].shadowcolor)
           ;
        }
		poisCount = 0;
		$('#pois ul').html('');
		cleanupPOIs();
		if (layers.pois.selectedFeatures[0] !== undefined) {
			if (!inArray(layers.pois.selectedFeatures[0].attributes.tags.join(' '),activeCategoriesTags)) {
				layers.pois.events.triggerEvent("featureunselected", {feature: layers.pois.selectedFeatures[0]});
				layers.pois.selectedFeatures = [];
			}
		}
		displayPOICount(); // TODO : placer ça dans l'affichage du point (dans getDisplay de PoiContext dans map.js)
		setPermalink();
    });
    $('#categories li.entry.public_transport').live('click',function(){
        var date = new Date();                                                  // }
        if ($(this).data('lastclick') > date.getTime() - 750) return false;     // }} allow to disable accidental doubleclick
        $(this).data('lastclick', date.getTime());                              // }
        if ($(this).hasClass('active')) {
            $(this)
                .removeClass('active')
                .find('.count')
                    .css('background','#999')
                    .css('color','#fff')
                    .css('text-shadow','0 -1px 0 rgba(0, 0, 0, 0.25)')
            ;
        } else {
            $(this)
                .addClass('active')
                .find('.count')
                    .css('background',$(this).data('color'))
                    .css('color',$(this).data('inversecolor'))
                    .css('text-shadow','0 -1px 0 '+$(this).data('shadowcolor'))
           ;
        }
		if (PTLinesLoaded && PTStopsLoaded) {
        	cleanupPT();
    	} else if (!PTLoading) {
    	    $(this).find('.count').html('<img class="cat_loader" style="margin-top:2px;" src="'+boussoleurl+'/images/catloader.gif">');
			PTLoading = true;
			notify('Chargement en cours…','comment');
			$('ul.pt_load').toggle('blind',{},'100');
			getPublicTransport();
			PTLoadEnd();
		} else {
			alert('Le chargement est déjà en cours');
		}
    });
    $('#btn_cleanup').click(function(){
         $('#categories li.entry.active')
                .removeClass('active')
                .find('.count')
                    .css('background','#999')
                    .css('color','#fff')
                    .css('text-shadow','0 -1px 0 rgba(0, 0, 0, 0.25)')
         ;
		if (layers.location.selectedFeatures[0] !== undefined) {
			var feat = layers.location.selectedFeatures[0];
			layers.location.events.triggerEvent("featureunselected", {feature: feat});
		}
		if (layers.pois.selectedFeatures[0] !== undefined) {
			var feat = layers.pois.selectedFeatures[0];
			layers.pois.events.triggerEvent("featureunselected", {feature: feat});
		}
		poisCount = 0;
		cleanupPT();
		cleanupPOIs();
		$('#pois ul').html('');
		layers.pois.redraw();
		layers.pt_lines.redraw();
		displayPOICount();
        return false;
    });

	/* pois popup */
	$('#pois li.poi').live('click',function() {
		var id = $(this).data('id');
	    for (var idx in layers.pois.features) {
			if (layers.pois.features[idx].getVisibility() && layers.pois.features[idx].attributes.id == id) {
				var feat = layers.pois.features[idx];
				break;
			}
        }
        if (layers.pois.selectedFeatures[0] !== undefined)
			layers.pois.events.triggerEvent("featureunselected", {feature: layers.pois.selectedFeatures[0]});
		layers.pois.events.triggerEvent("featureselected", {feature: feat});
		$('body.portrait #btn_categories').click();
		if (mobilemode)
			$('#btn_map').click();
	});

	/* route highlight */
	$('#routing li:not(.pedestrian)').live('click',function() {
        if (layers.pois.selectedFeatures[0] !== undefined)
			layers.pois.events.triggerEvent("featureunselected", {feature: layers.pois.selectedFeatures[0]});

		var bounds = new OpenLayers.Bounds();

		if ($(this).hasClass('start') || $(this).hasClass('end')) {
			if ($(this).hasClass('start'))
				bounds.extend(features.start.geometry);
			else
				bounds.extend(features.end.geometry);
		} else {
			var id = Number($(this).attr('id').split('route_')[1]);
			for (var i in routing.routes[id].features)
				bounds.extend(routing.routes[id].features[i].geometry.getBounds());
		    if (id == 0)
		        bounds.extend(features.start.geometry);
		}
		map.zoomToExtent(bounds);
		setPermalink();
		if (mobilemode) $('#btn_map').parent().click();
	});

	/* permalink */
	$('#permalink_div .close').click(function(){
		$('#permalink_div').hide('slide',{direction:'right'},100);
	});

	/* Shortener API */

	var shortener = {
		'shorten':	function(url,mobilemode) {
			var service_url = boussoleurl+'api/'+boussoleAPIKey+'/proxy/?domain='+window.location.host+'&action=bitly&callback=?';
			this.url = url;
			$.get(
				service_url,
				{
					longurl: url,
				},
				function(response) {
					console.log(response);
					console.log(response.status_code);
					if (response.status_code == 200) {
						console.log('ok');
						var url = response.data.url;
					} else {
						console.log('nok');
						console.log(response.status_code);
						var url = this.url;
					}
					$('#permalink').val(url).focus().select();
					$('a.twitter-share-button').attr('href','https://twitter.com/share?url='+url+'&via=mandarine34&lang=fr&text=Itinéraire+sur+Boussole');
					$('a.facebook-share-button').attr('href','https://www.facebook.com/sharer/sharer.php?u='+url+'&t=Itinéraire+sur+Boussole');
					$('a.gplus-share-button').attr('href','https://m.google.com/app/plus/x/?v=compose&hideloc=1&content=Itinéraire+sur+Boussole+–+'+url);
					//$('a.gplus-share-button').attr('href','https://plusone.google.com/_/+1/confirm?hl=fr&url='+url+'&title=Itinéraire+sur+Boussole');
					if (!mobilemode && !client.tuio) {
						$('#qr_permalink').html('').qrcode({text: url, width: 100, height: 100});
				    } else {
						$('#qr_permalink').html('').width(200).height(200).qrcode({text: url, width: 200, height: 200});
				    }
				},
				'json'
			)
			return this.url;
		}
	}
	$('#map_permalink').click(function(){
		if (!mobilemode) {
			$('#permalink_div').toggle('slide',{direction:'right'},100,function() {
				setPermalink();
				shortener.shorten(permalink,mobilemode);
			});
		} else {
			$('header ul.buttons li').removeClass('selected');
			$(this).parent().addClass('selected');
			$('.page:not(#map)').hide();
			$('#permalink_div').show();
			shortener.shorten(permalink,mobilemode);
		}
		return false;
	});
	
	/* about link and frame */
	if (!mobilemode) {
		$('#about_link').click(function() {
			$('#about').show();
			return false;
		});
		$('#about .close').click(function(){
			$('#about').hide();
		});
		$('#dataSources .close').click(function(){
			$('#dataSources').hide();
		});

		/* feedback link, frame and form */
		$('#feedback_link').click(function() {
			setPermalink();
			$('#feedback_permalink').val(permalink);
			$('#feedback_istouchdevice').val((isTouchDevice() ? 'oui' : 'non'));
			$('#feedback_useragent').val(navigator.userAgent);
			$('#feedback').show();
			return false;
		});
		$('#feedback .close').click(function(){
			$(':input','#send_feedback')
			 .not(':button, :submit, :reset, :hidden')
			 .val('')
			 .removeAttr('checked')
			 .removeAttr('selected');
			$('#feedback').hide();
			if (client.tuio) hideVKeyboard();
		});
	} else {
		$('#about_link').parent().click(function() {
			$('#about').show();
			currentPage.hide();
			return false;
		});
		$('#about .close').click(function(){
			$('#about').hide();
			currentPage.show();
		});
		$('#feedback_link').parent().click(function() {
			$('#feedback').show();
			setPermalink();
			$('#feedback_permalink').val(permalink);
			$('#feedback_istouchdevice').val((isTouchDevice() ? 'oui' : 'non'));
			$('#feedback_useragent').val(navigator.userAgent);
			currentPage.hide();
			return false;
		});
		$('#feedback .close').click(function(){
			$(':input','#send_feedback')
			 .not(':button, :submit, :reset, :hidden')
			 .val('')
			 .removeAttr('checked')
			 .removeAttr('selected');
			$('#feedback').hide();
			currentPage.show();
			if (client.tuio) hideVKeyboard();
		});
	}
	$('#send_feedback').submit(function() {
	    if (client.tuio) hideVKeyboard();
		var form = $(this).serialize();
		if ($('#feedback_category').val() == '') {
			error('Vous devez sélectionner un thème !');
			$('#feedback_category').focus();
		}
		if ($('#feedback_comment').val() == '') {
			error('Vous devez écrire un message !');
			if (form.category != '')
				$('#feedback_comment').focus();
		}
		if ($('#feedback_category').val() == '' || $('#feedback_comment').val() == '')
			return false;

		$('#feedback .close').click();
		notify('Votre message est en cours d\'envoi…','comment');
		$.post($(this).attr('action'),
			form,
			function (data) {
				notify('Votre message a été envoyé : merci de votre intérêt !','comment');
			},
			'json'
		);
		return false;
	});


	/* show categories when small device is used or portrait */
	$('body.portrait #btn_categories').click(function() {
		$('body.portrait .left_align').toggle('slide', {direction: 'left'},100,function(){setSize();});
		return false;
	});

	/* mode switching */
	$('.button_popup').live('click',function() {
		var m = $(this).attr('id').split('mode_popup_')[1];
		$('#popup_modes').hide('puff',500);
		$('.button_mode').show('slide',500);
		$('#mode_'+m).click();
		return false;
	});
	$('.button_mode a').click(function() {
		mode = $(this).attr('id').split('mode_')[1];;
		displayRouting();
		$('#routing_time').show('slide',500);
		$('.button_mode').removeClass('selected');
		$(this).parent().addClass('selected');
		$('#routing_time').focus();
		return false;
	});
	
	if (getUrlParam('tuio') !== false && uniTouch !== undefined) {
        document.addEventListener("pinchzoomin", function(evt) {
            map.zoomIn();
        });
        document.addEventListener("pinchzoomout", function(evt) {
            map.zoomOut();
        });
    }

	/* Mobile Mode Behaviours */
	if (mobilemode) {
		//window.attribution = $('#map .olControlAttribution').html();
		/* geoloc */
		if (navigator.geolocation) {
			$('#geoloc').click(function() {
				alert('Géolocalisation en cours…');
				window.GPSFirstTry = true;
				navigator.geolocation.getCurrentPosition(doGeoloc, errorGeoloc, {maximumAge: 2000, timeout: 15000, enableHighAccuracy: true});
			    return false;
			});
		} else {
			$('#geoloc').remove();
		}
		var currentPage = $('#addresses');
		$('#map .olControlAttribution').html('Credits <a href="http://openstreetmap.org">OSM</a> <a href="http://open.mapquest.fr" target="_blank">MQ</a> <a href="http://opendata.montpelliernumerique.fr/Les-donnees">MTN</a>')
		$('#btn_addresses').parent().click(function() {
			$('header ul.buttons li').removeClass('selected');
			$(this).addClass('selected');
			$('.page:not(#map)').hide();
			$('#map-toolbar').hide();
			$('#addresses').show();
			currentPage = $('#addresses');
			return false;
		});
		$('#btn_routing').parent().click(function() {
			$('header ul.buttons li').removeClass('selected');
			$(this).addClass('selected');
			$('.page:not(#map)').hide();
			$('#map-toolbar').hide();
			$('#routing').show();
			currentPage = $('#routing');
			return false;
		});
		$('#btn_categories').parent().click(function() {
			$('header ul.buttons li').removeClass('selected');
			$(this).addClass('selected');
			$('.page:not(#map)').hide();
			$('#map-toolbar').hide();
			$('#categories_container').show();
			currentPage = $('#categories_container');
			return false;
		});
		$('#btn_pois').parent().click(function() {
			$('header ul.buttons li').removeClass('selected');
			$(this).addClass('selected');
			$('.page:not(#map)').hide();
			$('#map-toolbar').hide();
			$('#pois').show();
			currentPage = $('#pois');
			return false;
		});
		$('#btn_map').parent().click(function() {
			$('header ul.buttons li').removeClass('selected');
			$(this).addClass('selected');
			$('.page:not(#map)').hide();
			$('#map-toolbar').show();
//			zoomToRoute();
			currentPage = $('#map-toolbar');
			return false;
		});
		$('#map').height('100%');
	}

});

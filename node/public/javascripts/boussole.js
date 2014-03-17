/* Author: Jean-François VIAL / Modulaweb <http://about.me/Jeff_>

*/
if (localStorage) {
    var date = localStorage.getItem('date');
    if (date != date_version) {
        localStorage.clear();
        localStorage.setItem('date',date_version);
    }
}
function boussoleStart(step) {
	boussoleReadySteps[step] = true;
	for (s in boussoleReadySteps) {
		if (!boussoleReadySteps[s])
			return false;
	}
	boussoleReady = true;
}

/* geoloc functions */

function doGeoloc(position) {
	if (position.coords.accuracy > 25) {
		if (!mobilemode) {
			$.pnotify_remove_all();
		} else {
			$('.ui-notify').remove();
			$.mobile.hidePageLoadingMsg();
		}
		alert('La géolocalisation peut être très approximative.<br>Précision : '+position.coords.accuracy+' m');
	}
	var geom = 'POINT('+position.coords.longitude+' '+position.coords.latitude+')';
	$.get(
		boussoleurl+'api/'+boussoleAPIKey+'/geocoder/?domain='+window.location.host+'&callback=?',
		{'getAddressFromLatLon':geom},
  		function(data) {
  			if (data.data.status == 'ok') {
				$('#start-add').val(data.data.address);
			} else {
				error('Vous vous trouvez sans-doute en dehors de la zone couverte par Boussole…');
			}
		},
		'json'
	);
}
function errorGeoloc(msg) {
	if (window.GPSFirstTry) {
		window.GPSFirstTry = false;
		navigator.geolocation.getCurrentPosition(doGeoloc, errorGeoloc, {maximumAge: 2000, timeout: 15000, enableHighAccuracy: true});
	} else {
		var error = typeof msg == 'string' ? msg : 'La géolocalisation a échoué…';
		alert(error);
	}
}
function collectActiveCategoriesTags() {
	/* collects all categories tags to use for displaying pois */
	if (!mobilemode) {
		try {
			activeCategoriesTags = []; // initialize the array
			$('#categories li.entry.active:not(.public_transport)').each(function(){
				activeCategoriesTags.push(categories[$(this).data('listname')][$(this).data('catid')].tags.join(' '));
			});
		} catch(e) {
			window.setTimeout(collectActiveCategoriesTags,100);
		}
	} else {
		try {
			activeCategoriesTags = []; // initialize the array
			$('#catlist option:selected').each(function(){
				activeCategoriesTags.push(categories[$(this).data('listname')][$(this).data('catid')].tags.join(' '));
			});
		} catch(e) {
			window.setTimeout(collectActiveCategoriesTags,100);
		}
	}
}
function cleanupPOIs() {
	displayedPois = [];
    poiContext.general = false;
    poiContext.selection = 0;
    poisCount = 0;
    collectActiveCategoriesTags();
    layers.pois.redraw();
    for(var i in layers.pois.features) {
    	if (inArray(layers.pois.features[i].attributes.tags.join(' '),activeCategoriesTags)) {
			addPOIToList(layers.pois.features[i].attributes);
		}
	}
}


function getPublicTransport() {
	var GeoJSON = new OpenLayers.Format.GeoJSON({
		internalProjection:map.projection,
		externalProjection:map.displayProjection
	});
	$.get(
		boussoleurl+'api/'+boussoleAPIKey+'/getPTStopsLines/?domain='+window.location.host+'&callback=?',
		{'getStops':1},
		function (data) {
			var features = GeoJSON.read(data);
			layers.pt_stops.addFeatures(features);
			layers.pt_stops.redraw();
			PTStopsLoaded = true;
		},
		'json'
	);
	$.get(
		boussoleurl+'api/'+boussoleAPIKey+'/getPTStopsLines/?domain='+window.location.host+'&callback=?',
		{'getLines':1},
		function (data) {
			var features = GeoJSON.read(data);
			layers.pt_lines.addFeatures(features);
			layers.pt_lines.redraw();
			PTLinesLoaded = true;
		},
		'json'
	);
}
function cleanupPT() {
	layers.pt_lines.selectedFeatures = [];
	layers.pt_stops.selectedFeatures = [];
	activePTStops = []; // initialize the arrays
	activePTLines = [];
	$('#categories li.public_transport.active').each(function(){
		activePTLines.push($(this).data('line'));
		activePTStops.push($(this).data('line'));
	});
    layers.pt_lines.redraw();
    layers.pt_stops.redraw();
}

function getAddress(aFeat) {
	if (!mobilemode) {
		if ($('#popup_modes').is(':visible'))
			$('#popup_modes').hide('fade',500);
		$('#routing *:visible').hide('fade',500,function(){
			$('#routing_loading').remove();
			$('#routing').append('<div id="routing_loading">Géolocalisation…</div>');
		});
		$('#routing_time:visible').hide('fade',500);
		$('#routing_loading:visible').show('fade',500);
		$('.button_mode:visible').hide('fade',500);
	} else {
		$('#routing_time').html('Calcul en cours…');
		$('#routing-mobile').html('<li></li>');
		$.mobile.showPageLoadingMsg("c", "Calcul en cours", false)
	}
	var pt = aFeat.geometry.clone();
	pt.transform(map.projection,map.displayProjection);
	$.get(
		boussoleurl+'api/'+boussoleAPIKey+'/geocoder/?domain='+window.location.host+'&callback=?',
		{'getAddressFromLatLon':pt.toString()},
		function(data) {
			var address = data.data.address;
			if (data.data.status == 'ok' && address.indexOf('Montpellier')>0) {
				if (aFeat==features.start)
					$('#start-add').val(address);
				else if (aFeat==features.end)
					$('#end-add').val(address);
				getRouting();
			} else {
				var mess = 'Votre point de ';
				if (aFeat==features.start)
					mess += 'départ';
				else if (aFeat==features.end)
					mess += 'd\'arrivée';
				mess += ' est situé en dehors de la zone actuellement prise en charge par Boussole pour le calcul d\'itinéraire.\nChoisissez un point situé à Montpellier.';
				if (!mobilemode) {
					$('#routing_time').show('clip',500);
					$('#routing_loading').remove();
					$('#routing *').show('fade',500);
					$('.button_mode').show('fade',500);
				}
				error(mess);
			}
		},
		'json'
	);
}

function TCcostCalc(cost,type,noop,text) {
	cost = Math.ceil(cost);
	if (noop == undefined) var noop = false;
	if (text == undefined) var text = true;
	var ret = '';
	if (cost > 0) {
		routing_costs.tc.total_cost += cost;
		switch (type) {
			case 'standby':
				if (!noop) routing_costs.tc.standby_cost += cost;
				if (text) ret = ' d\'attente';
				break;
			case 'bustram':
				if (!noop) routing_costs.tc.bustram_cost += cost;
				if (text) ret = ' de trajet';
				break;
			case 'walking':
				if (!noop) routing_costs.tc.walking_cost += cost;
				if (text) ret = ' de marche';
				break;
		}
		ret = '±' + humanReadableTime(cost) + ret;
		return ret;
	} else
		return '';
}

function getRouting(zoomTo) {
	try { xhr_get_routing.abort(); } catch(e) { } // stop eventually previous XHR !!
	if (!mobilemode) {
		if ($('#popup_modes').is(':visible'))
			$('#popup_modes').hide('fade',500);
		$('#routing *:visible').hide('fade',500,function(){
			$('#routing_loading').remove();
			$('#routing').append('<div id="routing_loading">Calcul des itinéraires…</div>');
		});
		$('#routing_time:visible').hide('fade',500);
		$('#routing_loading:visible').show('fade',500);
		$('.button_mode:visible').hide('fade',500);
	}
	if (zoomTo == undefined) var zoomTo = true;
	routing_costs = {
		tc : {
			total_cost			: 0,
			walking_cost		: 0,
			bustram_cost		: 0,
			standby_cost		: 0,
			co2_cost			: 0,
			text				: ''
		},
		pedestrian : {
			total_cost			: 0,
			text				: ''
		},
		cycle : {
			total_cost			: 0,
			text				: ''
		},
		car : {
			total_cost			: 0,
			text				: ''
		}
	};

	var start = features.start.geometry.clone();
	var end = features.end.geometry.clone();

	start.transform(map.projection,map.displayProjection)
	end.transform(map.projection,map.displayProjection);

	layers.stops.destroyFeatures();
	layers.stops.redraw();
    layers.transports.destroyFeatures();
    layers.transports.redraw();
    var ssok = false;
    if (sessionStorage) {
        var ssname = 'routing_' + start.x + start.y +'__' + end.x + end.y;
        ssname.replace('\.','_');
        var data = sessionStorage.getItem(ssname);
        if (data != null) {
            computeRouting(JSON.parse(data));
            ssok=true;
        }
    }
    if (!ssok) xhr_get_routing = $.get(boussoleurl+'api/'+boussoleAPIKey+'/getRouting/?domain='+window.location.host+'&callback=?',
		{
			'start':start.x+','+start.y,
			'end':end.x+','+end.y
		},
		function (data) {
		    if (sessionStorage) sessionStorage.setItem(ssname,JSON.stringify(data));
		    computeRouting(data);
		},
		'json'
	);
}
function computeRouting(data) {
	routings = data;
	// TC time calculus
	if (data.tc.routes.length>1) {
		for (var i in data.tc.routes) {
			i = parseInt(i);
			routings = data;
			var route = data.tc.routes[i];
			var prev, next, next_next;
			prev = next = next_next = {type: null,cost:0};
			if (i > 0)
				prev = data.tc.routes[parseInt(i)-1];
			if (i < data.tc.routes.length-1)
				next = data.tc.routes[i+1];
			if (i < data.tc.routes.length-2)
				var next_next = data.tc.routes[i+2];
			var step_cost = '0';
			if (route.type == 'tostop') {
				step_cost = TCcostCalc(route.cost,'walking');
				if (next.type == 'bus')
					step_cost_ = TCcostCalc(next.cost/2.8,'standby');
				else if (next.type == 'tram')
					//step_cost_ = TCcostCalc(next.cost,'standby');
					step_cost_ = TCcostCalc(3,'standby');
			} else if (route.type == 'bus') {
				step_cost = TCcostCalc(route.cost,'bustram');
			} else if (route.type == 'tram') {
				step_cost = TCcostCalc(route.cost,'bustram');
			} else if (route.type == 'stop' && next.type == 'stop' && prev.type == 'bus') {// correspondance au même arrêt
				step_cost = TCcostCalc(next.cost/2.8,'standby');
			} else if (route.type == 'stop' && next.type == 'stop' && prev.type == 'tram') {// correspondance au même arrêt
				//step_cost = TCcostCalc(next.cost,'standby');
				step_cost = TCcostCalc(3,'standby');
			} else if (route.type == 'change' && next_next.type == 'tram') {// correspondance entre deux arrêts
				step_cost = TCcostCalc(next.cost/3,'walking');
			} else if (route.type == 'change' && next_next.type == 'bus') {// correspondance entre deux arrêts
				step_cost = TCcostCalc(next.cost/3,'walking');
			} else if (route.type == 'stop' && prev.type == 'change' && next.type == 'bus') {// fin de correspondance
				step_cost = TCcostCalc(next.cost/2.8,'standby');
			} else if (route.type == 'stop' && prev.type == 'change' && next.type == 'tram') {// fin de correspondance
				//step_cost = TCcostCalc(next.cost,'standby');
				step_cost = TCcostCalc(3,'standby');
			} else if (route.type == 'stop' && next.type == 'toend' && (prev.type == 'bus' || prev.type == 'tram')) { // dernier arrêt vers la fin de la destination
				step_cost = TCcostCalc(next.cost,'walking');
			}
		}
		routing_costs.tc.text = '<strong class="total">± '+humanReadableTime(routing_costs.tc.total_cost)+' </strong> <small>dont '+humanReadableTime(routing_costs.tc.walking_cost)+' de marche et '+humanReadableTime(routing_costs.tc.standby_cost)+' d\'attente.</small>';
		$('#mode_tc').parent().addClass('button_mode');
	} else {
		$('#mode_tc').parent().removeClass('button_mode');
	}

	// pedestrian cost calculus
	if (data.pedestrian != undefined) {
		if (data.pedestrian.layer.features.length>0) {
			routing_costs.pedestrian.cost = 0;
			for (var i in data.pedestrian.layer.features)
				routing_costs.pedestrian.cost += parseFloat(data.pedestrian.layer.features[i].properties.cost);
			routing_costs.pedestrian.cost = Math.ceil(routing_costs.pedestrian.cost);
			routing_costs.pedestrian.text = '<strong class="total">± '+humanReadableTime(routing_costs.pedestrian.cost)+'</strong>';
		}
	}

	// cycle cost calculus
	if (data.cycle != undefined) {
		if (data.cycle.layer.features.length>0) {
/*          // OTP
		    routing_costs.cycle.cost = data.cycle.duration
		    routing_costs.cycle.text = '<strong class="total">± '+humanReadableTime(routing_costs.cycle.cost)+'</strong>';*/
		
			routing_costs.cycle.cost = 0;
			for (var i in data.cycle.layer.features)
				routing_costs.cycle.cost += parseFloat(data.cycle.layer.features[i].properties.cost);
			routing_costs.cycle.cost = Math.ceil(routing_costs.cycle.cost);
			routing_costs.cycle.text = '<strong class="total">± '+humanReadableTime(routing_costs.cycle.cost)+'</strong>';
	    
		}
	}

	// car cost calculus
	if (data.car != undefined) {
		if (data.car.layer.features.length>0) {
			routing_costs.car.cost = 0;
			for (var i in data.car.layer.features)
				routing_costs.car.cost += parseFloat(data.car.layer.features[i].properties.cost);
			routing_costs.car.cost = Math.ceil(routing_costs.car.cost + 8);
			routing_costs.car.text = '<strong class="total">± '+humanReadableTime(routing_costs.car.cost)+'</strong> <small>dont '+humanReadableTime(8)+' de parking.';
		}
	}

	// display result
    $('#routing_loading').hide('fade',500, function() {$('#routing_loading').remove();});

	html = '<h1>Itinéraires proposés</h1><div><strong>Choisissez l\'itinéraire à visualiser.</strong><br><br></div>';
	html += '<ul>';
	if (data.tc.routes.length>1)
		html += '<li class="button_dark button_tc button_popup" id="mode_popup_tc"><a href="#"><span class="label">Transports en commun</span> ⏱ '+routing_costs.tc.text+'</a></li>';
	if (data.pedestrian != undefined) {
		if (data.pedestrian.layer.features.length>0 && routing_costs.pedestrian.cost < 3000)
			html += '<li class="button_dark button_pedestrian button_popup" id="mode_popup_pedestrian"><a href="#"><span class="label">Piéton</span> ⏱ '+routing_costs.pedestrian.text+'<small>&nbsp;</small></a></li>';
	} else {
		$('.button_pedestrian.button_mode').remove();
	}
	if (data.cycle != undefined) {
		if (data.cycle.layer.features.length>0 && routing_costs.cycle.cost < 3000)
			html += '<li class="button_dark button_cycle button_popup" id="mode_popup_cycle"><a href="#"><span class="label">Cycliste</span> ⏱ '+routing_costs.cycle.text+'</a></li>';
	} else {
		$('.button_cycle.button_mode').remove();
	}
	if (data.car != undefined) {
		if (data.car.layer.features.length>0)
			html += '<li class="button_dark button_car button_popup" id="mode_popup_car"><a href="#"><span class="label">Voiture</span> ⏱ '+routing_costs.car.text+'<small>Jusqu\'au double en heure de pointe.</small></a></li>';
	} else {
		$('.button_car.button_mode').remove();
	}
	html += '</ul>';
	html += '<div class="clearfix"><br><strong>Ces calculs sont effectués avec des vitesses estimées et ne tiennent pas compte d\'éventuelles perturbations…<br>Des corrections sont apportées régulièrement.</strong></div>';

//	showPopupModes(html);
	$('.button_mode').show('fade',500);
	$('#mode_'+mode).click();
	$('#routing_time').focus();
	if (mobilemode || widgetmode) {
		mode = 'tc';
		displayRouting();
	}
}
function displayRouting() {
	var data = null;
	if (routings[mode] != undefined)
		data = routings[mode];
	else
		return false;

    var GeoJSON = new OpenLayers.Format.GeoJSON({
  		internalProjection:map.projection,
  		externalProjection:map.displayProjection
    });

	layers.stops.destroyFeatures();
	if (mode == 'tc') {
		layers.stops.addFeatures(GeoJSON.read(data.stops));
	}

    $(layers.transports.div).find('svg g g').attr('filter','');
    layers.transports.destroyFeatures();
    layers.transports.addFeatures(GeoJSON.read(data.layer));
    $(layers.transports.div).find('svg g g').attr('filter','url(#dropshadow)');
    layers.transports.redraw();

    
    if (mode == 'tc')
	    routing.routes = data.routes;

    var html = '';

    var color = 'transparent';

    var features = GeoJSON.read(data.layer);
	if (mode == 'tc')
    	var stops = GeoJSON.read(data.stops);

    html = '<li data-role="list-divider" role="heading" id="route_A" class="chrome_light start"><span class="icon"></span><strong>Départ:</strong><br><small>'+$('#start-add').val()+'';
	if (mode == 'tc') {
		var lastFeat = lastFeatStops = 0;
		for (var i in data.routes) {
			i = parseInt(i);
			var prev, next, next_next;
			prev = next = next_next = {type: null,cost:0};
			if (i != 0)
				prev = data.routes[i-1];
			var route = data.routes[i];
			if (i < data.routes.length-1)
				next = data.routes[i+1];
			if (i < data.routes.length-2)
				next_next = data.routes[i+2];

			routeFeat = [];
			if (route.type != 'stop' && route.type != 'tostop' && route.type != 'change'  && route.type != 'toend') {
				// bus/tram route
				for (var j in features) {
					if (features[j].attributes.ref == route.ref) {
						color = features[j].attributes.color; // get the bus/tram line color
						routeFeat.push(features[j]); // save the features that correspond to this route
						lastFeat = j;
					} else if (routeFeat.length > 0)
						break; // no more feature corresponding to a bus/tram route
				}
			} else {
				// walking route between stops
				for (var j in stops) {
					if (j > lastFeatStops-1 && stops[j].attributes.name == route.ref) {
						routeFeat.push(stops[j]);
						lastFeatStops = j;
					} else if (routeFeat.length > 0)
						break;
				}
			}
			routing.routes[i].features = routeFeat;

			var cssBorder = 'top';
			if (mobilemode) cssBorder = 'left';

			var step_cost = '0';
			if (route.type == 'tostop' || i==0) {
				step_cost = TCcostCalc(route.cost,'walking',true,false);
				if (next_next.type == 'bus') {
					step_cost_ = TCcostCalc(next.cost/2.8,'standby',true,false);
				} else if (next_next.type == 'tram') {
					//step_cost_ = TCcostCalc(next.cost,'standby',true);
					step_cost_ = TCcostCalc(3,'standby',true,false);
				}
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="walk"></span><span class="fillhalf">……………………………………………………………………………………………………</span><span class="mean stop" title="Arrêt"></span><span class="fillhalf">……………………………………………………………………………………………………</span><span class="mean standby"><br></span><span class="walktime">'+step_cost+'</span><span class="linecenter">'+route.ref+'</span><span class="standbyright">'+step_cost_+'</span></span><span class="visuallyhidden"<br>'+step_cost+' de marche<br>et '+step_cost_+' d\'attente</span><br><small>Marcher jusqu\'à l\'arrêt '+route.ref;

			} else if (route.type == 'bus') {
				step_cost = TCcostCalc(route.cost,'bustram',true);
				html += '</small></li><li id="route_'+i+'" class="chrome_light bus" style="border-'+cssBorder+'-color:'+color+';"><span class="icons"><span class="mean bus" title="Bus"></span><span class="line_text">'+route.ref+'</span> (dir. '+route.target+')<br></span>'+step_cost+'<br><small>Prendre le bus '+route.ref+' (dir. '+route.target+')';

			} else if (route.type == 'tram') {
				step_cost = TCcostCalc(route.cost,'bustram',true);
				html += '</small></li><li id="route_'+i+'" class="chrome_light bus" style="border-'+cssBorder+'-color:'+color+';"><span class="icons"><span class="mean tram" title="Tram"></span><span class="line_text">'+route.ref+'</span> (dir. '+route.target+')<br></span>'+step_cost+'<br><small>Prendre le tram L'+route.ref+' (dir. '+route.target+')';

			} else if (route.type == 'stop' && next.type == 'stop' && prev.type == 'bus') {// correspondance au même arrêt
				step_cost = TCcostCalc(next.cost/2.8,'standby',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="mean standby"></span><br><span class="lineleft">'+route.ref+'</span><br></span>'+step_cost+'<br><small>Descendre à l\'arrêt '+route.ref+'<br>Attendre le bus '+next_next.ref+' (dir. '+next_next.target+')';

			} else if (route.type == 'stop' && next.type == 'stop' && prev.type == 'tram') {// correspondance au même arrêt
				//step_cost = TCcostCalc(next.cost,'standby',true);
				step_cost = TCcostCalc(3,'standby',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="mean standby"></span><br><span class="lineleft">'+route.ref+'</span><br></span>'+step_cost+'<br><small>Descendre à l\'arrêt '+route.ref+'<br>Attendre le tram L'+next_next.ref+' (dir. '+next_next.target+')';

			} else if (route.type == 'change' && next_next.type == 'tram') {// correspondance entre deux arrêts
				step_cost = TCcostCalc(next.cost/3,'walking',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="walk"></span><br><span class="lineleft">'+prev.ref+'</span><span class="walktimeright">'+step_cost+'</span><br></span><small>Descendre à l\'arrêt '+prev.ref+' et marcher jusqu\'à l\'arrêt '+next.ref+' du tram L'+next_next.ref+' (dir. '+next_next.target+')';

			} else if (route.type == 'change' && next_next.type == 'bus') {// correspondance entre deux arrêts
				step_cost = TCcostCalc(next.cost/3,'walking',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="walk"></span><br><span class="lineleft">'+prev.ref+'</span><span class="walktimeright">'+step_cost+'</span><br></span><small>Descendre à l\'arrêt '+prev.ref+' et marcher jusqu\'à l\'arrêt '+next.ref+' du bus '+next_next.ref+' (dir. '+next_next.target+')';

			} else if (route.type == 'stop' && prev.type == 'change' && next.type == 'bus' && i>1) {// fin de correspondance
				step_cost = TCcostCalc(next.cost/2.8,'standby',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="mean standby"></span><br><span class="lineleft">'+route.ref+'</span><span class="walktimeright">'+step_cost+'</span><br></span><small>Attendre le bus '+next.ref+' (dir. '+next.target+')';

			} else if (route.type == 'stop' && prev.type == 'change' && next.type == 'tram' && i>1) {// fin de correspondance
				//step_cost = TCcostCalc(next.cost,'standby',true);
				step_cost = TCcostCalc(3,'standby',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="mean standby"></span><br><span class="lineleft">'+route.ref+'</span><span class="walktimeright">'+step_cost+'</span><br></span><small>Attendre le tram L'+next.ref+' (dir. '+next.target+')';

			} else if (route.type == 'stop' && next.type == 'toend' && (prev.type == 'bus' || prev.type == 'tram')) { // dernier arrêt vers la fin de la destination
				step_cost = TCcostCalc(next.cost,'walking',true,false);
				html += '</small></li><li id="route_'+i+'" class="chrome_light walk-to-stop"><span class="icons"><span class="mean stop" title="Arrêt"></span><span class="fill">……………………………………………………………………………………………………</span><span class="walk"></span><br><span class="lineleft">'+route.ref+'</span><span class="walktimeright">'+step_cost+'</span><br></span><small>Descendre à l\'arrêt '+route.ref+' et marcher jusqu\'à votre destination.';
			}
		}
		$('#routing_time').html('<strong>Durée estimée:</strong> '+routing_costs.tc.text);
	} else if (mode == 'pedestrian') {
		html += '</small></li><li id="route_'+i+'" class="chrome_light pedestrian"><span class="icons"><span class="walk"></span></span><br>± '+humanReadableTime(routing_costs[mode].cost)+'<br><small>Marcher jusqu\'à votre destination.';
   		$('#routing_time').html('<strong>Durée estimée:</strong> '+routing_costs[mode].text);
	} else if (mode == 'cycle') {
		html += '</small></li><li id="route_'+i+'" class="chrome_light cycle"><span class="icons"><span class="cycle"></span></span><br>± '+humanReadableTime(routing_costs[mode].cost)+'<br><small>Pédaler jusqu\'à votre destination.';
   		$('#routing_time').html('<strong>Durée estimée:</strong> '+routing_costs[mode].text);
	} else if (mode == 'car') {
		html += '</small></li><li id="route_'+i+'" class="chrome_light car"><span class="icons"><span class="car"></span></span><br>± '+humanReadableTime(routing_costs[mode].cost)+'<br><small>Rouler jusqu\'à votre destination.<br><br>Ce temps peut doubler en heure de pointe.';
   		$('#routing_time').html('<strong>Durée estimée:</strong> '+routing_costs[mode].text);
	}
    html += '</li><li data-role="list-divider" role="heading" id="route_'+i+'" class="chrome_light end ui-li-divider ui-bar-b"><span class="icon"></span><strong>Arrivée:</strong><br><small>'+$('#end-add').val()+'</small></li>';
	if (!mobilemode) {
		html = '<ul>'+html+'</ul>';
		$('#routing').html(html);
		$('#routing').show('fade',500);
		$('#routing_time').show('fade',500);
	} else {
		try {
			$('#routing-mobile').html(html);
			$('#routing-mobile').listview('refresh');
		} catch (e) {
			window.setTimeout(function(){
				$('#routing-mobile').html(html);
				$('#routing-mobile').listview('refresh');
			},500);
		}
	}
    if (!mobilemode) {
    	var w = 0;
    	$('#routing ul li').each(function(i) {
    		w += $(this).outerWidth();
    	});
		$('#routing ul').width(w);
	} else {
		$.mobile.hidePageLoadingMsg();
	}
	//if (zoomTo) zoomToRoute();
	setPermalink();

	routing_displayed = true;
}


function zoomToRoute() {
	var mBounds = map.getExtent();
	var bounds = layers.positions.getDataExtent();
	bounds.extend = layers.transports.getDataExtent();
	bounds.extend = layers.stops.getDataExtent();
//	if (!mBounds.containsBounds(bounds))
		map.zoomToExtent(bounds);
}
function poiBubble(feat) {
    var layer = (feat.attributes.location !== undefined) ? 'location' : 'pois';
	var html = '<div>';
	html = '<h1>'+feat.attributes.name+'</h1>'
	html += '<p>';
	html += feat.attributes.metadatas.address;
	if (feat.attributes.metadatas.phone.length) {
	    for (var i in feat.attributes.metadatas.phone) {
		    if (!mobilemode)
			    html += '<br>Tel:&nbsp;'+feat.attributes.metadatas.phone[i];
		    else
			    html += '<br>Tel:&nbsp;<a href="tel:'+feat.attributes.metadatas.phone[i]+'">'+feat.attributes.metadatas.phone[i]+'</a>';
	    }
    }
	if (feat.attributes.metadatas.website && feat.attributes.metadatas.website!='')
		html += '<br><a href="http://'+feat.attributes.metadatas.website+'" target="_blank">Site Web: '+feat.attributes.metadatas.website+'</a>';
	if (feat.attributes.metadatas.QUARTIER && feat.attributes.metadatas.QUARTIER!='')
		html += '<br>Quartier&nbsp;:&nbsp;'+feat.attributes.metadatas.QUARTIER_LIBELLE;
	html += '</p>';
	html += '<h2>Choisir comme:</h2>';
//	html += '<p class="startend">';
//	html += '<a href="#" onclick="layers.'+layer+'.setPoiAsStartEnd(\'start\'); return false;"><img src="'+boussoleurl+'images/start.png" height="12px"> Point de départ</a> – <a href="#" onclick="layers.'+layer+'.setPoiAsStartEnd(\'end\'); return false;"><img src="'+boussoleurl+'images/end.png" height="12px"> Point d\'arrivée</a>';
//	html += '</p>';
	html += '</div>';
	var ll = map.getPixelFromLonLat(feat.geometry.getBounds().getCenterLonLat());
	if (layer == 'location') {
	    ll.x = ll.x+50;
	    ll.y = ll.y+8;
	} else {
	    ll.x = ll.x+33;
	    ll.y = ll.y-14;
	}
	ll = map.getLonLatFromPixel(ll);
	var popup = new OpenLayers.Popup.FramedCloud(
		"pois-popup",
		ll,
		new OpenLayers.Size(250,130),
		html,
		null,
		true,
		function(){
			layers.pois.events.triggerEvent("featureunselected", {feature: feat});
		}
	);
	popup.maxSize = new OpenLayers.Size(250,200);
	popup.panMapIfOutOfView = true;
	popup.calculateRelativePosition = function () {
		return 'tr';
	}
	popup.autoSize = false;
	try { selectPOIOnList('#poi_'+feat.attributes.id); } catch(e) {}
	return popup;
}

function customBubble(feat,layer) {
    if(layer == undefined) layer = 'pois';
	var title = feat.attributes.name;
	var content = feat.attributes.metadatas.comment;
	if (feat.attributes.metadatas.moreinformations !== undefined) 
	    content += '<br><a href="'+feat.attributes.metadatas.moreinformations+'" target="_blank">Plus d\'informations…</a>'
	
	var html = '<div id="genericBubble">';
	html = '<h1>'+title+'</h1>'
	html += '<p class="content">';
	html += content;
	html += '</p>';
	html += '<h2>Choisir comme :</h2>';
//	html += '<p class="startend">';
//	html += '<a href="#" onclick="layers.'+layer+'.setPoiAsStartEnd(\'start\'); return false;"><img src="'+boussoleurl+'images/start.png" height="12px"> Point de départ</a> – <a href="#" onclick="layers.'+layer+'.setPoiAsStartEnd(\'end\'); return false;"><img src="'+boussoleurl+'images/end.png" height="12px"> Point d\'arrivée</a>';
//	html += '</p>';
	html += '</div>';
	var ll = map.getPixelFromLonLat(feat.geometry.getBounds().getCenterLonLat());
	    ll.x = ll.x+33;
	    ll.y = ll.y-14;
	ll = map.getLonLatFromPixel(ll);
	var popup = new OpenLayers.Popup.FramedCloud(
		"generic-popup",
		ll,
		new OpenLayers.Size(250,130),
		html,
		null,
		true,
		function(){
			layers[layer].events.triggerEvent("featureunselected", {feature: feat});
		}
	);
	popup.maxSize = new OpenLayers.Size(250,200);
	popup.panMapIfOutOfView = true;
	popup.calculateRelativePosition = function () {
		return 'tr';
	}
	popup.autoSize = false;
	if (feat.attributes.metadatas.serviceType !== undefined) {
	    switch (feat.attributes.metadatas.serviceType) {
	        case 'bike':getBikeAvail(feat);break;
	        case 'car':getCarAvail(feat);break;
	    }
	}
	return popup;
}
function getBikeAvail(aFeat) {
   var url = boussoleurl+'api/'+boussoleAPIKey+'/getBikeCarAvail/?domain='+window.location.host+'&service=bike';
    for (var i in aFeat.attributes.metadatas.availParams) {
        url += '&'+i+'='+aFeat.attributes.metadatas.availParams[i];
    }
    url += '&callback=?'
	$('#bikeAvail').remove();
    $.get(
        url,
        function(data) {
	        if (data.status == 'ok') {
	            if (data.avail > 0) {
	                var message = data.avail;
	                if (data.avail > 1) 
	                    message += ' vélos disponibles et ';
	                else
	                    message += ' vélo disponible et ';
	                if (data.free == 0)
	                    message += 'aucune place libre';
	                else if (data.free < 2 )
	                    message += data.free + ' place libre';
	                else if (data.free > 1 )
	                    message += data.free + ' places libres';
        			$('#bikeAvail').remove();
		            $('#generic-popup .content').append('<span id="bikeAvail"><br><strong>' + message + '.</strong></span>');
		        } else {
        			$('#bikeAvail').remove();
		            $('#generic-popup .content').append('<span id="bikeAvail"><br><strong style="color:#d00">Aucun vélo disponible.</strong></span>');
		        }
		        if (data.cb) $('#bikeAvail').append('<br>Paiement en carte bancaire possible à cette station');
	        } else {
                $('#bikeAvail').remove();
	            $('#generic-popup .content').append('<span id="bikeAvail"><br>Aucune information de disponibilité.</span>');
	        }
        },
        'json'
    );
}
function getCarAvail(aFeat) {
    var url = boussoleurl+'api/'+boussoleAPIKey+'/getBikeCarAvail/?domain='+window.location.host+'&service=car';
    for (var i in aFeat.attributes.availParams) {
        url += '&'+i+'='+aFeat.attributes.availParams[i];
    }
    url += '&callback=?'
	$('#carAvail').remove();
    $.get(
        url,
        function(data) {
	        if (data.status == 'ok') {
	            if (data.avail > 0) {
	                var message = data.avail;
	                if (data.avail > 1) 
	                    message += ' véhicules disponibles et ';
	                else
	                    message += ' véhicules disponible et ';
	                if (data.free == 0)
	                    message += 'aucune place libre.';
	                if (data.free < 2 )
	                    message += data.free + ' place libre';
	                if (data.free > 1 )
	                    message += data.free + ' places libres';
        			$('#carAvail').remove();
		            $('#generic-popup .content').append('<span id="carAvail"><br><strong>' + message + '.</strong></span>');
		        } else {
        			$('#carAvail').remove();
		            $('#generic-popup .content').append('<span id="carAvail"><br><strong style="color:#d00">Aucun vélo disponible.</strong></span>');
		        }
	        } else {
                $('#carAvail').remove();
	            $('#generic-popup .content').append('<span id="carAvail"><br>Aucune information de disponibilité.</span>');
	        }
        },
        'json'
    );
}
function PTStopsBubble(feat) {
	// prepare datas
	var stop_name = (feat.cluster) ? feat.cluster[0].attributes.name : feat.attributes.name;
	var feature_type = 'Arrêt';
	var feature_count = 1;
	if (feat.cluster && feat.attributes.count > 1) {
		feature_type = 'Arrêts (' + feat.attributes.count + ')';
		feature_count = feat.attributes.count;
	}
	var lines = {};
	if (feat.cluster) {
		for (var i = 0; i < feat.cluster.length; i++) {
			for (var j = 0; j < feat.cluster[i].attributes.lines.length; j++) {
				if (!lines[feat.cluster[i].attributes.lines[j]]) {
					lines[feat.cluster[i].attributes.lines[j]] = feat.cluster[i].attributes.lines_labels[feat.cluster[i].attributes.lines[j]];
				}
			}
		}
	} else {
		for (var j = 0; j < feat.attributes.lines.length; j++) {
			if (lines[feat.attributes.lines[j]]) {
				lines[feat.attributes.lines[j]] = feat.attributes.lines_labels[feat.attributes.lines[j]];
			}
		}
	}
	var lines_html = '';
	for (line in lines) {
		lines_html += '<p><div class="bullet" style="background-color:' + $('#pt_line_display_all_' + line).data('color') + '"></div> ';
		if ($('#pt_line_display_all_' + line).hasClass('active'))
			lines_html += '<strong>' + lines[line] + '</strong>';
		else
			lines_html += '<a href="#' + line + '" onclick="$(\'#public_transport_' + line + '\').click(); return false;" class="strong">' + lines[line] + '</a>';
		if (!$('#public_transport_' + line).hasClass('active'))
			lines_html += '<span> – <a href="#' + line + '" onclick="$(\'#public_transport_' + line + '\').click(); $(this).parent().remove(); return false;">Afficher</a></span>';
		lines_html += '</p>';
	}

	// design popup content
	var html = '<div>';
	html = '<h1>' + feature_type + ' «' + stop_name + '»</h1>';
	if (feature_count > 1)
		html += '<p style="font-size: 1.2em;"><a href="#" onclick="layers.pt_stops.zoomOnFeature(); return false;"><span class="texticon" data-c="Á"></span> Zoomer sur la zone</a></p>';

	if (Object.keys(lines).length > 1) {
		if (feature_count == 1)
			html += '<h2> Lignes en correspondance à cet arrêt :</h2>';
		else
			html += '<h2> Lignes en correspondance à ces arrêts :</h2>';
	} else {
		if (feature_count == 1)
			html += '<h2> Ligne desservant cet arrêt :</h2>';
		else
			html += '<h2> Ligne desservant ces arrêts :</h2>';
	}
	html += lines_html;


/*	html += '<h2>Choisir comme :</h2>';
	html += '<p class="startend">';
	html += '<a href="#" onclick="layers.pois.setPoiAsStartEnd(\'start\'); return false;"><img src="images/start.png" height="12px"> Point de départ</a> – <a href="#" onclick="layers.pois.setPoiAsStartEnd(\'end\'); return false;"><img src="images/end.png" height="12px"> Point d\'arrivée</a>';
	html += '</p>';
*/	html += '</div>';
	var ll = map.getPixelFromLonLat(feat.geometry.getBounds().getCenterLonLat());
	ll.x = ll.x+33;
	ll.y = ll.y+8;
	ll = map.getLonLatFromPixel(ll);
	var popup = new OpenLayers.Popup.FramedCloud(
		"pt_stops-popup",
		ll,
		new OpenLayers.Size(250,130),
		html,
		null,
		true,
		function(){
			layers.pt_stops.events.triggerEvent("featureunselected", {feature: feat});
		}
	);
	popup.maxSize = new OpenLayers.Size(250,200);
	popup.panMapIfOutOfView = true;
	popup.calculateRelativePosition = function () {
		return 'tr';
	}
	popup.autoSize = false;
//	try { selectPOIOnList('#poi_'+feat.attributes.Id); } catch(e) {}
	return popup;
}

function getMapUrl() {
	try {
		var parameters = {};
		parameters.activepoi = [];
		for (var i in layers.pois.selectedFeatures)
			parameters.activepoi.push(layers.pois.selectedFeatures[i].attributes.Id);

		parameters.activecats = [];
		$('#categories li.active:not(.root) > a').each(function(){
			parameters.activecats.push(Number($(this).attr('href').split('#')[1]));
		});

		parameters.zoom = map.getZoom();

		parameters.center = {};
		var point = map.getCenter();
		//point.transform(map.projection,map.displayProjection);
		parameters.center.lon = point.lon;
		parameters.center.lat = point.lat;

		parameters.start = {};
		var point = features.start.clone();
		point.geometry.transform(map.projection,map.displayProjection);
		parameters.start.x = point.geometry.x;
		parameters.start.y = point.geometry.y;
		parameters.start.address = $('#start-add').val();

		parameters.end = {};
		var point = features.end.clone();
		point.geometry.transform(map.projection,map.displayProjection);
		parameters.end.x = point.geometry.x;
		parameters.end.y = point.geometry.y;
		parameters.end.address = $('#end-add').val();

		return encodeURIComponent(URLON.stringify(parameters));
	} catch (e) {
		return '';
	}
}
function setPermalink() {
	permalink = window.location.protocol + '//'+ window.location.host + window.location.pathname + '?p='+getMapUrl();
}
function parseMapUrl() {
	try{return URLON.parse(decodeURIComponent(getUrlParam('p')))} catch(e) {return null;}
}

(function($){

    /* autocomplete */
	if (!mobilemode) {
		var cache = {}, lastXhr;
		$( '#start-add, #end-add' ).catcomplete({
			minLength: 2,
			source: function( request, response ) {
	//			request.term = request.term.replace(/^(\d* *)/,'');
				request.term = request.term.replace(/([,\-'])/,' ');
				request.term = request.term.replace(/( {2,})/,' ');
				request.term = request.term.replace(/([éèêë])/,'e');
				request.term = request.term.replace(/([îï])/,'i');
				request.term = request.term.replace(/([ôö])/,'o');
				request.term = request.term.replace(/([àâ])/,'a');
				request.term = request.term.replace(/([ç])/,'c');
				if ( request.term in cache ) {
					$( "#start-add, #end-add" ).removeClass('autocompleting');
					if (cache[request.term].length == 0)
						error('Cette adresse est introuvable…')
					response(cache[request.term] );
					return;
				}

				lastXhr = $.getJSON(
					boussoleurl+'api/'+boussoleAPIKey+'/streets/?domain='+window.location.host+'&callback=?',
					request,
					function(data, status, xhr ) {
						$( "#start-add, #end-add" ).removeClass('autocompleting');
						if (data.length == 0)
							error('Cette adresse est introuvable…')
						cache[request.term] = data;
						if (xhr === lastXhr)
							response(data);
					}
				);
			},
			search: function(event,ui) {
				$(this).addClass('autocompleting');
			},
			select: function(event,ui) {
				if (client.tuio) hideVKeyboard();
				if (ui.item.number !== undefined) {
					$(this).data('coords',ui.item.coords);
					if ($(this).attr('id')=='start-add')
						$('#end-add').focus().select();
					else
						go();
				} else {
					$(this).catcomplete('search',ui.item.label);
				}
			},
			focus: function( event, ui ) {
	//			$(this).val( ui.item.label );
	//			return false;
			}
		});
	}

	$('#address-go').click(function(){
		go();
		if (mobilemode) $('#btn_map').click();
	});
	$('#switch').click(function() {
		//layers.positions.setVisibility(false);
		var startPt = features.start.geometry.clone();
		var startVal = $('#start-add').val();
		var endPt = features.end.geometry.clone();
		var endVal = $('#end-add').val();
		features.start.geometry.x = endPt.x;
		features.start.geometry.y = endPt.y;
		features.start.geometry.bounds = null;
		$('#start-add').val(endVal);
		features.end.geometry.x = startPt.x;
		features.end.geometry.y = startPt.y;
		features.end.geometry.bounds = null;
		$('#end-add').val(startVal);
		//layers.positions.setVisibility(true);
		layers.positions.redraw();
		if (!mobilemode) getRouting(false);
	});

	go = function () {
	    if (client.tuio) hideVKeyboard();
		if (!mobilemode) {
			if ($('#popup_modes').is(':visible'))
				$('#popup_modes').hide('fade',500);
			$('#routing *:visible').hide('fade',500,function(){
				$('#routing_loading').remove();
				$('#routing').append('<div id="routing_loading">Géolocalisation…</div>');
			});
			$('#routing_time:visible').hide('fade',500);
			$('#routing_loading:visible').show('fade',500);
			$('.button_mode:visible').hide('fade',500);

			$('.address_input.selected').removeClass('selected');
		} else if (!widgetmode) {
			$('#routing_time').html('Calcul en cours…');
			$('#routing-mobile').html('<li></li>');
			$.mobile.showPageLoadingMsg("c", "Calcul en cours", false);
		} else {
			$('#routing *:visible').hide('fade',500,function(){
				$('#routing_loading').remove();
				$('#routing').append('<div id="routing_loading">Géolocalisation…</div>');
			});
			$('#routing_time:visible').hide('fade',500);
			$('#routing_loading:visible').show('fade',500);
		}
		var startCoords = $('#start-add').data('coords');
		var endCoords = $('#end-add').data('coords');
		if ( typeof startCoords != 'object' ) {
			var address = $('#start-add').val();
			if (address == '') {
				error ('Vous devez spécifier une adresse de départ ou positionner le marqueur A sur la carte.');
				if (!mobilemode) {
					$('#routing_time').show('clip',500);
					$('#routing_loading').remove();
					$('#routing *').show('fade',500);
					$('.button_mode').show('fade',500);
				}
				return false;
			}
			$.get(
				boussoleurl+'api/'+boussoleAPIKey+'/geocoder/?domain='+window.location.host+'&callback=?',
				{'getLatLonFromAddress':address},
				function(data) {
					if (data.data.status == 'ok') {
						startCoords = [data.data.lng,data.data.lat];
						$('#start-add').data('coords',startCoords);
						if ( typeof endCoords != 'object' ) {
							var address = $('#end-add').val();
							if (address == '') {
								error ('Vous devez spécifier une adresse de d\'arrivée ou positionner le marqueur B sur la carte.');
								if (!mobilemode) {
									$('#routing_time').show('clip',500);
									$('#routing_loading').remove();
									$('#routing *').show('fade',500);
									$('.button_mode').show('fade',500);
								}
								return false;
							}
							$.get(
								boussoleurl+'api/'+boussoleAPIKey+'/geocoder/?domain='+window.location.host+'&callback=?',
								{'getLatLonFromAddress':address},
								function(data) {
									if (data.data.status == 'ok') {
										endCoords = [data.data.lng,data.data.lat];
										$('#end-add').data('coords',endCoords);
										go2(startCoords,endCoords);
									} else {
										error('Boussole n\'a pas pu trouver votre point de d\'arrivée. Positionnez-le à l\'aide du marqueur B directement sur la carte ou corrigez l\'adresse.');
										if (!mobilemode) {
											$('#routing_time').show('clip',500);
											$('#routing_loading').remove();
											$('#routing *').show('fade',500);
											$('.button_mode').show('fade',500);
										}
									}
								},
								'json'
							);
						}
					} else {
						error('Boussole n\'a pas pu trouver votre point de départ. Positionnez-le à l\'aide du marqueur A directement sur la carte ou corrigez l\'adresse.');
						if (!mobilemode) {
							$('#routing_time').show('clip',500);
							$('#routing_loading').remove();
							$('#routing *').show('fade',500);
							$('.button_mode').show('fade',500);
						}
					}
				},
				'json'
			);
		} else if ( typeof endCoords != 'object' ) {
			var address = $('#end-add').val();
			if (address == '') {
				error ('Vous devez spécifier une adresse de d\'arrivée ou positionner le marqueur B sur la carte.');
				if (!mobilemode) {
					$('#routing_time').show('clip',500);
					$('#routing_loading').remove();
					$('#routing *').show('fade',500);
					$('.button_mode').show('fade',500);
				}
				return false;
			}
			$.get(
				boussoleurl+'api/'+boussoleAPIKey+'/geocoder/?domain='+window.location.host+'&callback=?',
				{'getLatLonFromAddress':address},
				function(data) {
					if (data.data.status == 'ok') {
						endCoords = [data.data.lng,data.data.lat];
						go2(startCoords,endCoords);
					} else {
						error('Boussole n\'a pas pu trouver votre point de d\'arrivée. Positionnez-le à l\'aide du marqueur B directement sur la carte ou corrigez l\'adresse.');
						if (!mobilemode) {
							$('#routing_time').show('clip',500);
							$('#routing_loading').remove();
							$('#routing *').show('fade',500);
							$('.button_mode').show('fade',500);
						}
					}
				},
				'json'
			);
		} else {
			go2(startCoords,endCoords);
			return false;
		}
	};
	var go2 = function(startCoords,endCoords) {
		var pt = new OpenLayers.Geometry.Point(Number(startCoords[0]),Number(startCoords[1]));
		pt = pt.transform(map.displayProjection,map.projection)
		features.start.geometry.x = pt.x;
		features.start.geometry.y = pt.y;
		features.start.geometry.bounds = null;

		pt = new OpenLayers.Geometry.Point(Number(endCoords[0]),Number(endCoords[1]));
		pt = pt.transform(map.displayProjection,map.projection)
		features.end.geometry.x = pt.x;
		features.end.geometry.y = pt.y;
		features.end.geometry.bounds = null;

		layers.positions.redraw();
		getRouting();
	};

	/**************************************************************************/
	/* permlink handling */
	function handlePermalink() {
		var p = parseMapUrl();
		if (window.boussoleParameters == undefined) window.boussoleParameters = {};
		if (boussoleCallback == undefined) {
			if (!mobilemode && !widgetmode)
				boussoleCallback = function(){ $('#cat_poi_8').parent().click(); $('#category_container_s_handler').dblclick();}
			else
				var boussoleCallback = function() {};
		}
		
        client = {tuio: false, noLinks: false, location: false};
		if (getUrlParam('tuio') !== false) { client.tuio = true; }
		if (getUrlParam('noLinks') !== false) { client.noLinks = true; }
		if (getUrlParam('location') !== false) { client.location = getUrlParam('location'); }

	    if (p == null)
	        var p = {client: client};
	    else
	        p.client = client;

		if (p == null)
			try {
				initMap(window.boussoleParameters,boussoleCallback);
			} catch (e) {
				window.setTimeout(handlePermalink,100);
			}
		else {
			var callbacks = [];
			// TODO delete those two lines when changed
			if (getUrlParam('p') == '_client_tuio%3Atrue%26noLinks%3Atrue')
			    p.client = {tuio: true, noLinks: true, location: 'hotel_de_ville_mtp'};
			
			// special parameters
			if (p.client.tuio) {
			    // special configuration for tuio devices
				client.tuio = true;
				window.boussoleParameters.touch = true;
				$('body').addClass('touch');
				$('body :not(input[type="text"], textarea)')
				    .css('-webkit-user-select','none')
				    .css('-khtml-user-select','none')
				    .css('-moz-user-select','none')
				    .css('-ms-user-select','none')
				    .css('-o-user-select','none')
				    .css('user-select','none')
				;
				$('#map_permalink').parent().removeClass('button_link button_simple').addClass('button_dark button_textual');
				$('#map_permalink').removeClass('ir').html('Tapez ici pour continuer sur votre mobile');
			}
			if (p.client.noLinks) {
			    // configuration in order to deactivate links, for example, in public signage / kiosks
				client.noLinks = true;
				$('body').addClass('noLinks');
				window.setTimeout(function() {
				    $('a.nolinks')
					    .removeAttr('href')
					    .css({
						    cursor: 'default',
						    fontWeight: 'bold'
					    })
				    ;
			    },1000);
			}
			if (p.client.location !== false) {
			    switch (p.client.location) {
			        case 'hotel_de_ville_mtp': 
			            window.boussoleParameters.location = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"Selection":0,"location":1,"name":"Hôtel de Ville","lat":"43.59888401337846","lng":"3.896710524674086","tags":["specal"],"address":"1 Place Georges Frêche<br>34267 Montpellier Cedex 2","phones":["04 67 34 70 00"],"website":"http://montpellier.fr","Id":"1","icon":"'+boussoleurl+'images/vousetesici.png"},"geometry":{"type":"Point","coordinates":["3.896710524674086","43.59888401337846"]}}]}';
			            break;
			        case 'ot_mtp': 
			            window.boussoleParameters.location = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"Selection":0,"location":1,"name":"Office du tourisme","lat":"43.60943456303781","lng":"3.8813474171074485","tags":["specal"],"address":"30 Allée Jean de Lattre de Tassigny<br>34000 Montpellier","phones":["+33 467 60 60 60"],"website":"http://ot-montpellier.fr","Id":"1","icon":"'+boussoleurl+'images/vousetesici.png"},"geometry":{"type":"Point","coordinates":["3.8813474171074485","43.60943456303781"]}}]}';
			            break;
			        case 'bu_univ_mtp2': 
			            window.boussoleParameters.location = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"Selection":0,"location":1,"name":"BU Université des Sciences du Languedoc - Université de Montpellier II","lat":"43.63137","lng":"3.86483","tags":["specal"],"address":"2 Place Eugène Bataillon<br>34095 Montpellier Cedex 5","phones":["04 67 14 30 30"],"website":"http://www.univ-montp2.fr","Id":"1","icon":"'+boussoleurl+'images/vousetesici.png"},"geometry":{"type":"Point","coordinates":["3.86483","43.63137"]}}]}';
			            break;
			        case 'mandarine_antigone_assos': 
			            window.boussoleParameters.location = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"Selection":0,"location":1,"name":"Stand de Mandarine","lat":"43.607719","lng":"3.891562","tags":["specal"],"address":"Place de Thessalie<br>34000 Montpellier","phones":[],"website":"http://www.mandarinepressee.net","Id":"1","icon":"'+boussoleurl+'images/vousetesici.png"},"geometry":{"type":"Point","coordinates":["3.891562","43.607719"]}}]}';
			            break;
			    }
			}
			
			if (window.boussoleParameters == undefined) window.boussoleParameters = {};
			if (window.boussoleParameters.positions == undefined) window.boussoleParameters.positions = {};
			if (window.boussoleParameters.positions.start == undefined) window.boussoleParameters.positions.start = {};
			if (p.start != undefined) {
				if (p.start.x != undefined && p.start.y != undefined && p.start.address != undefined) {
					window.boussoleParameters.positions.start.lonlat = [p.start.x, p.start.y];
					window.boussoleParameters.positions.start.address = p.start.address;
				}
			}
			if (window.boussoleParameters.positions.end == undefined) window.boussoleParameters.positions.end = {};
			if (p.end != undefined) {
				if (p.end.x != undefined && p.end.y != undefined && p.end.address != undefined) {
					window.boussoleParameters.positions.end.lonlat = [p.end.x, p.end.y];
					window.boussoleParameters.positions.end.address = p.end.address;
				}
			}
			if (p.zoom != undefined) {
				window.boussoleParameters.zoom = p.zoom;
	//    		callbacks.push('map.zoomTo('+p.zoom+');');
			}
			if (p.center != undefined) {
					callbacks.push('map.setCenter(new OpenLayers.LonLat('+p.center.lon+','+p.center.lat+'));');
			}
			if (p.activecats != undefined) {
				var cats = '';
				for (var i in p.activecats) {
					if (cats != '') cats += ', #cat_poi_';
					cats += p.activecats[i];
				}
				callbacks.push('$(\'#cat_poi_'+cats+'\').parent().click(); $(\'#category_container_s_handler\').dblclick();');
			} /*else { // DEPRECATED
				//clic auto sur les maisons pour tous
				callbacks.push('$(\'#cat_poi_8\').click(); $(\'#category_container_s_handler\').dblclick();');
			}*/
			if (p.activepoi != undefined) {
				callbacks.push('for (var i in p.activepoi) { for (var j in layers.pois.features) { if (layers.pois.features[j].attributes.Id == p.activepoi[i]) { layers.pois.events.triggerEvent(\'featureselected\', {feature: layers.pois.features[j]});}}}');
			}
			if (p.showabout != undefined) {
				callbacks.push('$(\'#about\').show();');
			}
			callbacks.reverse();
			var boussoleCallback = function() {
				for (var i in callbacks)
					eval(callbacks[i]);
			}

			try {
				initMap(window.boussoleParameters,boussoleCallback);
			} catch (e) {
				window.setTimeout(handlePermalink,100);
			}
		}
	}
	handlePermalink();
	// add the shadow SVG filter for route line on map
    $('body').prepend('<svg id="filters">'+
        '    <filter id="dropshadow" width="500%" height="500%">' +
        '        <feOffset result="offOut" in="SourceAlpha" dx="3" dy="3"/>' +
        '        <feGaussianBlur result="blurOut" in="offOut" stdDeviation="3"/>' +
        '        <feBlend in="SourceGraphic" in2="blurOut" mode="normal"/>'+
        '</filter></svg>');
})(jQuery);

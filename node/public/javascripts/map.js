var curTileSrv = -1;
OpenLayers.IMAGE_RELOAD_ATTEMPTS = 15;
function initMap(params,callback) {
	if (params == undefined) var params = {};

	parameters = params;

	/* Set defaults ***********************************************************/

	// general actions
//	if (parameters.displayPOIs == undefined) parameters.displayPOIs = false; // DEPRECATED
	if (parameters.displayCats == undefined) parameters.displayCats = false;
	if (parameters.cleanPOIs == undefined) parameters.cleanPOIs = false;
	if (parameters.setupRoute == undefined) parameters.setupRoute = true;

	// initial bounds and locality
	if (parameters.bounds == undefined) parameters.bounds = [3.75,43.545,4,43.68];
	if (parameters.locality == undefined) parameters.locality = 'montpellier';

	// initial Zoom
	if (parameters.zoom == undefined) parameters.zoom = 13;

	// tiles
	if (parameters.tiles == undefined) parameters.tiles = {};
	if (parameters.tiles.provider == undefined) parameters.tiles.provider = 'cloudmade';

	if (parameters.tiles.provider == 'cloudmade') {
//		if (parameters.tiles.attribution == undefined) parameters.tiles.attribution = 'Fonds de cartes et données fournis par <a href="http://cloudmade.com" target="_blank">Cloudmade</a>, <a href="http://www.openstreetmap.org" target="_blank">OpenStreetMap</a> et ses contributeurs sous licence <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
		if (parameters.tiles.cloudmade == undefined) parameters.tiles.cloudmade = {};
		if (parameters.tiles.cloudmade.apiKey == undefined) parameters.tiles.cloudmade.apiKey = 'f8ccf0b805a54c7cb114af052e27b194';
		if (parameters.tiles.cloudmade.styleId == undefined) parameters.tiles.cloudmade.styleId =  58557; //51822; //51699; //50752;
	} else if (parameters.tiles.provider == 'boussole') {
//		if (parameters.tiles.attribution == undefined) parameters.tiles.attribution = 'Données fournies par <a href="http://www.openstreetmap.org" target="_blank">OpenStreetMap</a> et ses contributeurs sous licence <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
	}
//	if (widgetmode) parameters.tiles.attribution = '<a href="http://boussole.mandarine34.fr/"><img src="http://boussole.mandarine34.fr/x/images/logowidget.png" width="94" height="20" border="no" alt="Service fourni par Boussole : carte interactive et calcul d\'itinéraire basés sur OpenStreetMap et l\'OpenData."></a>';

	// function that determines wich tile has to be asked to the server (and to wich server to ask)
	if (parameters.tiles.geturl == undefined) parameters.tiles.geturl = function (bounds) {
		var res=this.map.getResolution();var x=Math.round((bounds.left-this.maxExtent.left)/(res*this.tileSize.w));var y=Math.round((this.maxExtent.top-bounds.top)/(res*this.tileSize.h));var z=this.map.getZoom();var limit=Math.pow(2,z);if(y<0||y>=limit){return OpenLayers.Util.getImagesLocation()+"404.png"}else{x=((x%limit)+limit)%limit;curTileSrv++;if(curTileSrv>=this.url.length)curTileSrv=0;return this.url[curTileSrv]+z+"/"+x+"/"+y+"."+this.type}
	}

	// Pois
	if (parameters.pois == undefined) parameters.pois = {};
//	if (parameters.pois.attribution == undefined && !widgetmode)
//		parameters.pois.attribution = 'Source des points d\'intérêt <a href="http://opendata.montpelliernumerique.fr/Les-donnees">Montpellier Territoire Numérique</a>';
//	else
		parameters.pois.attribution = '';
	// Set the Pois Colors
	if (parameters.pois.getcolor == undefined) parameters.pois.getcolor = function(aFeat) {
		var color = '#000000';
		var elements = $('#categories li.entry.active');
		if (mobilemode) elements = $('#catlist option:selected');
		elements.each(function(){
			var idcat = $(this).data('catid');
			var listname = $(this).data('listname');
			try {
				if (categories[listname][idcat].tags.join(' ').indexOf(aFeat.attributes.tags.join(' ')) > -1) {
					color = categories[listname][idcat].color;
				}
			} catch (e) {
				console.log(e.message);
			}
			aFeat.attributes.color = './images/points/'+color.replace('#','').toLowerCase()+'.png';
		});
		return color;
	}
    
    parameters.tiles.attribution = '<a href="#" id="dataSources_link" onclick="$(\'#dataSources\').show();return false;">Sources des données</a>';
    
    // neutralisation du routing
    parameters.positions = {
    	start: {
    		lonlat: [0,0],
    		address: ''
    	},
    	end: {
    		lonlat: [0,0],
    		address: ''
    	}
    };
    
	// positions (A→B)
	if (parameters.positions == undefined) parameters.positions = {};
	if (parameters.positions.start == undefined) parameters.positions.start = {};
	if (parameters.positions.start.lonlat == undefined) parameters.positions.start.lonlat = [3.8665891025258, 43.612115465763];
	if (parameters.positions.start.address == undefined) parameters.positions.start.address = 'Rue Paladilhe, Montpellier';
	if (parameters.positions.end == undefined) parameters.positions.end = {};
	if (parameters.positions.end.lonlat == undefined) parameters.positions.end.lonlat = [3.8961365319449, 43.603965159913];
	if (parameters.positions.end.address == undefined) parameters.positions.end.address = 'Place Jean Bène, Montpellier';

	//path and icons
	if (parameters.icons == undefined) parameters.icons = {};
	if (parameters.icons.start == undefined) parameters.icons.start = boussoleurl+'images/start.png';
	if (parameters.icons.end == undefined) parameters.icons.end = boussoleurl+'images/end.png';
	
	//force touch mode
	var pointRadius = (parameters.touch == true || isTouchDevice()) ? 26 : 18;
    var clickHandlerOptions = (parameters.touch == true || isTouchDevice()) ? {pixelTolerance: 45, dblclickTolerance: 55} : {};    

    // isochron
    if (parameters.activateIsochron == undefined) parameters.activateIsochron = false;



	/* Don't edit below this line !!! *****************************************/
   
	var mapProjection = new OpenLayers.Projection("EPSG:900913");
	var displayProjection = new OpenLayers.Projection("EPSG:4326");

	var mapBounds = new OpenLayers.Bounds();
	var lonlat = new OpenLayers.LonLat(parameters.bounds[0], parameters.bounds[1]);
	mapBounds.extend(lonlat.transform(displayProjection,mapProjection));
	lonlat = new OpenLayers.LonLat(parameters.bounds[2], parameters.bounds[3]);
	mapBounds.extend(lonlat.transform(displayProjection,mapProjection));

    
	map = new OpenLayers.Map (
//		'map', // map will be rendered in its container later for smoother start
		{
			controls:[
				new OpenLayers.Control.Navigation(),
//				new OpenLayers.Control.KeyboardDefaults(),
				new OpenLayers.Control.TouchNavigation({dragPanOptions: {enableKinetic: true}, pinchZoom: {autoActivate: true}, clickHandlerOptions: clickHandlerOptions}),
				//new OpenLayers.Control.MousePosition(),
				//new OpenLayers.Control.Geolocate({bind: true, watch: true}),
				//new OpenLayers.Control.Permalink(),
				//new OpenLayers.Control.OverviewMap(),
				new OpenLayers.Control.ScaleLine({geodesic:true}),
				new OpenLayers.Control.Attribution({separator: ''})
			],
//			panMethod: OpenLayers.Easing.Quad.easeOut,
			panDuration: 10,
			maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
			restrictedExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
			units: "m",
			projection: mapProjection,
			displayProjection: displayProjection
		}
	);

	map.events.register('zoomend', this, function (event) {
        if (map.getZoom() < 13) {
           map.zoomTo(13);
    	   $('#pt_stops-popup').remove();
    	   $('#zoomSlider').slider({value: 13});
           return false;
        }
//        console.log(map.getZoom()+' '+map.getScale()+' '+map.getResolution());
        $('#zoomSlider').slider({value: map.getZoom()});
        $(layers.transports.div).find('svg g g').attr('filter','url(#dropshadow)');
    });

	layers = {};
	/* Tiles ******************************************************************/

	if (parameters.tiles.provider == 'cloudmade') {
		// Cloudmade
		var cloudmade = new OpenLayers.Layer.CloudMade(
			"CloudMade",
			{
				minZoomLevel: 13,
				displayOutsideMaxExtent: true,
				isBaseLayer: false,
				attribution: parameters.tiles.attribution,
				key: parameters.tiles.cloudmade.apiKey,
				styleId: parameters.tiles.cloudmade.styleId,
				transitionEffect: 'resize'
			}
		);
		map.addLayer(cloudmade);
		layers['CloudMade'] = cloudmade;
		var osm = new OpenLayers.Layer.OSM('osm',boussoleurl+'images/spacer.gif',{attribution:'',transitionEffect: 'resize',minZoomLevel: 13});
		map.addLayer(osm);
		layers['osm'] = osm;
	} else if (parameters.tiles.provider == 'boussole') {
		var boussoletms = new OpenLayers.Layer.OSM(
			"boussole",
			[
				"http://tilescachea.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescacheb.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescachec.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescached.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescachee.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescachef.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescacheg.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescacheh.mandarine34.fr/mapnik/${z}/${x}/${y}.png",
				"http://tilescachei.mandarine34.fr/mapnik/${z}/${x}/${y}.png"
			],
			{
				numZoomLevels: 6,
				attribution: parameters.tiles.attribution,
				transitionEffect: 'resize'
			}
		);
	 	map.addLayer(boussoletms);
	}


	/* Layers *****************************************************************/
	
	/* isochron */
	var isochronlonlat = parameters.positions.start.lonlat;
	if (parameters.activateIsochron === true) {
	    var layer = new OpenLayers.Layer.TMS(
	        'isochron',
		    [
			    "http://tilescachea.mandarine34.fr/isochron/",
			    "http://tilescacheb.mandarine34.fr/isochron/",
			    "http://tilescachec.mandarine34.fr/isochron/",
			    "http://tilescached.mandarine34.fr/isochron/",
			    "http://tilescachee.mandarine34.fr/isochron/",
			    "http://tilescachef.mandarine34.fr/isochron/",
			    "http://tilescacheg.mandarine34.fr/isochron/",
			    "http://tilescacheh.mandarine34.fr/isochron/",
			    "http://tilescachei.mandarine34.fr/isochron/"
		    ],
            {
			    isBaseLayer: false,
			    buffer: 0,
			    attribution: '',
//			    transitionEffect: 'resize', // do not add resize ! its temporarily clone the tiles and, as the tiles are semi-transparent, its ugly
                getURL: function (bounds) {
                    var res = this.map.getResolution();
                    var zxy = [];
                    zxy.push(this.map.getZoom());
                    zxy.push(Math.round ((bounds.left - this.maxExtent.left) / (res * this.tileSize.w)));
                    zxy.push(Math.round ((this.maxExtent.top - bounds.top) / (res * this.tileSize.h)));
                    // TODO put this in the UI
                    var args = [
                        'layers=traveltime',
                        'styles=color30',
                        'batch=true',
                        'mode=TRANSIT%2CWALK',
                        'maxWalkDistance=2000',
                        'time=2012-06-06T08%3A00%3A00',
                        'fromPlace='+isochronlonlat[1]+'%2C'+isochronlonlat[0],
                        'toPlace='+isochronlonlat[1]+'%2C'+isochronlonlat[0]
                    ];
                    
                    var path = zxy.join('/') + '.png?' + args.join('&');
                    url = this.url;
                    if (url instanceof Array) {
                        url = this.selectUrl(path, url);
                    }
                    url += path;
                    if (image_cache['isochron_'+path] != undefined) {
                    	return image_cache['isochron_'+path].src;
		            }
                    if (image_cache['isochron_'+path] == undefined) {
	                    image_cache['isochron_'+path] = new Image;
	                    image_cache['isochron_'+path].src = url;
	                }
	                return url;
                }
            }
        );
        map.addLayer(layer);
        layers['isochron'] = layer;
    }

    
	/* Cycleways */

/*	var layer = new OpenLayers.Layer.Vector('cycleways', {
		projection: map.displayProjection,
		strategies: [new OpenLayers.Strategy.Fixed()],
		protocol: new OpenLayers.Protocol.HTTP({
			url: "data/mtn_cycleways.kml",
			format: new OpenLayers.Format.KML({
				extractStyles: false,
				extractAttributes: true,
			})
		}),
		preFeatureInsert: function(feat) {
			feat.style = {
				strokeColor:"yellow",
				strokeWidth:6,
			};
		},
		visibility: true
	});
	layer.setOpacity(0.55);
	map.addLayer(layer);
	layers['cycleways'] = layer;*/

/*	var cyclemap = new OpenLayers.Layer.OSM(
		"cyclemap",
		[
			"http://tilescachea.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescacheb.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescachec.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescached.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescachee.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescachef.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescacheg.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescacheh.mandarine34.fr/cyclemap/${z}/${x}/${y}.png",
			"http://tilescachei.mandarine34.fr/cyclemap/${z}/${x}/${y}.png"
		],
		{
			isBaseLayer: false,
			attribution: '',
			transitionEffect: 'resize',
			numZoomLevels: 19
		}
	);
 	map.addLayer(cyclemap);
*/


	if (!mobilemode) {	    
		/* Public transport lines */

		var PTLinesContext = {
			general:true,
			selection:0,
			getDisplay: function(aFeat) {
				if (inArray(aFeat.attributes.id,activePTLines))
					return '';
				return 'none';
			},
			getColor: function(aFeat) {
				if (aFeat.attributes.color != undefined)
					return aFeat.attributes.color;
				return 'white';
			}
		};
		var PTLinesStyles = new OpenLayers.StyleMap({
			"default": new OpenLayers.Style(
				{
					strokeColor:"${getColor}",
					strokeWidth:6,
					display:"${getDisplay}"
				},
				{
					context:PTLinesContext
				}
			),
			"select": new OpenLayers.Style(
				{
					strokeColor:"${getColor}",
					strokeWidth:8,
					display:"${getDisplay}"
				},
				{
					context:PTLinesContext
				}
			)
		});
		var layer = new OpenLayers.Layer.Vector('pt_lines', {styleMap: PTLinesStyles,renderers: ["Canvas", "SVG", "VML"]});
		layer.setOpacity(0.55);
		map.addLayer(layer);
		layers['pt_lines'] = layer;


		/* Public Transport Stops */

		var PTStopsContext = {
			general:true,
			selection:0,
	/*		getLabel: function (aFeat) {
				if (PTStopsContext.getDisplay(aFeat) == '') {
					if (aFeat.cluster) {
						if (aFeat.attributes.count > 1) {
							var lines = [];
							for (var i = 0; i < aFeat.cluster.length; i++) {
								for (var j = 0; j < activePTStops.length; j++) {
									if (inArray(activePTStops[j],aFeat.cluster[i].attributes.lines) && !inArray(activePTStops[j],lines))
										lines.push(activePTStops[j]);
								}
							}
							if (aFeat.cluster[0].attributes.name = 'Gare Saint-Roch')
								var a = 2;
							if (lines.length > 1)
								return lines.length;
						}
					}
				}
				return '';
			},*/
			getDisplay: function(aFeat) {
				if (aFeat.cluster) {
					for (var i = 0; i < aFeat.cluster.length; i++) {
						if (intersectArray(activePTStops,aFeat.cluster[i].attributes.lines))
							return '';
					}
				} else {
					if (intersectArray(activePTStops,aFeat.attributes.lines))
						return '';
				}
				return 'none';
			},
			getColor: function(aFeat) {
				if (PTStopsContext.getDisplay(aFeat) == '') {
					if (aFeat.cluster) {
						var lines = [];
						for (var i = 0; i < aFeat.cluster.length; i++) {
							for (var j = 0; j < activePTStops.length; j++) {
								if (inArray(activePTStops[j],aFeat.cluster[i].attributes.lines) && !inArray(activePTStops[j],lines)) {
									lines.push(activePTStops[j]);
									if (lines.length > 1)
										return 'white';
								}
								if (lines.length > 1)
									return 'white';
							}
						}
						for (var i = 0; i < aFeat.cluster.length; i++) {
							if (inArray(lines[0],aFeat.cluster[i].attributes.lines))
								return $('#public_transport_'+lines[0]).data('color');
						}
					} else {
						if (aFeat.attributes.color != undefined)
							return aFeat.attributes.color;
					}
				}
				return 'white';
			},
			getPointRadius: function(aFeat) {
				if (aFeat.cluster)
					return pointRadius * aFeat.attributes.count;
				return pointRadius;
			}
		};

		var PTStopsStyles = new OpenLayers.StyleMap({
			"default": new OpenLayers.Style(
				{
					pointRadius:pointRadius/2, //"${getPointRadius}",
					fillColor:"${getColor}",
					fillOpacity:1,
					strokeColor:"#000000",
					strokeWidth:2,
					display:"${getDisplay}",
					cursor: "pointer",
					label: "",
					labelAlign: 'cm',
					fontColor: '#000',
					fontOpacity: 0.8,
					fontSize: '12px',
					fontWeight: 'bold'
				},
				{
					context:PTStopsContext
				}
			),
			"temporary": new OpenLayers.Style(
				{
					pointRadius:pointRadius/2,
					fillColor:"#66CCCC",
					fillOpacity:1,
					strokeColor:"#66CCCC",
					strokeWidth:2,
					display:"${getDisplay}",
					cursor: "pointer",
					label: "",
					labelAlign: 'cm',
					fontColor: '#000',
					fontOpacity: 0.8,
					fontSize: '12px',
					fontWeight: 'bold'

				},
				{
					context:PTStopsContext
				}
			),
			"highlight": new OpenLayers.Style(
				{
					pointRadius:pointRadius/2,
					fillColor:"blue",
					fillOpacity:1,
					strokeColor:"blue",
					strokeWidth:2,
					display:"${getDisplay}",
					cursor: "pointer",
					label: "",
					labelAlign: 'cm',
					fontColor: '#000',
					fontOpacity: 0.8,
					fontSize: '12px',
					fontWeight: 'bold'
				},
				{
					context:PTStopsContext
				}
			)
		});
		PTStopsClustering = new OpenLayers.Strategy.Cluster({
			distance: (pointRadius+2)*1.5,
			threshold: 1
		});
		var layer = new OpenLayers.Layer.Vector('pt_stops',{styleMap: PTStopsStyles, strategies: [PTStopsClustering], renderers: ["Canvas", "SVG", "VML"]});
		map.addLayer(layer);
		layers['pt_stops'] = layer;
	} // if (!mobilemode)

	/* POIs */
	poiContext = {
		general:true,
		selection:0,
		getDisplay: function(aFeat) {
			if ((poiContext.general && aFeat.attributes.Selection == 1) ||  (inArray(aFeat.attributes.tags.join(' '),activeCategoriesTags)))
				return '';
			return 'none';
		},
		getColor: parameters.pois.getcolor,
		getIcon: function(aFeat) {
		    if (aFeat.attributes.icon !== undefined) {
		        aFeat.attributes.color = boussoleurl+aFeat.attributes.icon;
		        return boussoleurl+aFeat.attributes.icon;
	        } else {
	            return './images/points/'+parameters.pois.getcolor(aFeat).replace('#','').toLowerCase()+'.png';
	        }
		}
	};
	var poiStyles = new OpenLayers.StyleMap({
		"default": new OpenLayers.Style(
			{
				display:"${getDisplay}",
				cursor: "pointer",
			    pointRadius:pointRadius,
			    externalGraphic:"${getIcon}",
			    graphicXOffset:-pointRadius,
			    graphicYOffset:-(pointRadius*2),
			    fill:"${getColor}",
			    fillOpacity:1,
			    strokeColor:"#000000",
			    strokeWidth:2
			},
			{
				context:poiContext
			}
		),
		"temporary": new OpenLayers.Style(
			{
				display:"${getDisplay}",
				cursor: "pointer",
			    pointRadius:pointRadius,
			    externalGraphic:"${getIcon}",
			    graphicXOffset:-pointRadius,
			    graphicYOffset:-(pointRadius*2),
			    fill:"${getColor}",
			    fillOpacity:1,
			    strokeColor:"#000000",
			    strokeWidth:2
			},
			{
				context:poiContext
			}
		),
		"select": new OpenLayers.Style(
			{
				display:"${getDisplay}",
				cursor: "pointer",
			    pointRadius:pointRadius,
			    externalGraphic:"${getIcon}",
			    graphicXOffset:-pointRadius,
			    graphicYOffset:-(pointRadius*2),
			    fill:"${getColor}",
			    fillOpacity:1,
			    strokeColor:"#000000",
			    strokeWidth:2
			},
			{
				context:poiContext
			}
		)
	});
	var layer = new OpenLayers.Layer.Vector('pois',{styleMap: poiStyles, attribution: parameters.pois.attribution, renderers: ["Canvas", "SVG", "VML"]});
	map.addLayer(layer);
	layers['pois'] = layer;

	/* Location of the current kiosk displaying Boussole */
    
    var layer = new OpenLayers.Layer.Vector('location', {
		preFeatureInsert: function(feat) {
			feat.style = {
                pointRadius:20,
                externalGraphic:feat.attributes.icon,
                graphicXOffset:-5,
                graphicYOffset:-20,
                fillColor:"red",
                fillOpacity:1,
                strokeColor:"red",
                strokeWidth:2
			};
		}     
    });
    if (parameters.location !== undefined) {
		var GeoJSON = new OpenLayers.Format.GeoJSON({
			internalProjection:map.projection,
			externalProjection:map.displayProjection
		});
		var location = GeoJSON.read(parameters.location);
		layer.addFeatures(location);
    }
    map.addLayer(layer);
    layers['location'] = layer;
    
	/* Transports */

	var styles = new OpenLayers.StyleMap({
		"default": new OpenLayers.Style({
			strokeColor:"${color}",
			strokeWidth:6
		}),
		"select": new OpenLayers.Style({
			strokeColor:"${color}",
			strokeWidth:8
		})
	});
	var layer = new OpenLayers.Layer.Vector('transports', {styleMap: styles});
	map.addLayer(layer);
	layers['transports'] = layer;

	/* Stops */

	var styles = new OpenLayers.StyleMap({
		"default": new OpenLayers.Style({
			pointRadius:6,
			fillColor:"white",
			fillOpacity:1,
			strokeColor:"black",
			strokeWidth:2
		}),
		"select": new OpenLayers.Style({
			pointRadius:6,
			fillColor:"white",
			fillOpacity:1,
			strokeColor:"black",
			strokeWidth:2
		})
	});
	var layer = new OpenLayers.Layer.Vector('stops', {styleMap: styles});
	map.addLayer(layer);
	layers['stops'] = layer;

	/* Start - End (Positions) */

	var styles = new OpenLayers.StyleMap({
		"default": new OpenLayers.Style({
			pointRadius:16,
			externalGraphic:"${graphic}",
			graphicXOffset:-5,
			graphicYOffset:-30,
			fill:"${color}",
			fillOpacity:1,
			strokeColor:"${color}",
			strokeWidth:2
		}),
		"select": new OpenLayers.Style({
			pointRadius:16,
			externalGraphic:"${graphic}",
			graphicXOffset:-5,
			graphicYOffset:-30,
			fillColor:"${color}",
			fillOpacity:1,
			strokeColor:"red",
			strokeWidth:2
		})
	});

	var layer = new OpenLayers.Layer.Vector('positions', {styleMap: styles});

	features = {};
	var start = new OpenLayers.Feature.Vector(
		new OpenLayers.Geometry.Point(parameters.positions.start.lonlat[0],parameters.positions.start.lonlat[1]),
		{color:"green",graphic:parameters.icons.start}
	);
	if (parameters.setupRoute) $('#start-add').val(parameters.positions.start.address);
	var end = new OpenLayers.Feature.Vector(
		new OpenLayers.Geometry.Point(parameters.positions.end.lonlat[0],parameters.positions.end.lonlat[1]),
		{color:"orange",graphic:parameters.icons.end}
	);
	if (parameters.setupRoute) $('#end-add').val(parameters.positions.end.address);
	start.geometry.transform(map.displayProjection,map.projection);
	end.geometry.transform(map.displayProjection,map.projection);
	if (parameters.setupRoute) layer.addFeatures([start,end]);
	features['start'] = start;
	features['end'] = end;
	map.addLayer(layer);
	layers['positions'] = layer;

	/* Interaction on layers **************************************************/

	/* Click on POIs */

	var selectableLayers = [
			layers.positions,
			layers.pois,
			layers.location
	];
	if (!mobilemode) selectableLayers.push(layers.pt_stops);
	POISelectControl = new OpenLayers.Control.SelectFeature(
		selectableLayers,
		{
			clickout: true,
			toggle: false,
			multiple: false,
			hover: false
		}
	);
	map.addControl(POISelectControl);
	POISelectControl.activate();
	layers.pois.setPoiAsStartEnd = function(as) {
		feat = this.selectedFeatures[0];
		var geom = feat.geometry;
		features[as].geometry.x = geom.x;
		features[as].geometry.y = geom.y;
		features[as].geometry.bounds = null;
		getAddress(features[as]);
		getRouting();
		layers.positions.redraw();
		this.events.triggerEvent("featureunselected", {feature: feat});
	};
	
	layers.location.setPoiAsStartEnd = function(as) {
		feat = this.selectedFeatures[0];
		var geom = feat.geometry;
		features[as].geometry.x = geom.x;
		features[as].geometry.y = geom.y;
		features[as].geometry.bounds = null;
		getAddress(features[as]);
		getRouting();
		layers.positions.redraw();
		this.events.triggerEvent("featureunselected", {feature: feat});
	}

	layers.pois.events.on({
		'featureselected': function(e) {
            try { // TODO clean that when mobike mode has been put on same lvl
		        if (e.feature.attributes.metadatas.customBubble !== undefined) {
		            var popup = customBubble(e.feature);
		        } else {
        			var popup = poiBubble(e.feature);
        	    }
        	} catch(err) {
    			var popup = poiBubble(e.feature);
        	}
			e.feature.attributes.Selection = true;
			e.feature.popup = popup;
			map.addPopup(popup,true);
			layers.pois.selectedFeatures = [e.feature];
			setPermalink();
		},
		'featureunselected': function(e) {
			map.removePopup(e.feature.popup);
			e.feature.popup.destroy();
			e.featurepopup = null;
			layers.pois.selectedFeatures = [];
			e.feature.attributes.Selection = false;
			POISelectControl.unhighlight(e.feature);
			setPermalink();
		},
		'moveend': function(e) {
			if (e.zoomChanged) {
				if (layers.pois.selectedFeatures[0] !== undefined) {
					var feat = layers.pois.selectedFeatures[0];
					layers.pois.events.triggerEvent("featureunselected", {feature: feat});
					layers.pois.events.triggerEvent("featureselected", {feature: feat});
					setPermalink();
				}
			}
		}
	});
	layers.location.events.on({
		'featureselected': function(e) {
			var popup = poiBubble(e.feature);
			e.feature.attributes.Selection = true;
			e.feature.popup = popup;
			map.addPopup(popup,true);
			layers.location.selectedFeatures = [e.feature];
			setPermalink();
		},
		'featureunselected': function(e) {
			map.removePopup(e.feature.popup);
			e.feature.popup.destroy();
			e.featurepopup = null;
			layers.location.selectedFeatures = [];
			e.feature.attributes.Selection = false;
			setPermalink();
		},
		'moveend': function(e) {
			if (e.zoomChanged) {
				if (layers.location.selectedFeatures[0] !== undefined) {
					var feat = layers.location.selectedFeatures[0];
					layers.location.events.triggerEvent("featureunselected", {feature: feat});
					layers.location.events.triggerEvent("featureselected", {feature: feat});
					setPermalink();
				}
			}
		}
	});

    /* Drag Start-end */
	/* must be after the SelectFeature handler to make it work with touch devices */

	var dragControl = new OpenLayers.Control.DragFeature(
		layers.positions,
		{
			onComplete:function(feat,px) {
				if (feat==features.start) {
					$('#start-add').val('');
					if (parameters.activateIsochron) {
						var pt = feat.geometry.clone();
	                    pt.transform(map.projection,map.displayProjection);
	                    var ptx = pt.getCentroid()
	                    isochronlonlat = [ptx.x,ptx.y];
	                    $(layers.isochron.div).hide('fade',1000,function(){
	                        layers.isochron.forcedHide = true;
    	                    layers.isochron.setOpacity(0);
    	                    layers.isochron.redraw();
    	                });
					}
				} else if (feat==features.end)
					$('#end-add').val('');
				if (feat==features.start || feat==features.end) {
					setPermalink();
					getAddress(feat);
					return true;
				}
			}
		}
	);
    map.addControl(dragControl);
    dragControl.activate();

	if (!mobilemode) {
		/* Hover Public transport Stops */
		PTStopSelectControl = new OpenLayers.Control.SelectFeature(
			layers.pt_stops,
			{
				clickout: true,
				toggle: false,
				multiple: false,
				hover: false
			}
		);
		map.addControl(PTStopSelectControl);
		POISelectControl.activate();

	 	layers.pt_stops.zoomOnFeature = function() {
			feat = this.selectedFeatures[0];
			this.events.triggerEvent("featureunselected", {feature: feat});
			// collet all lignes wich pass by this cluster and activate them
			var featLines = []
			if (feat.cluster) {
				for (var i = 0; i < feat.cluster.length; i++) {
					for (var j = 0; j < feat.cluster[i].attributes.lines.length; j++) {
						if (!inArray(feat.cluster[i].attributes.lines[j],featLines))
							featLines.push(feat.cluster[i].attributes.lines[j]);
					}
				}
			} else {
				for (var j = 0; j < feat.attributes.lines.length; j++) {
					if (!inArray(feat.attributes.lines[j],featLines))
						featLines.push(feat.attributes.lines[j]);
				}
			}
			for (var i = 0; i < featLines.length; i++) {
				if (!$('#pt_line_display_stops_' + featLines[i]).hasClass('active'))
					$('#pt_line_display_stops_' + featLines[i]).click();
			}
			map.setCenter(
				feat.geometry.bounds.centerLonLat,
				17,
				false,
				false
			);
		}

		layers.pt_stops.events.on({
			'featureselected': function (e) {
				if (layers.pt_stops.selectedFeatures[0] !== undefined) {
					var feat = layers.pt_stops.selectedFeatures[0];
					try {
						layers.pt_stops.events.triggerEvent("featureunselected", {feature: feat});
					} catch (e) {}
				}
				var popup = PTStopsBubble(e.feature);
				e.feature.attributes.Selection = true;
				e.feature.popup = popup;
				map.addPopup(popup,true);
				layers.pt_stops.selectedFeatures = [e.feature];
				setPermalink();
			},
			'featureunselected': function(e) {
				map.removePopup(e.feature.popup);
		        e.feature.popup.destroy();
		        e.featurepopup = null;
				layers.pt_stops.selectedFeatures = [];
				e.feature.attributes.Selection = false;
				PTStopSelectControl.unhighlight(e.feature);
				setPermalink();
			},
			'moveend': function(e) {
				if (e.zoomChanged) {
					if (layers.pt_stops.selectedFeatures[0] !== undefined) {
						var feat = layers.pt_stops.selectedFeatures[0];
						layers.pt_stops.events.triggerEvent("featureunselected", {feature: feat});
						layers.pt_stops.events.triggerEvent("featureselected", {feature: feat});
						setPermalink();
					}
				}
			}
		});
	}
	if (parameters.activateIsochron) {
	    layers.isochron.events.on({
	        'loadend': function(e) {
	            if (layers.isochron.forcedHide) {
	                layers.isochron.forcedHide = false;
	                $(layers.isochron.div).hide('fast',function() {
	                    layers.isochron.setOpacity(1);
                        $(layers.isochron.div).show('fade',200);
                    });
                }
             }
        });
    }
	
    /* Start the map **********************************************************/
	function startMap() {
		if (boussoleReady) {
			try {
				map.restrictedExtent = mapBounds;
				if (parameters.setupRoute && !mobilemode) getRouting(mobilemode);
				if (callback != undefined) window.setTimeout(callback,1000);
				if (mobilemode) zoomToRoute();
				setPermalink();
			} catch (e) {
				window.setTimeout(startMap,100);
			}
			if (!mobilemode) { // in mobile mode, the map is rendered on demand when the proper page is displayed
				map.render('map');
				map.zoomToMaxExtent(true);
				map.zoomToExtent(mapBounds);
				map.zoomTo(parameters.zoom);
		    }
		} else {
			window.setTimeout(startMap,100);
		}
	}
	startMap();

}

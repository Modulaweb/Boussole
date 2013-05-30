var boussoleReady = false;
var boussoleReadySteps = {
	categories: false,
	points: false
};
var PTLinesLoaded = false;
var PTStopsLoaded = false;
var PTLoading = false;
var PTStopsClustering;
var client = {
	tuio: false,
	noLinks: false
}

var pointsAndCategories = false;

var map,layers,features,poiContext,featPopup,parameters;
var categories = {};
var activeCategoriesTags = [];
var poisCount = 0;
var PTLines = [];
var PTStops = [];

var activePTStops = [];
var activePTLines = [];
var routeFeat = [];
var permalink = '';
var geocoderCache = new Cache('geocoderCache');
var mode = 'tc';
var routing = {'routes':[], 'layer':{}};
var routings = {};
var routing_costs = {};
var xhr_get_routing;
var go = function() {};
/* are we on a touch device ? */
var isTouchDevice = function(){try{document.createEvent('TouchEvent');return true;}catch(e){return (false || client.tuio);}};
//var isTouchDevice = function() {return true;}; // testing only !!!
var routing_displayed = false;
var dateTime = new Date();

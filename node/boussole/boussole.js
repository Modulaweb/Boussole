
/*
 * The Boussole route
 */
 
exports.index = function(req, res){
	var elements = {
		title: 'Boussole'
		, tuio: {
			js: ''
			, object: ''
			, bodyClass: ''
		}
	};
	if (req.query.tuio !== undefined) {
		elements.tuio.js = '<script src="javascripts/mylibs/uniTouch.js"></script>';
		elements.tuio.object = '<object id="tuio" type="application/x-tuio" width="1" height="1" style="background-color:red;position:absolute;bottom:0;right:left;z-index:999999999999;"></object>';
		elements.tuio.bodyClass = ' tuio';
	}
	res.render('index', elements);
};
exports.feedback = function(req, res){
	var cradle = require('cradle')
	, db = new(cradle.Connection)().database('feedback')
	;
	db.save(req.body,function(err,res) {
		if (err) {
			console.log(err);
		} else { 
			console.log(JSON.stringify(req.body));
		}
	});
	res.jsonp(null);
};
exports.api = function(req, res){
	var cradle = require('cradle')
	, dbapi = new(cradle.Connection)().database('api_keys')
	, http = require("http")
	, redis_ = require("redis")
    , redis = redis_.createClient()
    , querystring = require('querystring')
	;
	
	/*dbapi.save('boussole', {
      description: 'Boussole Genuine Key', active: true, active_until: 0, used: 0, domain: ['boussole.mandarine34.fr','boussole.mobi']
  }, function (err, res) {
      // Handle response
  });*/

	var apiKey = req.params.key;
	var apiAction = req.params.action;
	
	// handle simple HTTP get or redis cache
	var retrieve = function(datas) {
		var buffer = '';
		redis.get(datas.redisname,function(rediserr,redisres) {
			if (redisres === null || datas.nocache) {
				var httpreq = http.request({
						hostname: datas.hostname,
						port: datas.port,
						path: datas.path,
						method: 'GET'
					}, function(httpres) {
					httpres.setEncoding('utf8');
					httpres.on('data', function (chunk) {
						buffer += chunk;
					});
					httpres.on('end', function (chunk) {
						redis.set(datas.redisname,datas.finalize(buffer));
						redis.expire(datas.redisname,3600);
					});
				});
				httpreq.on('error', function(e) {
					console.log('problem with request: ' + e.message);
					res.jsonp(null);
				});
				httpreq.end();
			} else {
				datas.finalize(redisres);
			}
		});
	}
	
	//1 Check API key
	dbapi.get(apiKey, function(err, doc)  {
		if (err) {
			console.log(apiKey+' is not a valid Boussole API key');
			res.send('403','Bad API Key…');
			if (!doc.active) {
				res.send('403','This API Key is inactive.');
			}
		} else {
			console.log('Key is valid : checking action «'+apiAction+'»');
			//2 perform the requested action
			switch(apiAction) {
				case 'js':
					console.log('action == js');
					console.log('mode = '+req.query.mode);
					redis.get('api_js_mode_'+req.query.mode,function(rediserr,redisres) {
						if (redisres === null || req.query.nocache !== undefined) {
							var fs = require('fs');
							var date = new Date();
							var modes = {
								boussole: {
									baseUrl: __dirname+'/../public/javascripts',
									special: 'var date_version = "'+date.toLocaleString()+'";var lists=[{id: "BoussoleWebappMontpellier",title: "Points d\'intérêt"}/*,{id:"ReseauxTransportMontpellier",title: "Réseaux de transport"},{id: "IntermodalMontpellier", title: "Mobilité"}*/];var jsonPOICats="BoussoleWebappMontpellier";var boussoleAPIKey="'+apiKey+'";var mobilemode=false;var widgetmode=false;var boussoleurl="http://'+req.host+'/"',
									include: [
										'vars',
										'JQplugins',
										'mylibs/jquery.pnotify.min',
										'ui',
										'libs/cloudmade',
										'tools',
										'map',
										'boussole'					
									]
								}
							};
							var content = '';
							if (modes[req.query.mode]) {
								content += modes[req.query.mode].special;
								for (var i in modes[req.query.mode].include) {
									content += '\n/*******************************************************************************\n\n'+modes[req.query.mode].include[i]+'\n\n*******************************************************************************/\n';
									content += fs.readFileSync(modes[req.query.mode].baseUrl+'/'+modes[req.query.mode].include[i]+'.js','utf8');
								}
								redis.set('api_js_mode_'+req.query.mode,content);
								redis.expire('api_js_mode_'+req.query.mode,3600);
								res.set('Content-Type', 'text/javascript');
								res.send(content);
							} else {
								res.send('403','Bad mode '+req.query.mode);
							}
						} else {
							res.set('Content-Type', 'text/javascript');
							res.send(redisres);
						}
					});
					break;
				case 'getLists':
					var lists = [];
					for (var i in req.query.lists) {
						lists.push(req.query.lists[i].id);
					}
					retrieve({
						hostname: '127.0.0.1'
						, port: 5984
						, path: '/boussole_points_categories/_design/deal/_list/categories/pointsByCategory?group=true&categories='+JSON.stringify(lists)
						, redisname: 'api_getlist_'+JSON.toString(lists)
						, nocache: (req.query.nocache !== undefined)
						, finalize: function(buffer) {
							var r = {status: 'ok', html: buffer};
							res.jsonp(r);
							return buffer;
						}
					});
					break;
				case 'getPointsAndCategories_':
					var lists = [];
					for (var i in req.query.lists) {
						lists.push(req.query.lists[i].id);
					}
					retrieve({
						hostname: '127.0.0.1'
						, port: 5984
						, path: '/boussole_points_categories/_design/deal/_list/json/pointsAndCategories?categories='+JSON.stringify(lists)
						, redisname: 'api_getPointsAndCategories_'+JSON.toString(lists)
						, nocache: (req.query.nocache !== undefined)
						, finalize: function(buffer) {
							var r = JSON.parse(buffer)
							res.jsonp(r);
							return buffer;
						}
					});
					break;
				case 'proxy':
					switch(req.query.action) {
						case 'bitly':
							redis.get('api_proxy_bitly_'+req.query.longurl,function(rediserr,redisres) {
								if (redisres === null || req.query.nocache !== undefined) {
									var data = querystring.stringify({
										login: 'o_66hf4gsl8p',
										apiKeY: 'R_d280156ccbece21b6d7b2da1f3103d82',
										format: 'json',
										longurl: req.query.longurl
									});
									var httpreq = http.request({
										hostname: 'api.bitly.com',
										port: 80,
										path: '/v3/shorten',
										method: 'POST',
										headers: {
											'Content-Type': 'application/x-www-form-urlencoded',
											'Content-Length': data.length
										}
									}, function(httpres) {
										httpres.setEncoding('utf8');
										httpres.on('data', function (chunk) {
											redis.set('api_proxy_bitly_'+req.query.longurl,chunk);
											redis.expire('api_proxy_bitly_'+req.query.longurl,60);
											res.jsonp(JSON.parse(chunk));
										});
									});					
									httpreq.on('error', function(e) {
										console.log('problem with request: ' + e.message);
										res.jsonp(null);
									});
									httpreq.write(data+'\n');
									httpreq.end();
								} else {
									res.jsonp(JSON.parse(redisres));
								}
							});
							break;
					}
					break;
				default: 
					res.jsonp('403','Bad API Action…');
			}
		}
	});
}; // boussole.api


function(head, req) {
    var row, out_points, buffer = '', points = '', lists={}, count = 0, reqcategories = JSON.parse(req.query.categories), sep = '\n';
	var Colors = require("lib/colors");

    if ('Accept' in req.headers) {
		if (req.headers.Accept.indexOf('application/json')!=-1) {
		    start({"headers":{"Content-Type" : "application/json"}});
		} else {
		    start({"headers":{"Content-Type" : "text/plain"}});
		}
	} else {
		start({"headers":{"Content-Type" : "text/plain"}});
	}

    if ('callback' in req.query) {
        buffer += req.query.callback;
        buffer += '(';
    }
	
    points += '{"type": "FeatureCollection", "features":[';

    while (row = getRow()) {
    	if (row.key == 'point') {
			if (reqcategories.indexOf(row.value.category) > -1) {
				var feature = {type: "Feature", geometry: row.value.geometry, properties: row.value};
				feature.properties['id'] = row.value._id;
				delete feature.properties._id;
				delete feature.properties._rev;
				delete feature.properties.geometry;
				out = JSON.stringify(feature);
				points += sep;
				points += out;
				sep = ',\n';
			}
		} else if (row.key == 'list') {
			var doc = row.value;
			var categories = [];
			for (var i in doc.categories) {
				for (var j in doc.categories[i].children) {
					var color = Colors.getColor();
					var brightness = Colors.brightness(color);
					if(brightness > 130) {
						var inversecolor = "#000";
						var shadowcolor = "rgba(255,255,255,0.25)";
					} else {
						var inversecolor = "#fff";
						var shadowcolor = "rgba(0,0,0,0.25)";
					}
					categories.push({
						id: count++,
						name: doc.categories[i].children[j].name,
						color: '#'+color.toLowerCase(),
						inversecolor: inversecolor,
						shadowcolor: shadowcolor,
						brightness: brightness,
						tags: doc.categories[i].children[j].tags,
						root: false
					});
				}
			}
			lists[doc._id] = categories;
		}
    }
    points += ']}';

	buffer = '{"points":'+points+',"categories":'+JSON.stringify(lists)+'}';
    if ('callback' in req.query) {
        buffer += ')';
    }
    send(buffer);
}

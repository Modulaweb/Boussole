function(doc, req) {  
	var ddoc = this;
	var Mustache = require("lib/mustache");
	var Colors = require("lib/colors");
	var count=0;
	
	var categories = [];
	if (doc.categories) {
		for (var i in doc.categories) {
			var children = [];
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
				children.push({
					id: count++,
					name: doc.categories[i].children[j].name,
					color: color,
					inversecolor: inversecolor,
					shadowcolor: shadowcolor,
					brightness: brightness,
					tags: doc.categories[i].children[j].tags,
					count: 0
				});
			}
			categories.push({id: count++, name: doc.categories[i].name, children: children});
		}
	}

	var data = {
		id: doc._id,
		title: doc.title,
		categories: categories
  	};
	return Mustache.to_html(ddoc.templates.list,data);
}

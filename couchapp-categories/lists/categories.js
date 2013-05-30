function(head, req) {
	var ddoc = this;
	var Mustache = require("lib/mustache");

	var count=0, categories = [], points = {}, row, reqcategories = JSON.parse(req.query.categories);
	start({
		"headers": {
			"Content-Type": "text/html; charset: utf-8"
		}
	});
	
	while (row = getRow()) {
		if (Object.prototype.toString.call( row.key ) === '[object Array]') {
			if (reqcategories.indexOf(row.key[0]) > -1) {
				points[row.key[1]] = row.value;
			}
		} else if (reqcategories.indexOf(row.key._id) > -1) {
			var doc = row.key;
			for (var i in doc.categories) {
				var children = [];
				for (var j in doc.categories[i].children) {
					children.push({
						id: count++,
						name: doc.categories[i].children[j].name,
						tags: doc.categories[i].children[j].tags,
						listName: doc._id,
						count: points[doc.categories[i].children[j].tags.join(',')]
					});
				}
				categories.push({name: doc.categories[i].name, children: children});
			}
		}
	}
	
	var data = {
		id: doc._id,
		title: doc.title,
		categories: categories
  	};
	send(Mustache.to_html(ddoc.templates.list,data));
}

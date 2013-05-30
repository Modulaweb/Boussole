function(doc) {
	if (doc.type == 'Feature') {
		emit ([doc.category,doc.tags.join(',')],1);
	} else {
		emit (doc,null);
	}
}

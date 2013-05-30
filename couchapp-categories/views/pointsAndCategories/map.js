function(doc) {
	if (doc.type == 'Feature') {
		emit('point', doc);
	} else {
		emit('list', doc);
	}
};

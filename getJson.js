'use strict';


var fs = require('fs');


function getJson (name) {
	try {
		return JSON.parse(fs.readFileSync(name));
	} catch (e) {
		console.warn('WARNING: can\'t use', name, '-', e.message);
	}
	return null;
}


module.exports = getJson;

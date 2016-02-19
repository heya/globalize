'use strict';


var glob = require('glob');


function Dict () {
	this.dict = {};
	this.size = 0;
}

Dict.prototype = {
	add: function (pattern) {
		var files = toFiles(pattern);
		files.forEach(function (name) {
			if (!this.dict.hasOwnProperty(name)) {
				this.dict[name] = 1;
				++this.size;
			}
		}, this);
	},
	remove: function (pattern) {
		if (this.size) {
			var files = toFiles(pattern);
			for (var i = 0; i < files.length; ++i) {
				var name = files[i];
				if (this.dict.hasOwnProperty(name)) {
					delete this.dict[name];
					if (!--this.size) {
						return;
					}
				}
			}
		}
	},
	filter: function (files) {
		return this.size ? files.filter(function (name) { return this.dict.hasOwnProperty(name); }, this) : [];
	}
};

function toFiles (pattern) {
	return pattern instanceof Array ? pattern : glob.sync(pattern);
}


function normalizePattern (pattern) {
	if (pattern) {
		// pattern = (pattern.charAt(0) === '/' ? '**' : '**/') + pattern;
		pattern += (pattern.charAt(pattern.length - 1) === '/' ? '**' : '/**');
	}
	return pattern;
}


module.exports = function (bowerJson, dist) {
	var dict = new Dict(), files = glob.sync('**/*.js');

	dict.add(files);
	dict.remove(normalizePattern('node_modules'));
	dict.remove(normalizePattern('bower_components'));
	dict.remove(normalizePattern(dist));

	if (bowerJson && bowerJson.ignore && bowerJson.ignore instanceof Array) {
		bowerJson.ignore.forEach(function (pattern) {
			if (pattern) {
				if (!/^\*\*\//.test(pattern) && pattern.charAt(0) !== '/') {
					pattern = '**/' + pattern;
				}
				dict.removeFromDict(pattern);
				if (!/\/\*\*$/.test(pattern)) {
					dict.removeFromDict(pattern + '/**');
				}
			}
		});
	}

	return dict.filter(files);
};

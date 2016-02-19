'use strict';


var isId = /^[a-zA-Z_]\w*$/;


function VarSet () {
	this.root = {};
}

VarSet.prototype = {
	add: function (path) {
		toParts(path).reduce(function (root, part) {
			if (!root.hasOwnProperty(part)) {
				root[part] = {};
			}
			return root[part];
		}, this.root);
	},
	buildGetter: function (path) {
		return toParts(path).reduce(function (acc, part) {
			return acc + (isId.test(part) ? '.' + part : '[' + JSON.stringify(part) + ']');
		}, '');
	},
	buildSetter: function (path) {
		var parts = toParts(path);

		// no assignment for '!' variables
		if (parts[0].charAt(0) === '!') {
			return '';
		}

		// simple case: all paths are already created
		var prefixSize = this.getPrefixSize(parts);
		if (prefixSize + 1 >= parts.length) {
			if (prefixSize == parts.length) {
				console.warn('WARNING: about to assign to already assigned variable -', parts.join('.'));
			}
			return 'window' + this.buildGetter(parts) + '=';
		}

		// assign a common prefix (no need to create intermediate objects)
		var s = 'g=window' + this.buildGetter(parts.slice(0, prefixSize)) + ';';

		// create objects for the rest but the last one
		s += parts.slice(prefixSize, parts.length - 1).reduce(function (acc, part) {
			var accessor = this.buildGetter(part);
			return acc + 'g' + accessor + '=g' + accessor + '||{};';
		}.bind(this), '');

		// assign to the last one
		return s + 'g' + this.buildGetter(parts[parts.length - 1]) + '=';
	},
	getPrefixSize: function (path) {
		var parts = toParts(path);
		for (var i = 0, root = this.root; i < parts.length; ++i) {
			var part = parts[i];
			if (!root.hasOwnProperty(part)) {
				return i;
			}
			root = root[part];
		}
		return parts.length;
	}
};


VarSet.getPrefixSize = function getPrefixSize (path1, path2) {
	var parts1 = toParts(path1), parts2 = toParts(path2),
		size = Math.min(parts1.length, parts2.length);
	for (var i = 0; i < size; ++i) {
		if (parts1[i] !== parts2[i]) {
			return i;
		}
	}
	return size;
};


function toParts (path) {
	return path instanceof Array ? path : path.split('.');
}


module.exports = VarSet;

'use strict';


var path = require('path');


var CWD = process.cwd();


function Globals (browserGlobals, name) {
	this.globals = {};

	if (browserGlobals) {
		this.globals = browserGlobals || {};
	}

	if (!this.globals['!root']) {
		this.globals['!root'] = name;
	}

	if (!this.globals['!dist']) {
		this.globals['!dist'] = 'dist';
	}
}

Globals.prototype = {
	getRoot: function () {
		return this.globals['!root'];
	},
	getDist: function () {
		return this.globals['!dist'];
	},
	getGlobalByModule: function (name, silent) {
		if (name.charAt(0) === '.') {
			// local file
			var fullName = path.join(CWD, name);
			if (CWD !== fullName.slice(0, CWD.length) || CWD.charAt(CWD.length - 1) !== '/' && fullName.charAt(CWD.length) !== '/') {
				console.error('ERROR: local file', name, 'is outside of the root.');
				return '';
			}
			// normalize to use './' form
			var size = CWD.length;
			if (fullName.charAt(size) === '/') {
				++size;
			}
			name = './' + fullName.slice(size);
		}

		// check for direct correspondence
		if (this.globals.hasOwnProperty(name)) {
			return this.globals[name];
		}

		// check parents
		var parts = name.split('/');
		if (parts[0] === '.') {
			// merge first dot with the first meaningful part
			parts.shift();
			parts[0] = './' + parts[0];
		}
		for (var i = parts.length - 1; i > 0; --i) {
			var parent = parts.slice(0, i).join('/');
			if (this.globals.hasOwnProperty(parent)) {
				return this.globals[parent] + '.' + parts.slice(i).join('.');
			}
		}

		// nothing was found => make up a new name, if possible
		if (parts[0].charAt(0) === '.') {
			// local file
			return this.getRoot() + '.' + parts.join('.').slice(2);
		}

		// undeclared module
		if (!silent) {
			console.warn('WARNING: external module', name, 'is undeclared!', parts[0], 'is used as a global variable of its package');
		}
		return parts.join('.');
	}
};


module.exports = Globals;

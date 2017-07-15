'use strict';


var path = require('path');

var VarSet = require('./VarSet');


function prologueGlobals (globals) {
	return function (deps, mod, from) {
		var prologue = generatePrologue(deps, mod, from, globals);
		if (!prologue) {
			console.error('ERROR: a loader is detected in', from, '- but some dependencies are unknown - skipping.');
			return null;
		}
		return prologue;
	};
}

function generatePrologue (deps, mod, name, globals) {
	// normalize dependencies
	deps = deps.map(function (name) {
		if (name === 'module' || name.charAt(0) !== '.') {
			return name;
		}
		var norm = path.join(path.dirname(mod), name);
		if (!/^\.\//.test(norm)) {
			norm = './' + norm;
		}
		return norm;
	});
	// prepare global variables
	var variables = new VarSet(), needModule = false, g;
	for (var i = 0; i < deps.length; ++i) {
		if (deps[i] !== 'module') {
			g = globals.getGlobalByModule(deps[i]);
			if (!g) {
				return '';
			}
			variables.add(g);
		} else {
			needModule = true;
		}
	}

	g = globals.getGlobalByModule(mod);
	if (!g) {
		return '';
	}

	var assignment = variables.buildSetter(g),
		modulePart = needModule ? 'm={};m.id=m.filename=' + JSON.stringify(name) + ';' : '';

	var prologue = '(function(_,f';
	if (/^g=/.test(assignment)) {
		prologue += ',g';
	}
	if (modulePart) {
		prologue += ',m';
	}
	return prologue + '){' + modulePart + assignment + 'f(' +
		deps.map(function (path) {
			return path === 'module' ? 'm' : 'window' + variables.buildGetter(globals.getGlobalByModule(path, true));
		}).join(',') + ');})';
}


module.exports = prologueGlobals;

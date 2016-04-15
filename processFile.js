'use strict';


var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');

var VarSet = require('./VarSet');


// parsing constants

var doubleQuotedString = /"((?:\\"|[^"])*)"/g,
	singleQuotedString = /'((?:\\'|[^'])*)'/g,
	startPattern = /\s*\(\s*\[\s*/g,
	middlePattern = /\s*,\s*/g,
	endPattern = /\s*\]/g,
	definePattern = /^\s*define\b\s*/g;


function processFile (globals, loaders, newLoader) {
	return function (from, module, to) {
		var deps, prologue;

		// get source
		var text = fs.readFileSync(from, 'utf8').split(/\r?\n/);

		do {
			// check if it is a Heya UMD
			if (loaders.some(function (umd) { return umd === text[0]; })) {
				if (!newLoader) {
					// process the second line
					deps = parseDependencies(text[1], 0);
					if (!deps) {
						console.error('ERROR: a loader is detected in', from, '- but we cannot parse the dependency list - skipping.');
						return null;
					}
					// generate new prologue
					prologue = generatePrologue(deps, module, from, globals);
					if (!prologue) {
						console.error('ERROR: a loader is detected in', from, '- but some dependencies are unknown - skipping.');
						return null;
					}
					text[0] = prologue;
				} else {
					text[0] = newLoader;
				}
				break;
			}

			// check if it is a simple define()
			definePattern.lastIndex = 0;
			if (definePattern.test(text[0])) {
				if (!newLoader) {
					// process the first line
					deps = parseDependencies(text[0], definePattern.lastIndex);
					if (!deps) {
						console.error('ERROR: simple define() is detected in', from, '- but we cannot parse the dependency list - skipping.');
						return null;
					}
					// generate new prologue
					prologue = generatePrologue(deps, module, from, globals);
					if (!prologue) {
						console.error('ERROR: simple define() is detected in', from, '- but some dependencies are unknown - skipping.');
						return null;
					}
					text[0] = prologue + '\n' + text[0].slice(definePattern.lastIndex);
				} else {
					text[0] = newLoader + '\n' + text[0].slice(definePattern.lastIndex);
				}
				break;
			}

			console.warn('WARNING: no actionable prologue is detected in', from, '- skipping.');
			return null;
		} while (false);

		if (to) {
			mkdirp.sync(path.dirname(to));
			fs.writeFileSync(to, text.join('\n'), 'utf8');
		}

		return text;
	};
}

function match (pattern, text, index) {
	pattern.lastIndex = index;
	var result = pattern.exec(text);
	return result && result.index === index && result; // look strange? we want to return a result object, or a falsy value
}

function parseDependencies (text, index) {
	if (!match(startPattern, text, index)) {
		return null;
	}
	index = startPattern.lastIndex;
	var deps = [], expectedValue = true, expectedEnd = true, result;
	for(;;) {
		if (expectedEnd) {
			if (match(endPattern, text, index)) {
				break;
			}
		}
		if (expectedValue) {
			result = match(doubleQuotedString, text, index);
			if (result) {
				deps.push(result[1]);
				index = doubleQuotedString.lastIndex;
				expectedValue = false;
				expectedEnd = true;
				continue;
			}
			result = match(singleQuotedString, text, index);
			if (result) {
				deps.push(result[1]);
				index = singleQuotedString.lastIndex;
				expectedValue = false;
				expectedEnd = true;
				continue;
			}
			return null;
		}
		result = match(middlePattern, text, index);
		if (result) {
			index = middlePattern.lastIndex;
			expectedValue = true;
			expectedEnd = false;
			continue;
		}
		return null;
	}
	return deps;
}

function generatePrologue (deps, module, name, globals) {
	// normalize dependencies
	deps = deps.map(function (name) {
		if (name === 'module' || name.charAt(0) !== '.') {
			return name;
		}
		var norm = path.join(path.dirname(module), name);
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

	g = globals.getGlobalByModule(module);
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


module.exports = processFile;

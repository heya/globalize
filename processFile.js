'use strict';


var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');


// parsing constants

var doubleQuotedString = /"((?:\\"|[^"])*)"/g,
	singleQuotedString = /'((?:\\'|[^'])*)'/g,
	startPattern = /\s*\(\s*\[\s*/g,
	middlePattern = /\s*,\s*/g,
	endPattern = /\s*\]/g,
	definePattern = /^\s*define\b\s*/g;


function processFile (loaders, newLoader) {
	return function (from, mod, to) {
		var deps, prologue;

		// get source
		var text = fs.readFileSync(from, 'utf8').split(/\r?\n/);

		do {
			// check if it is a Heya UMD
			if (loaders.some(function (umd) { return umd === text[0]; })) {
				if (typeof newLoader == 'string') {
					text[0] = newLoader;
					break;
				}
				// process the second line
				deps = parseDependencies(text[1], 0);
				if (!deps) {
					console.error('ERROR: a loader is detected in', from, '- but we cannot parse the dependency list - skipping.');
					return null;
				}
				// generate new prologue
				prologue = newLoader(deps, mod, from);
				if (!prologue) {
					return null;
				}
				text[0] = prologue;
				break;
			}

			// check if it is a simple define()
			definePattern.lastIndex = 0;
			if (definePattern.test(text[0])) {
				if (typeof newLoader == 'string') {
					text[0] = newLoader + '\n' + text[0].slice(definePattern.lastIndex);
					break;
				}
				// process the second line
				deps = parseDependencies(text[0], definePattern.lastIndex);
				if (!deps) {
					console.error('ERROR: a loader is detected in', from, '- but we cannot parse the dependency list - skipping.');
					return null;
				}
				// generate new prologue
				prologue = newLoader(deps, mod, from);
				if (!prologue) {
					return null;
				}
				text[0] = prologue + '\n' + text[0].slice(definePattern.lastIndex);
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


module.exports = processFile;

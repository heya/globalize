'use strict';


var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');

var getReplacements = require('./getReplacements');
var getFiles = require('./getFiles');
var Globals  = require('./Globals');
var VarSet   = require('./VarSet');


// parsing constants

var heyaUmd = ['/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})'],
	doubleQuotedString = /"((?:\\"|[^"])*)"/g,
	singleQuotedString = /'((?:\\'|[^'])*)'/g,
	startPattern = /\s*\(\s*\[\s*/g,
	middlePattern = /\s*,\s*/g,
	endPattern = /\s*\]/g,
	definePattern = /^\s*define\b\s*/g;


// fetch JSON files
var packageJson = getJson('./package.json'),
	bowerJson = getJson('./bower.json');

// prepare file replacements
var replacements = getReplacements(packageJson);

// prepare the globals map
var globals = new Globals(packageJson);

// construct a list of files
var files = getFiles(bowerJson, globals.getDist());

// go over files
files.forEach(processFile);


// utilities

function getJson (name) {
	try {
		return JSON.parse(fs.readFileSync(name));
	} catch (e) {
		console.warn('WARN: can\'t use', name, '-', e.message);
	}
	return null;
}

function match (pattern, text, index) {
	pattern.lastIndex = index;
	var result = pattern.exec(text);
	return result && result.index === index && result; // look strange? we want to return a result object, or a falsy value
}

function processFile (from) {
	var name = replacements.hasOwnProperty(from) ? replacements[from] : from,
		module = './' + from.slice(0, -3),
		to = path.join(globals.getDist(), from),
		deps, prologue;

	if (!name) {
		// skip it
		return;
	}

	// get source
	var text = fs.readFileSync(name, 'utf8').split(/\r?\n/);

	do {
		// check if it is a Heya UMD
		if (heyaUmd.some(function (umd) { return umd === text[0]; })) {
			// process the second line
			deps = parseDependencies(text[1], 0);
			if (!deps) {
				console.error('ERROR: Heya UMD is detected in', name, '- we cannot parse the dependency list - skipping.');
				return;
			}
			// generate new prologue
			prologue = generatePrologue(deps, module);
			if (!prologue) {
				console.error('ERROR: Heya UMD is detected in', name, '- some dependencies are unknown - skipping.');
				return;
			}
			text[0] = prologue;
			break;
		}

		// check if it is a simple define()
		definePattern.lastIndex = 0;
		if (definePattern.test(text[0])) {
			// process the first line
			deps = parseDependencies(text[0], definePattern.lastIndex);
			if (!deps) {
				console.error('ERROR: simple define() is detected in', name, '- we cannot parse the dependency list - skipping.');
				return;
			}
			// generate new prologue
			prologue = generatePrologue(deps, module);
			if (!prologue) {
				console.error('ERROR: simple define() is detected in', name, '- some dependencies are unknown - skipping.');
				return;
			}
			text[0] = prologue + '\n' + text[0].slice(definePattern.lastIndex);
			break;
		}

		console.warn('WARNING: no actionable prologue is detected in', name, '- skipping.');
		return;
	} while (false);

	if (name === from) {
		console.log(from, '=>', to);
	} else {
		console.log(from, '=>', name, '=>', to);
	}

	mkdirp.sync(path.dirname(to));
	fs.writeFileSync(to, text.join('\n'), 'utf8');
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

function generatePrologue (deps, name) {
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

	g = globals.getGlobalByModule(name);
	if (!g) {
		return '';
	}

	var assignment = variables.buildSetter(g),
		module = needModule ? 'm={};m.id=m.filename=' + JSON.stringify(name) + ';' : '';

	var prologue = '(function(_,f';
	if (/^g=/.test(assignment)) {
		prologue += ',g';
	}
	if (module) {
		prologue += ',m';
	}
	return prologue + '){' + module + assignment + 'f(' +
		deps.map(function (path) {
			return path === 'module' ? 'm' : 'window' + variables.buildGetter(globals.getGlobalByModule(path));
		}).join(',') + ');})';
}

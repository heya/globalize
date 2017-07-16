'use strict';


var argv = require('minimist')(process.argv.slice(2));

// help
if (argv.h || argv.help) {
	console.log('Use: node heya-globalize/index.js [--amd|--cjs|--es6] ...');
	console.log('  Set module format:');
	console.log('    --amd generates an AMD prologue.');
	console.log('    --cjs generates an CommonJS prologue.');
	console.log('    --es6 generates an ES6 module prologue.');
	console.log('    Otherwise, a prologue based on browser globals is generated.');
	console.log('  Override directories:');
	console.log('    --source=src sets where to get files from.');
	console.log('    --config=cfg sets where to get configuration files.');
	console.log('    --target=trg sets where to save transformed files.');
	process.exit(2);
}


var path = require('path');

var getReplacements = require('./getReplacements');
var getJson  = require('./getJson');
var getFiles = require('./getFiles');
var Globals  = require('./Globals');
var processFile = require('./processFile');
var prologueGlobals = require('./prologueGlobals');
var prologueRequire = require('./prologueRequire');
var prologueImport  = require('./prologueImport');


// loaders
var loaders = ['/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})'];

// fetch JSON files
var	configDir   = typeof argv.config == 'string' ? argv.config : '.',
	packageJson = getJson(path.join(configDir, 'package.json')),
	bowerJson   = getJson(path.join(configDir, 'bower.json'));

// prepare file replacements
var replacements = getReplacements(packageJson);

// prepare the globals map
var globals = new Globals(packageJson.browserGlobals, packageJson.name);
if (typeof argv.source == 'string') {
	globals.globals['!from'] = argv.source;
}
if (typeof argv.target == 'string') {
	globals.globals['!dist'] = argv.target;
}

// construct a list of files
var files = getFiles(bowerJson, globals);

// prepare a prologue generator
var newLoader;
if (argv.amd) {
	console.log('converting to AMD...');
	newLoader = 'define';
} else if (argv.cjs) {
	console.log('converting to CommonJS...');
	newLoader = prologueRequire;
} else if (argv.es6) {
	console.log('converting to ES6 modules...');
	newLoader = prologueImport;
} else {
	console.log('converting to browser globals...');
	newLoader = prologueGlobals(globals);
}

// go over files
var pf = processFile(loaders, newLoader);
files.forEach(function (name) {
	var relative = path.relative(globals.getFrom(), name),
		ext = path.extname(relative),
		mod = './' + (ext ? relative.slice(0, -ext.length) : relative),
		from = replacements.hasOwnProperty(relative) ? replacements[relative] : relative,
		to = path.join(globals.getDist(), relative);
	if (from) {
		from = path.join(globals.getFrom(), from);
		if (name === from) {
			console.log(name, '=>', to);
		} else {
			console.log(name, '=>', from, '=>', to);
		}
		pf(from, mod, to);
	}
});

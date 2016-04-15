'use strict';


var path = require('path');

var getReplacements = require('./getReplacements');
var getJson  = require('./getJson');
var getFiles = require('./getFiles');
var Globals  = require('./Globals');
var processFile = require('./processFile');


// fetch JSON files
var packageJson = getJson('./package.json'),
	bowerJson   = getJson('./bower.json');

// prepare file replacements
var replacements = getReplacements(packageJson);

// prepare the globals map
var globals = new Globals(packageJson.browserGlobals, packageJson.name);

// construct a list of files
var files = getFiles(bowerJson, globals);


var loaders = ['/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})'];


// go over files
var pf = processFile(globals, loaders);
files.forEach(function (name) {
	var ext = path.extname(name),
		mod = './' + (ext ? name.slice(0, -ext.length) : name),
		from = replacements.hasOwnProperty(name) ? replacements[name] : name,
		to = path.join(globals.getDist(), name);
	if (from) {
		if (name === from) {
			console.log(name, '=>', to);
		} else {
			console.log(name, '=>', from, '=>', to);
		}
		pf(from, mod, to);
	}
});

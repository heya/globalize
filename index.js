'use strict';


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
var globals = new Globals(packageJson);

// construct a list of files
var files = getFiles(bowerJson, globals.getDist());


var loaders = ['/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})'];


// go over files
files.forEach(processFile(replacements, globals, loaders));

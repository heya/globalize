'use strict';


var fs = require('fs');


// everything should be transformed at this point


// concatenate all transformed files in a test module

var writeable = fs.createWriteStream('test-module.js');

function dump (name, end) {
	return function () {
		var readable = fs.createReadStream(name);
		return new Promise(function (resolve, reject) {
			readable.on('end', function (error) {
				if (error) {
					reject(error);
				} else {
					resolve(true);
				}
			});
			readable.pipe(writeable, {end: !!end});
		});
	};
}

dump('prologue.js')().
	then(dump('out/c.js')).
	then(dump('out/b.js')).
	then(dump('out/a.js')).
	then(dump('out/d.js')).
	then(dump('out/e.js')).
	then(dump('out/f.js')).
	then(dump('epilogue.js', true)).
	then(function () {
		var test = require('./test-module');
		process.exit(test() ? 0 : 2);
	}).
	catch(function (error) {
		console.error('ERROR:', error);
		process.exit(1);
	});

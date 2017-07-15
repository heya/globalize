'use strict';


function prologueRequire (deps, mod, from) {
	var prologue = generatePrologue(deps);
	if (!prologue) {
		console.error('ERROR: a loader is detected in', from, '- but some dependencies are unknown - skipping.');
		return null;
	}
	return prologue;
}


function generatePrologue (deps) {
	return deps.map(function (name, index) {
			return name === 'module' ? '' : 'import m' + index + ' from ' + JSON.stringify(name) + ';';
		}).join('') + 'export default ((_,f)=>f(' + deps.map(function (_, index) {
			return 'm' + index;
		}).join(',') + '))';
}


module.exports = prologueRequire;

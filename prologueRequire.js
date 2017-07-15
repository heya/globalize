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
	return '(function(_,f){module.exports=f(' + deps.map(function (name) {
			return name === 'module' ? name : 'require(' + JSON.stringify(name) + ')';
		}).join(',') + ');})';
}


module.exports = prologueRequire;

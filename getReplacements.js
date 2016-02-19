'use strict';


module.exports = function (packageJson) {
	var replacements = {};

	if (packageJson && packageJson.browser) {
		if (typeof packageJson.browser == 'string') {
			replacements[toRelativeName(packageJson.main || './index.js')] = toRelativeName(packageJson.browser);
		} else {
			replacements = packageJson.browser;
		}
	}

	return replacements;
};


function toRelativeName (name) {
	return name.charAt(0) === '.' && name.charAt(1) === '/' ? name : './' + name;
}

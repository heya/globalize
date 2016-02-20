define(["./b", "./c"], function(b, c){
	"use strict";
	window.heya = window.heya || {};
	window.heya.F = function () {
		if (b() !== 'b') return false;
		if (c() !== 'c') return false;
		return 'f';
	};
	return null;
});

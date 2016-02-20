define(['module', 'boom', 'boom/Hello-World', 'wham!'], function(module, boom, helo, wham){
	"use strict";
	window.heya = window.heya || {};
	window.heya.D = function () {
		if (boom() !== 'boom') return false;
		if (helo() !== 'helo') return false;
		if (wham() !== 'wham') return false;
		if (module.id !== './d') return false;
		return 'd';
	};
	return null;
});

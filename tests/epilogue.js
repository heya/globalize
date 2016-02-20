module.exports = function () {
	if (window.heya.example.a() !== 'a') return false;
	if (window.heya.example.b() !== 'b') return false;
	if (window.heya.example.c() !== 'c') return false;
	if (window.heya.example.e() !== 'e') return false;
	if (window.heya.D() !== 'd') return false;
	if (window.heya.F() !== 'f') return false;
	return true;
};

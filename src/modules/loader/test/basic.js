var assert = chai.assert;

describe('Существование модуля', function() {
	var module;

	before(function () {
		module = $('.b-loader');
	});

	/*
	//не обязательно, т.к. модуль может подключаться динамически
	it('должен быть в dom', function(){
		assert.notEqual(module.length, '0', 'Должен быть в dom');
	});
	*/
});
/* global app */
(function (window, $, app) {
	app.set({
		animation: 400
	});

	app.start('index', {
		links: [
			{"title":"First","url":"/index/index"},
			{"title":"Second","url":"/index/second"}
		]
	}, '#layout');
}(window, jQuery, app));
/* global -app */
/* global app */
(function (window, $, app) {
	app.set({
		animation: 400
	});

	app.start('index', {
		links: [
			{"title":"First","url":"/page-app/index/index"},
			{"title":"Second","url":"/page-app/index/second"}
		]
	}, '#layout');
}(window, jQuery, app));
/* global -app */
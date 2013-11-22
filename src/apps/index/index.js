/* global app */
(function (window, $, app) {
	app.set({
		animation: 400
	});

	app.start('index', {
		links: [
			{"title":"First","url":"/page-app/index"},
			{"title":"Second","url":"/page-app/second"}
		]
	}, '#layout');
}(window, jQuery, app));
/* global -app */
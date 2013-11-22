(function (window, $) {
	var App = window.App,
		Sandbox = window.Sandbox;

	App.prototype.ajax = function (data) {
		var options = {
				type: 'GET',
				dataType: 'json',
				contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
				traditional: true,
				cache: false
			},
			api = this.get('api');

		if (data.url && api) {
			data.url = api + data.url;
		}

		return $.ajax($.extend(options, data));
	};

	Sandbox.prototype.ajax = function (url, data) {
		var options;

		if (typeof(url) === 'string') {
			options = {};
			options.url = url;
			options.data = data;
		} else {
			data = url;
		}

		return this.app.ajax(options || data);
	};
}(window, jQuery));
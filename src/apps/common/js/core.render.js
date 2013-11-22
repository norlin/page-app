(function (window) {
	var App = window.App,
		Sandbox = window.Sandbox;

	App.prototype.render = function (template, data, callback) {
		return dust.render(template, data, callback);
	};

	App.prototype.getTemplates = function () {
		return dust.cache;
	};

	Sandbox.prototype.render = function (template, data, callback) {
		return this.app.render(template, data, callback);
	};

	Sandbox.prototype.getTemplates = function () {
		return this.app.getTemplates();
	};
}(window));
(function (window) {
	/**
	 * Песочница для модулей
	 */
	var Sandbox = function (app, name, parentModule) {
		this.children = [];
		this.init(app, name);

		this.parent = parentModule;
		if (parentModule) {
			parentModule.children.push(this);
		}
	};

	Sandbox.prototype.init = function (app, name) {
		this.app = app;
		this.name = name;

		this.createId();
	};

	Sandbox.prototype.ready = function () {
		this.working = true;
	};

	Sandbox.prototype.createId = function () {
		var ts;

		if (!this.id) {
			ts = (new Date()).getTime();

			this.id = ts + '_' + Math.floor(Math.random() * 10000);
		}
	};

	window.Sandbox = Sandbox;
} (window));
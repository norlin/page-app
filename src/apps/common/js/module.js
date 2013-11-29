(function (window, $) {
	/**
	 * Конструктор модуля
	 */
	var Module = function () {
		this.init();
	};

	Module.prototype.init = function () {
		this.data = {};

		if (this.template === undefined) {
			this.template = this.name;
		}
	};

	Module.prototype.set = function (data) {
		this.data = extend(this.data, data);
	};

	Module.prototype.start = function (sandbox) {
		var module = this,
			ready = $.Deferred();

		this.sandbox = sandbox;
		this.id = sandbox.id;

		if (this.template) {
			if (module.data.dom) {
				module.options = module.data.dom.data('options');
			}

			this.render(function () {
				if (module.data.dom) {
					module.data.dom.replaceWith(module.node);
				}

				sandbox.bind('append', 'create', function () {
					var moduleReady;

					sandbox.unbind('append', 'create');

					if (module.node) {
						module.node.data('Module', module);
					}

					moduleReady = module.ready(sandbox);
					if (moduleReady) {
						moduleReady.done(sandbox.ready());
					} else {
						sandbox.ready();
					}
				});
				ready.resolve(module);
			});
		} else {
			this.ready();
			ready.resolve(module);
		}

		return ready;
	};

	Module.prototype.processDOM = function (callback) {
		var module = this,
			moduleSource,
			ajaxErr;

		if (module.data.dom) {
			moduleSource = module.data.dom.html();
		}

		this.data.module = {
			id: module.id,
			options: this.options,
			content: moduleSource
		};

		if (this.options.ajax) {
			return this.sandbox.ajax({
				url: this.options.ajax,
				data: this.options.json || {},
				success: function (data) {
					module.options.json = data;
				},
				error: function (err) {
					ajaxErr = err;
				},
				complete: function () {
					if (typeof(callback) === 'function') {
						callback.call(module, ajaxErr);
					}
				}
			});
		}

		if (typeof(callback) === 'function') {
			callback.apply(module);
		}
	};
//
	Module.prototype.render = function (callback) {
		var module = this;

		this.processDOM(function () {
			dust.render(this.name + '/' + this.template, this.data, function (err, moduleHtml) {
				if (err) {
					throw err;
				}

				module.node = $(moduleHtml);

				callback();
			});
		});
	};

	Module.prototype.ready = function () {
		//module usage
		window.console.warn('Please, define `ready` method for module `' + this.name + '`');
	};

	window.Module = Module;
} (window, jQuery));
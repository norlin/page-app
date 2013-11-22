/* global Module,Sandbox */
(function (window, $) {
	var App = function () {
		this.init();
	};

	App.prototype.init = function () {
		var data = {
				basePath: window.location.pathname.replace(/\/[^\/]*?$/,''),
				indexPath: window.location.pathname.replace(/^.*\/([^\/]*)$/,'$1')
			};

		if (window.IsDev) {
			data.development = true;
		}

		this.$ = $;

		this.sandboxes = [];
		this.modules = {};
		this.pages = [];

		this.set = function (newData) {
			data = extend(data, newData);
		};

		this.get = function (param) {
			return data[param];
		};
	};

	/**
	 * Создание потомка класса Модуль
	 */
	App.prototype.createModule = function (params, onready) {
		if (typeof(params) === 'string') {
			params = {
				name: params
			};
		}

		function emptyReady () {}

		this.modules[params.name] = function () {
			var param;
			Module.apply(this, arguments);

			for (param in params) {
				if (params.hasOwnProperty(param)) {
					this[param] = params[param];
				}
			}
		};

		this.modules[params.name].prototype = Object.create(Module.prototype);
		this.modules[params.name].prototype.name = params.name;

		if (typeof(onready) === 'function') {
			this.modules[params.name].prototype.ready = onready;
		} else if (onready === null) {
			this.modules[params.name].prototype.ready = emptyReady;
		}

		return this.modules[params.name];
	};

	App.prototype.create = function (moduleType, data, callback, parentModule) {
		var module,
			sandbox,
			CurrentModule = this.modules[moduleType];

		if (CurrentModule) {
			module = new CurrentModule();
			module.set(data);

			sandbox = new Sandbox(this, module.name, parentModule);
			this.sandboxes.push(sandbox);

			module.start(sandbox).done(function (module) {
				callback(module, sandbox);
			});
		} else {
			throw 'Module "' + moduleType + '" not found!';
			//callback();
		}
	};

	App.prototype.renderModules = function (node, container, parentModule, callback) {
		if (typeof(container) === 'function') {
			callback = container;
			container = undefined;
		}

		if (typeof(parentModule) === 'function') {
			callback = parentModule;
			parentModule = undefined;
		}

		var app = this,
			wrapper = $('<div></div>');

		wrapper.append(node);

		this.initModules(wrapper, function () {
			if (!container) {
				container = app.container;
				app.node = app.container;
			}

			container.empty();
			container.append(wrapper.contents());

			app.trigger('append');
			app.trigger('resize');

			if (callback) {
				callback();
			}
		}, parentModule);
	};

	App.prototype.initModules = function (container, callback, parentModule) {
		var app = this,
			loaders = [],
			modules;

		modules = container.find('[data-type=module]').addBack('[data-type=module]').not('[data-type=module] [data-type=module]');
		modules.each(function () {
			var loader = $.Deferred();
			loaders.push(loader);

			app.initModule(this, function () {
				loader.resolve();
			}, parentModule);
		});

		function initDone() {
			//remove uninited modules from template
			modules.remove();
			callback();
		}

		if (callback) {
			if (loaders.length) {
				$.when.apply($, loaders).done(initDone);
			} else {
				initDone();
			}
		}
	};

	App.prototype.initModule = function (moduleNode, callback, parentModule) {
		var app = this,
			$this = $(moduleNode),
			name = $this.data('name');

		if (name) {
			app.create(name, {dom: $this}, function (module, sandbox) {
				if (module && module.node) {
					app.initModules(module.node, callback, sandbox);
				} else {
					callback();
				}
			}, parentModule);
		} else {
			callback();
		}
	};

	App.prototype.start = function (name, data, container, callback) {
		var app = this;

		this.name = name;

		function start() {
			var page,
				pageRx = /^page\/(.*)$/,
				templates = app.getTemplates();

			for (page in templates) {
				if (templates.hasOwnProperty(page) && pageRx.test(page)) {
					app.pages.push(page.replace(pageRx, '$1'));
				}
			}

			app.container = $(container) || $('body');

			callback = callback || function () {
				app.trigger('hide.loader', 'start');
			};

			app.render(app.name, data, function (err, html) {
				app.node = $('<div></div>');
				app.node.html(html);

				if (err) {
					throw err;
				}

				app.renderModules(app.node, callback);
			});

			$(window).resize(function (e) {
				app.trigger('resize', e);
			}).scroll(function (e) {
				app.trigger('scroll', e);
			});
		}

		$(start);
	};

	App.prototype.pushState = function (data, title, url) {
		window.history.pushState(data, title, url);
	};

	App.prototype.replaceState = function (data, title, url) {
		window.history.replaceState(data, title, url);
	};

	/* exported App */
	window.App = App;

	/* exported app */
	window.app = new App();
} (window, jQuery));
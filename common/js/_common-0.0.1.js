if (!Object.create) {
    Object.create = (function(){
        function F(){}

        return function(o){
            if (arguments.length != 1) {
                throw new Error('Object.create implementation only accepts one parameter.');
            }
            F.prototype = o;
            return new F();
        };
    })();
}

if (typeof(Function.bind) !== "function"){
    Function.prototype.bind = function(bindTo){
        var fn = this;

        return function(){
            fn.apply(bindTo,arguments);
        };
    };
}


if (typeof([].forEach) !== "function"){
    Array.prototype.forEach = function(fn, thisObj) {
        var i, l;

        for (i = 0, l = this.length; i < l; i+=1) {
            if (i in this) {
                fn.call(thisObj, this[i], i, this);
            }
        }
    };
}

if (typeof([].indexOf) !== "function"){
    Array.prototype.indexOf = function(elt /*, from*/){
        var len = this.length,
            from = Number(arguments[1]) || 0;

        from = (from < 0) ? Math.ceil(from): Math.floor(from);
        if (from < 0){
            from += len;
        }

        for (; from < len; from+=1){
            if (from in this && this[from] === elt){
                return from;
            }
        }
        return -1;
    };
}

if (typeof([].map) !== "function") {
    Array.prototype.map = function(mapper, that /*opt*/) {
        var other = new Array(this.length),
            i,
            n = this.length;

        for (i = 0; i < n; i+=1) {
            if (i in this) {
                other[i] = mapper.call(that, this[i], i, this);
            }
        }

        return other;
    };
}

if (typeof([].filter) !== "function") {
    Array.prototype.filter = function(filter, that /*opt*/) {
        var other = [],
            v,
            i,
            n = this.length;

        for (i = 0; i < n; i += 1) {
            if (i in this && filter.call(that, v = this[i], i, this)) {
                other.push(v);
            }
        }

        return other;
    };
}

/* exported extend */
function extend () {
    return jQuery.extend.apply(jQuery, arguments);
}

/* exported decorate */
function decorate (originFunction, decoratorFunction) {
    return function () {
        originFunction.apply(this, arguments);
        decoratorFunction.apply(this, arguments);
    };
}

/* exported wordEnd */
function wordEnd(word,num){
    //word = ['сайтов','сайта','сайт']
    var num100 = num % 100;

    if (num === 0){
        return typeof(word[3]) !== 'undefined' ? word[3] : word[0];
    }
    if (num100 > 10 && num100 < 20){
        return word[0];
    }
    if ( (num % 5 >= 5) && (num100 <= 20) ){
        return word[0];
    }else{
        num = num % 10;
        if (((num >= 5) && num <= 9) || (num === 0)){
            return word[0];
        }
        if ((num >= 2) && (num <= 4)){
            return word[1];
        }
        if (num === 1){
            return word[2];
        }
    }
    return word[0];
}

/* exported getRandom */
function getRandom(min,max){
    min = min || 1;
    if (!max){
        max = min;
        min = 0;
    }

    return Math.floor(Math.random()*(max-min) + min);
}

(function (window, $) {
    jQuery.fn.blockHide = function (duration, callback) {
        var $this = $(this),
            timer = $this.data('fadeTimer');

        if (timer) {
            window.clearTimeout(timer);
        }

        $this.addClass('g-fade');
        timer = window.setTimeout(function () {
            $this.addClass('g-hidden');

            if (callback) {
                callback.apply(this);
            }
        }, duration);

        $this.data('fadeTimer', timer);
    };

    jQuery.fn.blockShow = function (duration, callback) {
        var $this = $(this),
            timer = $this.data('fadeTimer');

        if (timer) {
            window.clearTimeout(timer);
        }

        $this.removeClass('g-hidden');
        timer = window.setTimeout(function () {
            $this.removeClass('g-fade');

            timer = window.setTimeout(function () {
                if (callback) {
                    callback.apply(this);
                }
            }, duration);

            $this.data('fadeTimer', timer);
        }, 13);

        $this.data('fadeTimer', timer);
    };
} (window, jQuery));/* global Module,Sandbox */
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
				pageRx = /^page\/(.*)$/;

			for (page in dust.cache) {
				if (dust.cache.hasOwnProperty(page) && pageRx.test(page)) {
					app.pages.push(page.replace(pageRx, '$1'));
				}
			}

			app.container = $(container) || $('body');

			callback = callback || function () {
				app.trigger('hide.loader', 'start');
			};

			dust.render(app.name, data, function (err, html) {
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
} (window, jQuery));(function (window) {
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
} (window));(function (window, $) {
	/**
	 * Module constructor
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

	Module.prototype.processDOM = function () {
		var module = this,
			moduleSource;

		if (module.data.dom) {
			moduleSource = module.data.dom.html();
		}

		this.data.module = {
			id: module.id,
			options: this.options,
			content: moduleSource
		};
	};
//
	Module.prototype.render = function (callback) {
		var module = this;
		this.processDOM();

		dust.render(this.name + '/' + this.template, this.data, function (err, moduleHtml) {
			if (err) {
				throw err;
			}

			module.node = $(moduleHtml);

			callback();
		});
	};

	Module.prototype.ready = function () {
		//module usage
		window.console.warn('Please, define `ready` method for module `' + this.name + '`');
	};

	window.Module = Module;
} (window, jQuery));(function() {
/**
 * Подключение dust-хэлперов для node.js и browser использования
 */

    var helpers = {};

    function addHelpers (dust) {
        var helper;

        dust.helpers = dust.helpers || {};

        for (helper in helpers) {
            if (helpers.hasOwnProperty(helper)) {
                dust.helpers[helper] = helpers[helper];
            }
        }
    }

    /* HELPERS HERE */

    helpers.my = function (chunk, ctx, bodies, params) {
        var body = bodies.block,
            //content,
            moduleTypes = {
                table: {
                    node: 'table'
                },
                form: {
                    node: 'form'
                }
            },
            moduleType = dust.helpers.tap(params.module, chunk, ctx),
            moduleParams = moduleTypes[moduleType] || {},
            paramName,
            saveData;

        for (paramName in params) {
            if (params.hasOwnProperty(paramName)) {
                moduleParams[paramName] = dust.helpers.tap(params[paramName], chunk, ctx);
            }
        }

        moduleParams.node = moduleParams.node || 'div';

        function createModuleHtml (moduleParams, content) {
            var opt = '';
            content = content || '';

            opt = "data-options='" + JSON.stringify(moduleParams) + "'";

            return '<' + moduleParams.node + ' data-type="module" data-name="' + moduleParams.module + '" ' + opt + '>' + content + '</' + moduleParams.node + '>';
        }

        ctx = ctx.push(params);
        if (ctx.stack.tail && ctx.stack.tail.head) {
            ctx = ctx.push(ctx.stack.tail.head);
        }

        if (bodies.json) {
            saveData = chunk.data;
            chunk.data = [];
            moduleParams.json = dust.helpers.tap(bodies.json, chunk, ctx);
            moduleParams.json = JSON.parse(moduleParams.json);
            chunk.data = saveData;
        }

        if (body) {
            return chunk.write(createModuleHtml(moduleParams, dust.helpers.tap(body, chunk, ctx)));
        }

        return chunk.write(createModuleHtml(moduleParams));
    };

    helpers.partial = function (chunk, ctx, bodies, params) {
        var body = bodies.block,
            partial = dust.helpers.tap(params.name, chunk, ctx),
            partialChunk;

        if (body) {
            partialChunk = chunk.partial(partial, ctx.push(params), {
                content: dust.helpers.tap(body, chunk, ctx.push(params))
            });

            return chunk;
        } else {
            partialChunk = chunk.partial(partial, ctx);
        }

        //chunk.end();

        return chunk;
    };

    /* end helpers */

    /* global module */
    if (typeof(module) !== 'undefined') {
        module.exports = addHelpers;
    } else if (typeof(dust) !== 'undefined') {
        addHelpers(dust);
    } else {
        throw "Can't find Dust!";
    }
}());/* global decorate */
(function (window) {
	var Sandbox = window.Sandbox,
		App = window.App;

	// decorate возвращает функцию, которая
	// выполняет сначала первую функцию-аргумент, потом вторую
	// с сохранением контекста и переданными аргументами
	Sandbox.prototype.init = decorate(Sandbox.prototype.init, function () {
		// дополняем инициализацию Sandbox
		// нужными полями
		this.triggers = {};

		this.bufferedEvents = [];
	});

	Sandbox.prototype.ready = decorate(Sandbox.prototype.ready, function () {
		var sandbox = this,
			i,
			l;

		// выполнение отложенных эвентов
		// в порядке их сохранения
		for (i = 0, l = this.bufferedEvents.length; i < l; i += 1) {
			sandbox.trigger(this.bufferedEvents.shift());
		}
	});

	/**
	 * Добавление обработчика события
	 * @param  {string}   eventType тип эвента
	 * @param  {string}   ns        неймспейс эвента (опционально)
	 * @param  {Function} callback  собственно, обработчик
	 */
	Sandbox.prototype.bind = function (eventType, ns, callback) {
		var moduleType;

		eventType = eventType.split('.');
		moduleType = eventType[1] || undefined;
		eventType = eventType[0];

		if (typeof(ns) === 'function') {
			callback = ns;
			ns = '';
		}

		this.triggers[eventType] = this.triggers[eventType] || [];

		// сохранение обработчика
		this.triggers[eventType].push({
			ns: ns,
			module: moduleType,
			callback: callback
		});
	};

	/**
	 * удаление обработчиков для определённого типа эвентов
	 * @param  {string} eventType тип эвента
	 * @param  {string} ns        неймспейс для уточнения (опционально)
	 */
	Sandbox.prototype.unbind = function (eventType, ns) {
		var moduleType;

		eventType = eventType.split('.');
		moduleType = eventType[1] || undefined;
		eventType = eventType[0];

		if (this.triggers[eventType]) {
			// если указан неймспейс, то чистим эвенты
			// только этого неймспейса
			if (ns || moduleType) {
				this.triggers[eventType] = this.triggers[eventType].filter(function (trigger) {
					if (trigger.ns === ns && trigger.module === moduleType) {
						return false;
					}

					return true;
				});
			} else {
				// если неймспейс не указан, то удаляем
				// все обработчики данного типа
				this.triggers[eventType] = [];
			}
		}
	};

	function checkEvent (event, ns, data) {
		var moduleType;

		if (typeof (event) === 'string') {
			event = event.split('.');
			moduleType = event[1] || undefined;
			event = event[0];

			if (typeof(ns) !== 'string') {
				data = ns;
				ns = undefined;
			}

			return new Event(event, ns, {
				data: data,
				module: moduleType
			});
		}

		return event;
	}

	/**
	 * Выполнение обработчиков эвента
	 * @param  {Object|string} event эвент или тип эвента
	 * @param  {string} ns    неймспейс (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.trigger = function (event, ns, data) {
		var sandbox = this;

		if (!event.module || (event.module === sandbox.name)) {
			event = checkEvent(event, ns, data);

			if (this.working || event.type === 'append') {
				// если модуль готов к работе,
				// выполняем обработчики
				if (this.triggers[event.type]) {
					this.triggers[event.type].forEach(function (trigger) {
						// при уточнении неймспейса, выполняем
						// только нужные обработчики
						if (
							(!trigger.module || (trigger.module === event.module)) &&
							(!event.ns || (trigger.ns === event.ns))
						) {
							trigger.callback.call(sandbox, event);
						}
					});
				}
			} else {
				// если модуль ещё не готов,
				// сохраняем эвент в отложенный список
				this.bufferedEvents.push(event);
			}
		}
	};

	/**
	 * Посылание эвента
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.emit = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		// дёргаем обработчик эвента у всего приложения
		this.app.trigger(event);
	};

	/**
	 * Посылание эвента вверх по родителям
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.bubble = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		// выполняем собственный обработчик
		this.trigger(event);

		// дёргаем бабблинг у родителя
		// если он есть
		if (this.parent) {
			this.parent.bubble(event, ns, data);
		}
	};

	/**
	 * Посылание эвента вниз внутренним модулям
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.notify = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		// выполняем собственный обработчик
		this.trigger(event);

		// дёргаем уведомление у детей
		this.children.forEach(function (child) {
			child.notify(event, ns, data);
		});
	};

	/**
	 * Выполнение обработчиков у всех песочниц
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	App.prototype.trigger = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		this.sandboxes.forEach(function (sandbox) {
			sandbox.trigger(event);
		});
	};

	/**
	 * Эвент-сообщение
	 * @param {string} type тип эвента
	 * @param {string} ns   неймспейс эвента
	 * @param {object} data данные
	 */
	var Event = function (type, ns, params) {
		this.type = type;
		this.ns = ns || undefined;
		this.data = extend({}, params.data);

		if (params.module) {
			this.module = params.module;
		}
	};
}(window));
/* global -decorate */(function(){dust.register("404",body_0);function body_0(chk,ctx){return chk.write("<h2>Page not found!</h2><div class=\"b-block\">Page not found!You can <a href=\"javascript:back()\">go back</a> or try to <a href=\"").reference(ctx._get(false, ["base"]),ctx,"h").write("\" data-type=\"route\">open&nbsp;main&nbsp;page</a>.</div>");}return body_0;})();(function(){dust.register("layout",body_0);var blocks={'scripts':body_1};function body_0(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("<!doctype html><html lang=\"ru\"><head><meta charset=\"UTF-8\" />\n<title>").exists(ctx._get(false, ["title"]),ctx,{"else":body_6,"block":body_7},null).write("</title>").section(ctx._get(false,["layout","styles"]),ctx,{"block":body_8},null).exists(ctx._get(false,["layout","stylesIE"]),ctx,{"block":body_9},null).notexists(ctx._get(false,["layout","scriptsTest"]),ctx,{"block":body_11},null).write("</head><body>").exists(ctx._get(false,["layout","scriptsTest"]),ctx,{"block":body_12},null).write("<div id=\"layout\" class=\"g-layout\">").reference(ctx._get(false, ["html"]),ctx,"h").write("</div><div class=\"b-loader_curtain g-transition-opacity\"></div><div class=\"b-loader_block g-transition-opacity\"><i class=\"b-loader\"></i>Loading...</div>").exists(ctx._get(false,["layout","scriptsTest"]),ctx,{"block":body_15},null).write("</body></html>");}function body_1(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.exists(ctx._get(false,["layout","development"]),ctx,{"block":body_2},null).section(ctx._get(false,["layout","scripts"]),ctx,{"block":body_3},null).exists(ctx._get(false,["layout","scriptsIE"]),ctx,{"block":body_4},null);}function body_2(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<script type=\"text/javascript\">var IsDev = true;</script>");}function body_3(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<script src=\"").reference(ctx._get(true,[]),ctx,"h").write("\" type=\"text/javascript\"></script>");}function body_4(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<!-- [if lt IE 9]>").section(ctx._get(false,["layout","scriptsIE"]),ctx,{"block":body_5},null).write("\n<![endif]-->");}function body_5(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<script src=\"").reference(ctx._get(true,[]),ctx,"h").write("\" type=\"text/javascript\"></script>");}function body_6(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("Медтера");}function body_7(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.reference(ctx._get(false, ["title"]),ctx,"h");}function body_8(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<link rel=\"stylesheet\" href=\"").reference(ctx._get(true,[]),ctx,"h").write("\" />");}function body_9(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<!--[if lt IE 9]>").section(ctx._get(false,["layout","stylesIE"]),ctx,{"block":body_10},null).write("\n<![endif]-->");}function body_10(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<link rel=\"stylesheet\" href=\"").reference(ctx._get(true,[]),ctx,"h").write("\" />");}function body_11(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.block(ctx.getBlock("scripts"),ctx,{},null);}function body_12(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("<div id=\"mocha\"></div>").section(ctx._get(false,["layout","scriptsTest"]),ctx,{"block":body_13},null).write("<script type=\"text/javascript\">mocha.ui('bdd');mocha.reporter('html');</script>").section(ctx._get(false,["layout","scriptsTestCases"]),ctx,{"block":body_14},null);}function body_13(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<script src=\"").reference(ctx._get(true,[]),ctx,"h").write("\" type=\"text/javascript\"></script>");}function body_14(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.write("\n<script src=\"").reference(ctx._get(true,[]),ctx,"h").write("\" type=\"text/javascript\"></script>");}function body_15(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.block(ctx.getBlock("scripts"),ctx,{},null).write("\n<script type=\"text/javascript\">if (window.mochaPhantomJS) { mochaPhantomJS.run(); }else { mocha.run(); }</script>");}return body_0;})();(function(){dust.register("module.css",body_0);function body_0(chk,ctx){return chk.write(".b-").reference(ctx._get(false, ["moduleName"]),ctx,"h").write(" {position: relative;}");}return body_0;})();(function(){dust.register("module",body_0);function body_0(chk,ctx){return chk.write("<").reference(ctx._get(false, ["node"]),ctx,"h").write(" data-type=\"module\" data-name=\"").reference(ctx._get(false, ["moduleName"]),ctx,"h").write("\">").reference(ctx._get(false, ["body"]),ctx,"h").write("</").reference(ctx._get(false, ["node"]),ctx,"h").write(">");}return body_0;})();(function(){dust.register("module.dust",body_0);function body_0(chk,ctx){return chk.write("<div class=\"b-").reference(ctx._get(false, ["moduleName"]),ctx,"h").write("\">{module.content|s}</div>");}return body_0;})();(function(){dust.register("module.js",body_0);function body_0(chk,ctx){return chk.write("/* global app */(function ($, app) {var ").reference(ctx._get(false, ["ModuleName"]),ctx,"h").write(" = app.createModule('").reference(ctx._get(false, ["moduleName"]),ctx,"h").write("', function (sandbox) {var module = this;//module usage});/*").reference(ctx._get(false, ["ModuleName"]),ctx,"h").write(".prototype.render = function (ready) {var module = this,moduleSource = this.data.dom; //`<div data-type=\"module\">` node from app templatethis.processDOM();//method for custom html rendererdust.render(this.name + '/' + this.template, this.data, function (err, moduleHtml) {//you should create some module nodemodule.node = $(moduleHtml);ready();});};*/} (jQuery, app));/* global -app */");}return body_0;})();(function(){dust.register("module.test.js",body_0);function body_0(chk,ctx){return chk.write("/* global app,chai,describe,before,it,$ */var assert = chai.assert;describe('Module existance', function() {var module;before(function () {module = $('.b-").reference(ctx._get(false, ["moduleName"]),ctx,"h").write("');});/*//not nessesarly, `cause module could connect in runtimeit('должен быть в dom', function(){assert.notEqual(module.length, '0', 'Must be in DOM');});*/});/* global -app,chai,describe,before,it,$ */");}return body_0;})();
(function(){dust.register("index",body_0);function body_0(chk,ctx){return chk.write("<h1>Hello, world!</h1>").helper("my",ctx,{"json":body_1,"block":body_2},{"module":"nav"}).helper("my",ctx,{},{"module":"router","index":"index"}).helper("my",ctx,{},{"module":"loader"});}function body_1(chk,ctx){return chk.reference(ctx._get(false, ["links"]),ctx,"h",["js","s"]);}function body_2(chk,ctx){return chk;}return body_0;})();/* global app */
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
/* global -app */(function(){dust.register("pages/index",body_0);function body_0(chk,ctx){return chk.write("<div>My first page</div>");}return body_0;})();(function(){dust.register("pages/second",body_0);function body_0(chk,ctx){return chk.write("<div>My second page</div>");}return body_0;})();/* global app */
(function ($, app) {
	var classes = {
			item: 'b-nav_item',
			link: 'b-nav_link',
			itemActive: 'b-nav_item__active',
			routeActive: 'b-router_link__active'
		};

	app.createModule('nav', function (sandbox) {
		var items = this.node.find('.' + classes.item),
			links = this.node.find('.' + classes.link);

		sandbox.bind('page', function (e) {
			var page = e.data.page,
				rootPage = page.split('/')[0];

			items.removeClass(classes.itemActive);
			links.filter('[href$=' + rootPage + ']').parent().addClass(classes.itemActive);
		});
	});
} (jQuery, app));
/* global -app */(function(){dust.register("nav/nav",body_0);function body_0(chk,ctx){return chk.write("<nav class=\"b-nav\"><ul class=\"b-nav_list\">").section(ctx._get(false,["module","options","json"]),ctx,{"block":body_1},null).write("</ul></nav>");}function body_1(chk,ctx){return chk.write("<li class=\"b-nav_item").exists(ctx._get(false, ["active"]),ctx,{"block":body_2},null).write("\"><a class=\"b-nav_link\" href=\"").reference(ctx._get(false, ["url"]),ctx,"h").write("\" data-type=\"route\">").reference(ctx._get(false, ["title"]),ctx,"h").write("</a></li>");}function body_2(chk,ctx){return chk.write(" b-nav_item__active");}return body_0;})();/* global app */
(function ($, app) {
	var classes = {
			link: 'b-router_link',
			activeLink: 'b-router_link__active'
		};

	app.createModule('router', function (sandbox) {
		var module = this,
			Router = function (index) {
				var startPage,
					router = this,
					data;

				this.indexPage = index || 'index';
				this.update();

				startPage = window.location.hash.split('#!')[1];

				this.base = app.get('basePath') || '';
				this.base += '/';
				this.index = app.get('indexPath') || '';

				if (startPage) {
					data = startPage.match(/(\?.*)$/);

					if (data) {
						startPage = startPage.split(data[0])[0];
						data = data[1];
					} else {
						data = {};
					}
				}

				this.goTo(startPage || this.indexPage, data, true);

				sandbox.bind('route.router', function (e) {
					router.goTo(e.data.page, e.data);
				});

				sandbox.bind('update.router', function () {
					router.update();
				});

				$(window).on('popstate', function (e) {
					var data = e && e.originalEvent ? e.originalEvent.state : null;

					router.checkPath(extractGetString(window.location.href), data);
				});
			};

		Router.prototype.resolveUrl = function (page) {
			var orig = page;

			if (page === this.indexPage) {
				page = this.index;
			}

			if (app.get('development')) {
				return this.base + this.index + '#!/' + (page === this.index ? orig : page);
			}

			return this.base + page;
		};

		Router.prototype.cleanUrl = function (url) {
			url = url.split(this.base)[1] || url;
			url = url.replace(/(\/$)|(^\/)/g,'');

			return url;
		};

		Router.prototype.update = function (inputsData) {
			var router = this;

			this.links = $('a[data-type=route]').addClass(classes.link);

			this.links.off('click.router').on('click.router', function (e) {
				var $this = $(this),
					href = $this.attr('href'),
					params;

				e.preventDefault();

				href = href.split(router.base)[1] || href;
				params = href.match(/(\?.*)$/);

				if (params) {
					href = href.split(params[0])[0];
					params = params[1];
				}

				href = router.cleanUrl(href);

				router.goTo(href, params);
			});

			if (inputsData) {
				/*
					restoreInputs(module.node, inputsData);
				*/
			}
		};

		Router.prototype.goTo = function (path, data, replace) {
			var getParams = '',
				origPath;
			/*
				var inputsData;
			*/

			path = this.cleanUrl(path);
			origPath = path;

			path = this.resolveUrl(path);

			if (typeof(data) === 'string') {
				path += data;
				getParams = data;
			}

			if (typeof(data) === 'object') {
				data = extend(parseGetParams(data), data);
			} else {
				data = parseGetParams(data);
			}

			if (path === (window.history.location || window.location).pathname) {
				replace = true;
			}

			/*
			inputsData = window.history.state;

			if (inputsData._params) {
				inputsData._inputsData = saveInputs(module.node);
			} else {
				inputsData = {
					'_params': replace ? data : inputsData,
					'_inputsData': saveInputs(module.node)
				};
			}
			*/

			if (replace) {
				/*
					app.replaceState(inputsData, null, path);
				*/
				app.replaceState(data, null, path);
			} else {
				/*
					app.replaceState(inputsData, null, (window.history.location || window.location).pathname);
				*/
				app.pushState(data, null, path);
			}

			this.checkPath(getParams, data);
		};

		Router.prototype.checkPath = function (getParams, data) {
			var router = this,
				path,
				url,
				url2;

			if (app.get('development')) {
				path = window.location.hash.split('#!')[1];
				path = path.split('?')[0];
			} else {
				path = (window.history.location || window.location).pathname.split(this.base)[1];
			}

			path = router.cleanUrl(path);

			if (path === '' || path === this.index) {
				path = this.indexPage;
			}

			url = url2 = path;

			if (typeof(getParams) === 'string') {
				url += getParams;
				url2 += '/' + getParams;
			}

			this.links.removeClass(classes.activeLink);
			$('a[data-type=route][href="' + this.resolveUrl(url) + '"]').addClass(classes.activeLink);
			$('a[data-type=route][href="' + this.resolveUrl(url2) + '"]').addClass(classes.activeLink);

			if (this.loading) {
				this.loading.done(function () {
					router.makePage(path, data);
				});
			} else {
				this.makePage(path, data);
			}
		};

		Router.prototype.makePage = function (page, data) {
			var router = this,
				loader = $.Deferred(),
				tmpl,
				params = data && data._params ? data._params : data,
				inputsData = data && data._params ? data._inputsData : undefined;

			tmpl = 'pages/' + page;

			//возможно, сделать кеширование страниц
			//(нужно ли? может, проще чтоб всегда с нуля рендерелись)
			sandbox.emit('show.loader');
			sandbox.bind('append', function () {
				sandbox.unbind('append');
				sandbox.emit('hide.loader');
				loader.resolve();
			});

			this.loading = loader;

			if (!dust.cache[tmpl]) {
				tmpl = '404';
				params = {
					base: this.base + this.indexPage
				};
			}

			dust.render(tmpl, params, function (err, html) {
				if (err) {
					throw err;
				}

				if (!html) {
					throw new Error('Empty page! page: `' + page + '`');
				}

				app.renderModules($(html), module.node, sandbox, function () {
					router.update(inputsData);
					sandbox.emit('page', {page: page});
				});
			});
		};

		new Router(this.options.index);
	});

	/*
	function saveInputs (container) {
		var $node = $(container),
			inputData = {},
			getVal = {
				'default': function ($input) {
					return $input.val();
				},
				'checkbox': function ($input) {
					return $input.is(':checked');
				}
			};

		$node.find('input,select,textarea').each(function () {
			var $input = $(this),
				id = $input.attr('id'),
				noProcessing = [
					'submit',
					'reset',
					'button'
				],
				type = $input.attr('type'),
				val;

			if ((!id) || noProcessing.indexOf(type) > -1) {
				return;
			}

			if (!getVal[type]) {
				type = 'default';
			}

			val = getVal[type]($input);

			inputData[id] = val;
		});

		return inputData;
	}

	function restoreInputs (container, data) {
		var $node = $(container),
			id,
			$input;

		for (id in data) {
			if (data.hasOwnProperty(id)) {
				$input = $node.find('#' + id);

				if ($input.is('[type=checkbox]')) {
					if (data[id]) {
						$input.attr('checked', 'checked').trigger('change');
					} else {
						$input.removeAttr('checked');
					}
				} else {
					$input.val(data[id]);
				}

				$input.trigger('change');
			}
		}
	}
	*/

	function parseGetParams (getString) {
		var params,
			data = {};

		if (typeof(getString) === 'string') {
			params = extractGetString(getString);
			if (!params) {
				return getString;
			}

			params = params.match(/^\?(.*)/);

			if (params && params[1]) {
				getString = params[1];

				getString = getString.split('&');
				getString.forEach(function (param) {
					param = param.split('=');

					if (data[param[0]]) {
						data[param[0]] = [data[param[0]]];
						data[param[0]].push(param[1]);
					} else {
						data[param[0]] = param[1];
					}
				});

				return data;
			}
		} else if (getString && typeof(getString.page) === 'string') {
			return parseGetParams(getString.page);
		}

		return getString;
	}

	function extractGetString (href) {
		href = href.match(/(\?.*)$/);

		if (href) {
			return href[1];
		} else {
			return undefined;
		}
	}
} (jQuery, app));
/* global -app */(function(){dust.register("router/router",body_0);function body_0(chk,ctx){return chk.write("<div class=\"b-router\">").reference(ctx._get(false,["module","content"]),ctx,"h",["s"]).write("</div>");}return body_0;})();/* global app */
(function ($, app) {
	var duration,
		classes = {
			selector: '>.b-loader_curtain,>.b-loader_block'
		};

	app.createModule('loader', function (sandbox) {
		var module = this,
			blockLoaderHtml,
			methods = {
				create: function (callback) {
					function ready () {
						callback.call(module, $(blockLoaderHtml));
					}

					if (blockLoaderHtml) {
						ready();
						return;
					}

					dust.render(module.name + '/' + module.template, extend(module.data, {
						element: true
					}), function (err, moduleHtml) {
						blockLoaderHtml = moduleHtml;
						ready();
					});
				},
				hide: function () {
					$(classes.selector, 'body').blockHide(duration, function () {
						$(this).remove();
					});
					module.node.blockHide(duration);
				},
				hideInBlock: function (element, force) {
					var node = $(element).find(classes.selector);

					function remove () {
						node.remove();
					}

					if (force) {
						remove();
					} else {
						node.blockHide(duration, function () {
							remove();
						});
					}
				},
				show: function () {
					module.node.blockShow(duration);
				},
				showInBlock: function (element) {
					element = $(element);

					methods.hideInBlock(element, true);

					methods.create(function (node) {
						element.append(node);
						node.blockShow(duration);
					});

				}
			};

		function onHide (e, element) {
			if (element) {
				methods.hideInBlock(element);
			} else {
				methods.hide();
			}
		}

		sandbox.bind('hide.loader', onHide);
		sandbox.bind('hide.loader', 'start', onHide);

		sandbox.bind('show.loader', function (e, element) {
			sandbox.unbind('hide.loader', 'start');

			module.working = true;
			if (element) {
				methods.showInBlock(element);
			} else {
				methods.show();
			}
		});

		duration = app.get('animation');
		this.node.blockShow(duration);
	});
} (jQuery, app));
/* global -app */(function(){dust.register("loader/loader",body_0);function body_0(chk,ctx){return chk.write("<div class=\"b-loader_curtain").exists(ctx._get(false, ["element"]),ctx,{"block":body_1},null).write(" g-transition-opacity g-fade g-hidden\"></div><div class=\"b-loader_block").exists(ctx._get(false, ["element"]),ctx,{"block":body_2},null).write(" g-transition-opacity g-fade g-hidden\"><i class=\"b-loader\"></i>").exists(ctx._get(false, ["text"]),ctx,{"else":body_3,"block":body_4},null).write("</div>");}function body_1(chk,ctx){return chk.write(" b-loader_curtain__element");}function body_2(chk,ctx){return chk.write(" b-loader_block__element");}function body_3(chk,ctx){return chk.write("Loading...");}function body_4(chk,ctx){return chk.reference(ctx._get(false, ["text"]),ctx,"h");}return body_0;})();
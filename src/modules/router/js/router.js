/* global app */
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
					params,
					appName = app.get('name');

				e.preventDefault();

				href = href.split(router.base)[1] || href.split('/' + appName + '/')[1] || href;
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

			if (replace) {
				app.replaceState(data, null, path);
			} else {
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

			sandbox.render(tmpl, params, function (err, html) {
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
/* global -app */
/* global app */
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

					sandbox.render(module.name + '/' + module.template, extend(module.data, {
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
/* global -app */
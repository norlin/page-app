/* global app */
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
/* global -app */
var assert = chai.assert;

describe('Проверка переходов', function() {
	it('Второстепенные страницы', function () {
		var module = $('.b-router').data('Module');

		if (app.pages.length === 0) {
			assert.ok(true, 'Второстепенных страниц нет');
		} else {
			//если есть страницы
			describe('App pages', function () {

				//пробуем проверить каждую
				app.pages.forEach(function (page) {
					describe(page, function () {
						it('открывается', function (done) {

							//подписываемся на эвент "переключения"
							module.sandbox.bind('page', function (e) {
								var page = e.data.page;
								module.sandbox.unbind('page');

								//если переключились на нужную страницу – всё ок
								assert.ok(data === page, 'Переключение на страницу ' + page);

								done();
							});

							//переключаем роутер на страницу `page`
							app.trigger('route.router', {page: page});
						});
					});
				});
			});

			assert.ok(true, 'Есть второстепенные страницы');
		}
	});
});
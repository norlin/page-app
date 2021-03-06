var sys = require('util'),
	fs = require('fs.extra'),
	extend = require('extend'),
	dust = require('dustjs-linkedin'),
	path = require('path');

module.exports = function (options) {
	var settings = extend({}, options),
		folder = require('./folder')(settings),
		Folder = folder.Folder,
		File = folder.File;

	/**
	 * @param name Название приложения
	 * @param commonFiles Пути к общим ресурсам
	 * @param index Собирается только одно это приложение
	 * @constructor
	 */
	var App = function (name, commonFiles, index) {
		this.index = index;
		this.name = name;
		this.path = path.resolve(settings.source, 'apps', name);

		this.errors = [];
		this.csErrors = [];

		this.modules = [];
		this.readyModules = {};

		if (settings.env === 'development') {
			this.development = true;
		}

		this.readConfig();
		this.parseBase();

		this.includeModules();
		this.writeFiles();

		this.createLandingPage(commonFiles);
	};

	App.prototype.readConfig = function () {
		var configPath = path.resolve(this.path, this.name + '.json');

		this.options = JSON.parse(fs.readFileSync(configPath, {encoding: 'utf8'}));

		this.options.config = this.options.config[settings.env] || this.options.config;
		this.options.index = this.options.index || this.index;
		this.options.app = this.options.name;
		this.options.path = this.options.index ? '.' : (this.options.prefix || '') + this.options.app;
		this.options.host = this.options.config.host;

		this.options.minify = this.options.config.minify || settings.config.minify;
	};

	App.prototype.parseBase = function () {
		// если надо, чистим папку приложения
		if (!this.options.index) {
			fs.removeSync(path.resolve(settings.www, this.options.path));
		}

		//обрабатываем базовые файлы приложения
		this.base = (new Folder('apps/' + this.name, {
			ignore: ['modules'],
			app: this.name,
			combine: false,
			minify: false,
			host: this.options.config.host
		})).process(true);

		this.errors = this.errors.concat(this.base.errors);
		this.csErrors = this.csErrors.concat(this.base.csErrors);
	};

	App.prototype.findModules = function (content) {
		var app = this,
			modules = content.modules;

		if (modules) {
			modules.filter(function (e, i, modules) {
				return modules.lastIndexOf(e) === i;
			});

			modules.forEach(function (module) {
				app.addModule(module);
			});
		}

		return modules;
	};

	App.prototype.addModule = function (module) {
		var app = this,
			moduleResult;

		if (this.modules.indexOf(module) === -1) {
			this.modules.push(module);
		} else {
			return;
		}

		function getModuleDir(moduleName) {
			var folderPath = path.resolve(app.path, 'modules', moduleName);

			if (!fs.existsSync(folderPath)) {
				folderPath = path.resolve(settings.source, 'modules', moduleName);

				if (!fs.existsSync(folderPath)) {
					throw new Error('Module `' + moduleName + '` not found for app `' + app.name + '`!');
				}
			}

			return new Folder(folderPath, {
				app: app.name,
				path: app.options.path,
				parent: moduleName,
				combine: false,
				minify: false,
				host: app.options.config.host,
				onlyBinaries: !!app.readyModules[moduleName] //если такой модуль уже был прочитан, то только копируем бинарные файлы
			});
		}

		if (app.readyModules[module]) {
			// если такой модуль уже был прочитан раньше,
			// просто добавляем его зависимости в приложение
			app.readyModules[module].modules.forEach(function (module) {
				app.addModule(module);
			});
		} else {
			//если модуль читается в первый раз
			moduleResult = getModuleDir(module).process(true);

			//ищем внутри него зависимости от других модулей
			moduleResult.modules = this.findModules(moduleResult.content) || [];

			//сохраняем результаты
			app.readyModules[module] = moduleResult;

			//и ошибки, если они есть
			this.errors = this.errors.concat(moduleResult.errors);
			this.csErrors = this.csErrors.concat(moduleResult.csErrors);
		}
	};

	App.prototype.includeModules = function () {
		var app = this,
			modules = {
				js: '',
				jsIE: '',
				css: '',
				cssIE: '',
				jsTest: '',
				jsTestCases: ''
			};

		// ищем зависимости
		this.findModules(this.base.content);

		//подключаем найденные модули
		this.modules.forEach(function (module) {
			var moduleResult = app.readyModules[module];

			//склеиваем контент модуля с ранее обработанным контентом приложения
			if (moduleResult.content.js) {
				app.base.content.js += moduleResult.content.js;
			}

			if (moduleResult.content.css) {
				app.base.content.css += moduleResult.content.css;
			}

			if (moduleResult.content.jsIE) {
				app.base.content.jsIE += moduleResult.content.jsIE;
			}

			if (moduleResult.content.cssIE) {
				app.base.content.cssIE += moduleResult.content.cssIE;
			}

			if (moduleResult.content.jsTest) {
				app.base.content.jsTest += moduleResult.content.jsTest;
			}

			if (moduleResult.content.jsTestCases) {
				app.base.content.jsTestCases += moduleResult.content.jsTestCases;
			}

			//сохраняем имена файлов, которые были подключены
			app.base.files.js = app.base.files.js.concat(moduleResult.files.js);
			app.base.files.css = app.base.files.css.concat(moduleResult.files.css);
			app.base.files.jsIE = app.base.files.jsIE.concat(moduleResult.files.jsIE);
			app.base.files.cssIE = app.base.files.cssIE.concat(moduleResult.files.cssIE);

			app.base.files.jsTest = app.base.files.js.concat(moduleResult.files.jsTest);
			app.base.files.jsTestCases = app.base.files.js.concat(moduleResult.files.jsTestCases);
		});
	};

	//берём метод из Folder
	App.prototype.writeContent = Folder.prototype.writeContent;

	App.prototype.writeFiles = function () {
		//записываем скомпилированный и объединённый контент в один файл [для каждого типа]
		if (this.base.content.js) {
			this.base.content.js = this.minifyJS(this.base.content.js);
			this.base.files.js.push(this.writeContent('js', this.base.content.js));
		}
		if (this.base.content.css) {
			this.base.content.css = this.minifyCSS(this.base.content.css);
			this.base.files.css.push(this.writeContent('css', this.base.content.css));
		}

		if (this.base.content.jsIE) {
			this.base.content.jsIE = this.minifyJS(this.base.content.jsIE);
			this.base.files.jsIE.push(this.writeContent('js', true, this.base.content.jsIE));
		}
		if (this.base.content.cssIE) {
			this.base.content.cssIE = this.minifyCSS(this.base.content.cssIE);
			this.base.files.cssIE.push(this.writeContent('css', true, this.base.content.cssIE));
		}

		if (this.base.content.jsTest) {
			this.base.files.jsTest.push(this.writeContent('js', false, this.base.content.jsTest, '_test.js'));
		}

		if (this.base.content.jsTestCases) {
			this.base.files.jsTestCases.push(this.writeContent('js', false, this.base.content.jsTestCases, '_testCases.js'));
		}
	};

	App.prototype.minifyCSS = Folder.prototype.minifyCSS;
	App.prototype.minifyJS = Folder.prototype.minifyJS;

	App.prototype.createLandingPage = function (common) {
		var app = this,
			commonFiles = {},
			startSlash = /^\//,
			sepRx = /\\/g;

		function makeRelative(file) {
			var normalized = file;

			if (!startSlash.test(file)) {
				normalized = path.join((app.options.prefix || '') + app.options.app, normalized);
				normalized = normalized.replace(sepRx, '/');
			}

			return normalized;
		}

		if (this.options.index) {
			commonFiles.js = common.js.map(makeRelative);
			commonFiles.jsIE = common.jsIE.map(makeRelative);
			commonFiles.jsTest = common.jsTest.map(makeRelative);
			commonFiles.jsTestCases = common.jsTestCases.map(makeRelative);
			commonFiles.css = common.css.map(makeRelative);
			commonFiles.cssIE = common.cssIE.map(makeRelative);
		} else {
			commonFiles = common;
		}

		app.generated = {
			layout: {
				scripts: commonFiles.js.concat(app.base.files.js),
				scriptsIE: commonFiles.jsIE.concat(app.base.files.jsIE),
				scriptsTest: commonFiles.jsTest.concat(app.base.files.jsTest),
				scriptsTestCases: commonFiles.jsTestCases.concat(app.base.files.jsTestCases),
				styles: commonFiles.css.concat(app.base.files.css),
				stylesIE: commonFiles.cssIE.concat(app.base.files.cssIE),
				development: app.development,
				layoutClass: 'app-' + app.options.name
			},
			title: app.options.title
		};

		//рендерим html-страничку приложения
		dust.render('layout', app.generated, function (err, html) {
			app.writeContent('', false, html, 'index.html');
		});
	};

	return {
		App: App,
		Folder: Folder,
		File: File
	};
};
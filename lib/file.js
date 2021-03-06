var sys = require('util'),
	path = require('path'),
	fs = require('fs.extra'),
	extend = require('extend'),
	dust = require('dustjs-linkedin'),
	dustHelpers = require('dustjs-helpers'),
	modulePath = path.resolve(module.filename, '../../src'),
	customHelpers = require(path.resolve(modulePath, 'apps/common/js/helpers')),
	jshint = require('jshint').JSHINT,
	Jscs = require('jscs'),
	jscsConfig = require('jscs/lib/cli-config'),
	autoprefixer = require('autoprefixer'),
	less = require('less');

module.exports = function (settings) {
	var scriptTypes = [
			'js',
			'css',
			'less',
			'dust',
			'json'
		],
		jscs = new Jscs();

	// JSCS config
	jscs.registerDefaultRules();
	if (settings.config && settings.config.jscsRules) {
		jscs.configure(jscsConfig.load(path.join(__dirname, settings.config.jscsRules)));
	}

	var File = function (filepath, params) {
		this.path = filepath;
		this.basename = path.basename(filepath);
		this.extname = path.extname(filepath);

		this.params = extend({
			lint: false,
			jscs: false,
			dust: false,
			ie: false,
			test: false,
			testDeploy: false,
			binary: false,
			vendor: false,
			deploy: true
		}, params);

		this.applyParams();
		this.process();
	};

	File.prototype.applyParams = function () {
		//различные проверки
		var relativePath = this.path.split(path.resolve(settings.source))[1] || this.path,
			isIE = (/\.ie\./i).test(this.basename),
			isTest = (/(\/|\\)test(\/|\\)/i).test(relativePath),
			isVendor = (/(\/|\\)vendor(\/|\\)/i).test(relativePath);

		//файл для версии под ИЕ
		this.params.ie = isIE;

		//файл для тестов
		this.params.test = isTest;

		//"чужой" файл – библиотека, плагин, фреймворк или типа того
		this.params.vendor = isVendor;

		this.params.type = this.extname.split('.')[1];

		if (this.params.type === 'dust') {
			//если это dust-шаблон
			this.params.dust = this.params.dust || true;
		}

		if (this.params.type === 'js' && !this.params.vendor && !this.params.test) {
			//если это свой js-файл – то его надо будет проверить
			this.params.lint = true;
			this.params.jscs = true;
		}

		if (scriptTypes.indexOf(this.params.type) < 0) {
			//если файл не подпадает под "скриптовые" типы – считаем его бинарным
			//и далее тупо копируем
			this.params.binary = true;
		}

		if (this.params.type === 'md' || (this.params.test && !this.params.testDeploy) || this.params.type === 'json') {
			this.params.deploy = false;
		}
	};

	/**
	 * Check file with JSLint and get array of error information objects
	 * @param content file content
	 * @param filename file name
	 * @returns {Array} error information
	 */
	function jsLintFile(content, filename) {
		var result,
			jshintResults = [];

		result = jshint(content, {
			"undef": true,
			"unused": true,
			"plusplus": true,
			"predef": {
				"window": false,
				"jQuery": false,
				"dust": false,
				"extend": false
			}
		});

		if (!result) {
			jshintResults = jshintResults.concat(jshint.errors.map(function (error) {
				if (error) {
					error.file = error.file || filename;
					//error.line -= 1;

					return error;
				}
			}));
		}

		return jshintResults;
	}

	/**
	 * Check file with JSCS and get array of error information objects
	 * @param content file content
	 * @param filename file name
	 * @returns {Array} error information
	 */
	function jscsFile(content, filename) {
		var result = [];

		try {
			jscs.checkString(content, filename).getErrorList().forEach(function (err) {
				err.file = filename;
				result.push({
					line: err.line,
					character: err.column,
					reason: err.message,
					file: filename
				});
			});
		} catch (err) {
			result.push(err.message.replace('null:', filename + ':'));
		}

		return result;
	}

	File.prototype.processors = {
		'js': function () {
			if (this.params.lint) {
				this.errors = jsLintFile(this.content, this.path);
			}

			if (this.params.jscs) {
				this.csErrors = jscsFile(this.content, this.path);
			}

			return this.content;
		},
		'css': function () {
			if (!this.params.vendor) {
				return autoprefixer(settings.config.autoprefixerOptions).process(this.content);
			}

			return this.content;
		},
		'less': function () {
			var file = this,
				syncReady = false,
				parser = new (less.Parser)({
					syncImport: true,
					paths: [ // указывает пути поиска для директив @import
						this.path,
						path.resolve(settings.source, 'apps', this.params.app, 'css'),
						path.resolve(settings.source, 'apps', 'common', 'css'),
						path.resolve(settings.source, 'modules')
					],
					filename: this.path // указывает имя файла, для улучшения сообщений об ошибках
				});

			parser.parse(this.content, function (e, tree) {
				syncReady = true;

				file.content = tree.toCSS();
			});

			if (!syncReady) {
				throw new Error('Can`t synchronous render less file!');
			}
			this.params.type = 'css';
			this.content = this.processors[this.params.type].call(this);

			return this.content;
		},
		'dust': function () {
			var file = this,
				name = path.join(this.params.parent || '', this.params.path.replace(/^templates(\/|\\|$)/, ''), path.basename(this.basename, '.dust')),
				template,
				moduleRx = /\{@my([^\}]*)\}/g,
				moduleNameRx = /module="([^"]*)"/,
				BOMcheck = /^\uFEFF/,
				modules;

			if (this.content.match(BOMcheck)) {
				this.errors = [
					{
						reason: 'BOM mark detected!',
						file: this.path,
						line: 1,
						character: 1
					}
				];

				this.content = this.content.replace(BOMcheck, '');
			}

			name = name.replace(/\\/g, '/');

			this.modules = [];

			// проверяем, подключаются ли в шаблоне модули
			modules = this.content.match(moduleRx);

			if (modules) {
				// если подключаются, находим их названия
				modules.forEach(function (module) {
					module = module.match(moduleNameRx)[1];

					if (module && file.modules.indexOf(module) === -1) {
						file.modules.push(module);
					}
				});
			}

			try {
				template = dust.compile(this.content, name);
				dust.loadSource(template);
			} catch (e) {
				sys.log('Dust syntax error\n\tFile: ' + this.path);
				sys.puts('\t' + e.message);
				throw e;
			}

			this.params.type = 'js';

			return template;
		}
	};

	File.prototype.process = function () {
		if (this.params.deploy) {
			//onlyBinaries нужна, чтобы можно было скопировать
			//бинарники уже ранее обработанного модуля
			//и не читать заново другие файлы
			if (!this.params.onlyBinaries || this.params.binary) {
				this.content = fs.readFileSync(this.path, this.params.binary ? null : {encoding: 'utf8'});

				//если нужно как-то обработать контент файла – делаем это
				if (this.processors[this.params.type]) {
					this.content = this.processors[this.params.type].call(this);
				}
			}
		}
	};

	return File;
};
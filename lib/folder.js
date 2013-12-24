var sys = require('util'),
	fs = require('fs.extra'),
	extend = require('extend'),
	path = require('path'),
	csso = require('csso'),
	UglifyJS = require('uglify-js');

module.exports = function (options) {
	var settings = options,
		File = require('./file')(settings);

	var Folder = function (folderpath, options) {
		options = extend(true, {
			app: 'common',
			combine: true,
			minify: settings.config.minify
		}, options);

		this.options = options;
		this.options.path = this.options.path || this.options.app;

		this.path = path.resolve(settings.source, folderpath);

		this.results = [];
		this.resultFiles = {};
		this.resultErrors = [];
	};

	Folder.prototype.scan = function () {
		var folder = this,
			targetName = 'target.' + settings.target,
			targetReplace = settings.target ? path.resolve(this.path, targetName) : false;

		//читаем файлы в директории
		this.files = fs.readdirSync(this.path);

		//если собирается какой-то не-дефолтный, то
		if (targetReplace && fs.existsSync(targetReplace)) {
			//ищем файлы, которые надо будет заменить
			targetReplace = fs.readdirSync(targetReplace);

			targetReplace.forEach(function (filename) {
				var index = folder.files.indexOf(filename);

				if (index > -1) {
					//заменяем дефолтные файлы билдовыми
					folder.files[index] = [targetName, filename];
				}
			});
		}

		this.sortFiles();
	};

	Folder.prototype.sortFiles = function () {
		var filesOrder = this.files.indexOf('files.json');

		if (filesOrder > -1) {
			this.files.splice(filesOrder, 1);
			filesOrder = JSON.parse(fs.readFileSync(path.join(this.path, 'files.json'), {encoding:'utf8'}));

			this.files.sort(function (a, b) {
				var _a = filesOrder.indexOf(a),
					_b = filesOrder.indexOf(b);

				if (_a > -1 && _b === -1) {
					return -1;
				}

				if (_a === -1 && _b > -1) {
					return 1;
				}

				if (_a > -1 && _b > -1) {
					return _a - _b;
				}

				if (a === b) {
					return 0;
				}

				return a < b ? -1 : 1;
			});
		}
	};

	Folder.prototype.processFiles = function (recursive, results) {
		var folder = this,
			parentPath = recursive ? (typeof(recursive) === 'string' ? recursive : '') : undefined;

		this.files.forEach(function (filename) {
			var targetRX = /^target\.([^.]*)$/,
				targetName,
				foldername,
				filepath,
				recursiveOptions;

			if (!filename || (folder.options.ignore && folder.options.ignore.indexOf(filename) > -1)) {
				return;
			}

			//если файл надо заменить на билдовый
			if (filename instanceof Array) {
				targetName = filename[0];
				filename = filename[1];
			}

			//папки для билдов игнорируем
			if (targetRX.test(filename)) {
				return;
			}

			foldername = parentPath ? path.join(parentPath, filename) : filename;
			filepath = path.resolve(folder.path, targetName || '', filename);

			if (fs.statSync(filepath).isDirectory()) {
				//если это вложенная директория и мы обходим все папки рекурсивно
				if (recursive) {
					recursiveOptions = extend({}, folder.options, {ignore: []});
					(new Folder(filepath, recursiveOptions)).process(foldername, results || folder.results);
				}
			} else {
				//если это файл - обрабатываем его
				//и сохраняем в списке файлов самого верхнего родительского Folder
				(results || folder.results).push(new File(filepath, {
					path: parentPath || '',
					parent: folder.options.parent,
					app: folder.options.app,
					onlyBinaries: folder.options.onlyBinaries,
					testDeploy: settings.test
				}));
			}
		});

		if (results === undefined) {
			//если это родительский фолдер – значит,
			//все внутренние файлы и папки обработаны
			//и можно сохранять результаты
			this.joinResults();
		}
	};

	Folder.prototype.process = function (recursive, results) {
		this.scan();
		this.processFiles(recursive, results);

		return {
			content: this.resultContent,
			files: this.resultFiles,
			errors: this.resultErrors
		};
	};

	Folder.prototype.joinResults = function () {
		var folder = this,
			results = {
				css: '',
				cssIE: '',
				js: '',
				jsIE: '',
				jsTest: '',
				jsTestCases: '',
				modules: []
			},
			resultFiles = {
				css: [],
				cssIE: [],
				js: [],
				jsIE: [],
				jsTest: [],
				jsTestCases: []
			};

		this.results.forEach(function (file) {
			var destination = path.resolve(settings.www, folder.options.path, file.params.path, folder.options.parent || ''),
				resultType,
				type;

			//бинарные файлы просто записываем без изменений
			if (file.params.binary && file.params.deploy) {
				fs.mkdirpSync(destination);
				fs.writeFileSync(path.resolve(destination, file.basename), file.content);

				return;
			}

			if (file.params.deploy) {
				if (file.params.type === 'js') {
					resultType = type = 'js';
				}

				if (file.params.type === 'css') {
					resultType = type = 'css';
				}

				if (file.modules && file.modules.length > 0) {
					// пробрасываем найденные в файле модули
					results.modules = results.modules.concat(file.modules);
				}

				if (resultType) {
					if (file.params.test) {
						resultType += 'Test';

						if (!file.params.vendor) {
							resultType += 'Cases';
						}
					} else if (file.params.ie) {
						resultType += 'IE';
					}

					//"чужие" файлы (библиотеки, фреймворки и т.п.)
					//добавляем в список файлов, чтоб подключить на страничку
					if (file.params.vendor) {
						/*
						//use *.min versions of vendor files
						if (file.params.type === 'js') {
							file.content = folder.minifyJS(file.content);
						}

						if (file.params.type === 'css') {
							file.content = folder.minifyCSS(file.content);
						}
						*/

						resultFiles[resultType].push(folder.writeContent(type, false, file.content, file.basename));
					} else {
						results[resultType] += file.content;
					}
				}
			}

			if (file.errors) {
				folder.resultErrors = folder.resultErrors.concat(file.errors);
			}
		});

		//если файлы надо склеить в один, то делаем это и сохраняем объединённый контент
		//для каждого типа (один js, один css и ещё по одному – для ИЕ)
		if (this.options.combine) {
			if (results.js) {
				results.js = this.minifyJS(results.js);
				resultFiles.js.push(this.writeContent('js', results.js));
			}

			if (results.css) {
				results.css = this.minifyCSS(results.css);
				resultFiles.css.push(this.writeContent('css', results.css));
			}

			if (results.jsIE) {
				results.jsIE = this.minifyJS(results.jsIE);
				resultFiles.jsIE.push(this.writeContent('js', true, results.jsIE));
			}

			if (results.cssIE) {
				results.cssIE = this.minifyCSS(results.cssIE);
				resultFiles.cssIE.push(this.writeContent('css', true, results.cssIE));
			}

			if (results.jsTest) {
				resultFiles.jsTest.push(this.writeContent('js', results.jsTest, '_test.js'));
			}

			if (results.jsTestCases) {
				resultFiles.jsTestCases.push(this.writeContent('js', results.jsTestCases, '_testCases.js'));
			}
		}

		this.resultContent = results;
		this.resultFiles = resultFiles;
	};

	Folder.prototype.minifyCSS = function (content) {
		if (this.options.minify) {
			return csso.justDoIt(content);
		}

		return content;
	};

	Folder.prototype.minifyJS = function (content) {
		if (this.options.minify) {
			return UglifyJS.minify(content, {
				fromString: true
			}).code;
		}

		return content;
	};

	Folder.prototype.writeContent = function (type, isIE, content, name) {
		if (typeof(isIE) !== 'boolean') {
			name = content;
			content = isIE;
			isIE = false;
		}

		//сохраняем контент в соответствующий файл
		//если имя не задано, то оно создаётся по принципу
		//_appname.ie-version.js

		var basePath = path.resolve(settings.www, this.options.path),
			destination = path.resolve(basePath, type),
			filename = name || '_' + this.options.app + (isIE ? '.ie' : '') + '-' + this.options.version + '.' + type,
			filepath = path.resolve(destination, filename);

		fs.mkdirpSync(destination);
		fs.writeFileSync(filepath, content);

		return ((this.options.host || '') + type + '/' + filename).replace(path.sep, '/', 'g');
	};

	return {
		Folder: Folder,
		File: File
	};
};
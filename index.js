module.exports = function makeBuilder (settings, args) {
	if (!settings || typeof(settings) === 'string') {
		settings = {
			basePath: '.',
			configPath: settings || args.config || 'config.json',
			env: args.env || 'development',
			noLintResults: false
		};
	}

	var sys = require('util'),
		fs = require('fs.extra'),
		path = require('path'),
		extend = require('extend'),
		basePath = settings.basePath,
		configPath = path.resolve(basePath, settings.configPath),
		packageConfig = JSON.parse(fs.readFileSync(configPath, {encoding:'utf8'})),
		env = settings.env,
		app = require('./lib/app'),
		spawn = require('child_process').spawn;

	function parseConfig (target) {
		var config = extend({}, packageConfig),
			settings = {
				source: basePath,
				target: target,
				env: env
			};

		if (settings.env === 'test') {
			settings.test = true;
			settings.env = 'development';
		}

		//берём пути для нужного окружения
		//development или production
		config.config = config.config[settings.env];

		settings.config = config.config;
		settings.config.version = config.version;
		settings.www = path.resolve(settings.source, config.config.www);

		return settings;
	}

	function build (target, callback) {
		if (typeof(target) === 'function') {
			callback = target;
			target = undefined;
		}

		var buildApp,
			settings,
			errors = [],
			App,
			Folder,
			File,
			tests = '',
			apps = {};

		sys.puts('Start building ' + (target || 'default'));

		settings = parseConfig(target);

		// если в командной строке задан параметр www, использовать его вместо прописанного в config.json
		if (args.www) {
			settings.www = args.www;
		}

		//инициализируем билдер
		buildApp = app(settings);
		App = buildApp.App;
		Folder = buildApp.Folder;
		File = buildApp.File;

		//чистим www-директорию
		fs.removeSync(path.resolve(settings.www, (settings.config.prefix || '') + 'common'));

		//обрабатываем общие файлы
		var common = (new Folder(path.join('apps','common'), {
			app: 'common',
			path: (settings.config.prefix || '') + 'common',
			version: settings.config.version,
			host: settings.config.host
		})).process(true);

		errors = errors.concat(common.errors);

		//ищем и обрабатываем все приложения
		fs.readdirSync(path.resolve(settings.source, 'apps')).forEach(function (appName) {
			var app;
			if (appName !== 'common' && (!args.app || (args.app && args.app === appName))) {
				app = new App(appName, common.files, !!args.app);
				errors = errors.concat(app.errors);

				apps[app.name] = app.generated;
			}
		});

		showLintErrors(errors, target);

		if (settings.test) {
			tests = path.join(settings.source, settings.config.www, 'index', 'index.html');
			if (process.platform === 'win32') {
				mochaTest = spawn(process.env.comspec, ['/c', 'mocha-phantomjs', tests]);
			} else {
				mochaTest = spawn('mocha-phantomjs', [tests]);
			}

			tests = '';

			mochaTest.stdout.on('data', function (data) {
				tests += data.toString();
			});

			mochaTest.stderr.on('data', function (data) {
				if (err) {
					throw new Error(err);
				}
			});

			mochaTest.on('close', function (code) {
				sys.puts('\nTests for ' + (target || 'default'));
				callback(tests, apps);
			});
		} else {
			callback('\n', apps);
		}
	}

	function runBuilder (callback) {
		var target = packageConfig.target || 'default',
			targets = {};

		build(target, function (tests, apps) {
			targets[target] = apps;

			if (tests) {
				sys.puts(tests);
			}

			if (callback) {
				callback(targets);
			}
		});
	}

	function getSettings (target) {
		return parseConfig(target);
	}

	function showLintErrors (errors, target) {
		var files = {},
			file;

		if (settings.noLintResults) {
			return;
		}

		function putsMessage (msg) {
			sys.puts([
				'  line ',
				msg.line,
				':',
				msg.character,
				', ',
				msg.reason
			].join(''));
		}

		function errorSort (a, b) {
			return a.line - b.line;
		}

		if (errors.length) {
			sys.puts('\nJSHint errors: ' + errors.length + '\n');
			errors.forEach(function (error) {
				if (error) {
					files[error.file] = files[error.file] || [];
					files[error.file].push(error);
				}
			});

			for (file in files) {
				if (files.hasOwnProperty(file)) {
					sys.puts(file.replace(path.resolve(basePath), '.'));

					files[file].sort(errorSort);
					files[file].forEach(putsMessage);
				}
			}
		} else {
			sys.puts('Target: ' + (target || 'default') + ', no errors found.');
		}
	}

	return {
		build: runBuilder,
		getSettings: getSettings
	};
};
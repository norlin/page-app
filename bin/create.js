#!/usr/bin/env node

var sys = require('util'),
	fs = require('fs.extra'),
	path = require('path'),
	basePath = '.',
	File = require('../lib/file')({source: basePath}),
	dust = require('dustjs-linkedin'),
	modulePath = path.resolve(module.filename, '../../src'),
	templatesPath = path.resolve(modulePath, 'apps', 'common', 'templates'),
	files,
	compiledFiles = [],
	args = {
		type: process.argv[2],
		name: process.argv[3]
	};

process.argv.slice(2).forEach(function (arg) {
	arg = arg.split('=');

	args[arg[0]] = arg[1];
});

function processName(name) {
	var upper,
		lower;

	name = name.replace(/[^A-Za-z0-9_\s\-]/gi, '-');
	name = name.split('-');

	lower = name.join('-');
	lower = lower.charAt(0).toLowerCase() + lower.slice(1);

	name = name.map(function (namePart) {
		return namePart.charAt(0).toUpperCase() + namePart.slice(1);
	});

	upper = name.join('');

	return {
		upper: upper,
		lower: lower
	};
}

var creators = {
	'base': function (check) {
		if (check) {
			return fs.existsSync(path.resolve(basePath, 'apps'));
		}

		fs.copyRecursive(path.resolve(modulePath), basePath, function (err, data) {
			if (err) {
				throw err;
			}

			sys.puts('Base files copied!');
		});
	},
	'module': function (name) {
		var moduleName = processName(name),
			data,
			modulePath = path.resolve(basePath, 'modules', moduleName.lower),
			jsPath = path.resolve(modulePath, 'js'),
			dustPath = path.resolve(modulePath, 'templates'),
			cssPath = path.resolve(modulePath, 'css'),
			testPath = path.resolve(modulePath, 'test'),
			js,
			css,
			tmpl,
			test;

		if (fs.existsSync(modulePath)) {
			sys.puts('Module `' + moduleName.lower + '` already exists!');
			return;
		}

		data = {
			moduleName: moduleName.lower,
			ModuleName: moduleName.upper
		};

		dust.render('module.js', data, function (err, content) {
			if (err) {
				throw err;
			}

			js = content;
			complete();
		});

		dust.render('module.dust', data, function (err, content) {
			if (err) {
				throw err;
			}

			tmpl = content;
			complete();
		});

		dust.render('module.css', data, function (err, content) {
			if (err) {
				throw err;
			}

			css = content;
			complete();
		});

		dust.render('module.test.js', data, function (err, content) {
			if (err) {
				throw err;
			}

			test = content;
			complete();
		});

		function complete() {
			if (js && css && dust && test) {
				fs.mkdirpSync(jsPath);
				fs.mkdirSync(dustPath);
				fs.mkdirSync(cssPath);
				fs.mkdirSync(testPath);

				fs.writeFileSync(path.resolve(jsPath, moduleName.lower + '.js'), js);
				fs.writeFileSync(path.resolve(cssPath, moduleName.lower + '.css'), css);
				fs.writeFileSync(path.resolve(dustPath, moduleName.lower + '.dust'), tmpl);
				fs.writeFileSync(path.resolve(testPath, 'basic.js'), test);
			}
		}
	},
	'app': function (name) {
		var appName = processName(name).lower,
			data = {
				AppName: appName
			},
			appPath = path.resolve(basePath, 'apps', appName),
			pagesPath = path.resolve(appPath, 'pages'),
			js,
			json,
			tmpl,
			page;

		if (fs.existsSync(appPath)) {
			sys.puts('App `' + appName + '` already exists!');
			return;
		}

		dust.render('app.js', data, function (err, content) {
			if (err) {
				throw err;
			}

			js = content;
			complete();
		});

		dust.render('app.dust', data, function (err, content) {
			if (err) {
				throw err;
			}

			tmpl = content;
			complete();
		});

		dust.render('app-page.dust', data, function (err, content) {
			if (err) {
				throw err;
			}

			page = content;
			complete();
		});

		dust.render('app.json', data, function (err, content) {
			if (err) {
				throw err;
			}

			json = content;
			complete();
		});

		function complete() {
			if (js && json && dust && page) {
				fs.mkdirpSync(appPath);
				fs.mkdirSync(pagesPath);

				fs.writeFileSync(path.resolve(appPath, appName + '.js'), js);
				fs.writeFileSync(path.resolve(appPath, appName + '.json'), json);
				fs.writeFileSync(path.resolve(appPath, appName + '.dust'), tmpl);
				fs.writeFileSync(path.resolve(pagesPath, 'index.dust'), page);
			}
		}
	}
};

if (!args.type || args.type === 'base') {
	if (!creators.base(true)) {
		creators.base();
		return;
	} else {
		args.type = 'build';
	}
}

if (args.type === 'build') {
	require('../index.js')(args.config || 'config.json', args).build();
	return 0;
}

if (!creators[args.type]) {
	sys.puts('What you want to create? Possible options: `module`, `app`');
	return 1;
}

if (!args.name) {
	sys.puts('Please, enter name of `' + args.type + '`!');
	return 1;
}

files = fs.readdirSync(templatesPath);

dust.optimizers.format = function (ctx, node) {
	return node;
};

files.forEach(function (filename) {
	if (filename.split('.dust').length >= 2) {
		compiledFiles.push(new File(path.resolve(templatesPath, filename), {path: ''}));
	}
});

creators[args.type](args.name);
return 0;
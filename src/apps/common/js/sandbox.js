(function (window) {
	/**
	 * Песочница для модулей
	 */
	var Sandbox = function (app, name, parentModule) {
		this.children = [];
		this.init(app, name);

		this.parent = parentModule;
		if (parentModule) {
			parentModule.children.push(this);
		}
	};

	Sandbox.prototype.init = function (app, name) {
		this.app = app;
		this.name = name;

		this.createId();
	};

	Sandbox.prototype.ready = function () {
		this.working = true;
	};

	/**
	 * уничтожение всех ссылок на себя
	 */
	Sandbox.prototype.destroy = function () {
		var sandbox = this;

		this.working = false;

		function selfDestroy (holder) {
			var selfIndex;

			selfIndex = holder.indexOf(sandbox);
			if (selfIndex > -1) {
				holder.splice(selfIndex, 1);
			}
		}

		// убираем себя из общего списка песочниц
		selfDestroy(this.app.sandboxes);

		// если есть модуль-родитель
		// убираем себя из списка его потомков
		if (this.parent) {
			selfDestroy(this.parent.children);
		}
	};

	Sandbox.prototype.createId = function () {
		var ts;

		if (!this.id) {
			ts = (new Date()).getTime();

			this.id = ts + '_' + Math.floor(Math.random() * 10000);
		}
	};

	window.Sandbox = Sandbox;
} (window));
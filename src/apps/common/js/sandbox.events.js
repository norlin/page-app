/* global decorate */
(function (window) {
	var Sandbox = window.Sandbox,
		App = window.App;

	// decorate возвращает функцию, которая
	// выполняет сначала первую функцию-аргумент, потом вторую
	// с сохранением контекста и переданными аргументами
	Sandbox.prototype.init = decorate(Sandbox.prototype.init, function () {
		// дополняем инициализацию Sandbox
		// нужными полями
		this.triggers = {};

		this.bufferedEvents = [];
	});

	Sandbox.prototype.ready = decorate(Sandbox.prototype.ready, function () {
		var sandbox = this,
			i,
			l;

		// выполнение отложенных эвентов
		// в порядке их сохранения
		for (i = 0, l = this.bufferedEvents.length; i < l; i += 1) {
			sandbox.trigger(this.bufferedEvents.shift());
		}
	});

	/**
	 * Добавление обработчика события
	 * @param  {string}   eventType тип эвента
	 * @param  {string}   ns        неймспейс эвента (опционально)
	 * @param  {Function} callback  собственно, обработчик
	 */
	Sandbox.prototype.bind = function (eventType, ns, callback) {
		var moduleType;

		eventType = eventType.split('.');
		moduleType = eventType[1] || undefined;
		eventType = eventType[0];

		if (typeof(ns) === 'function') {
			callback = ns;
			ns = '';
		}

		this.triggers[eventType] = this.triggers[eventType] || [];

		// сохранение обработчика
		this.triggers[eventType].push({
			ns: ns,
			module: moduleType,
			callback: callback
		});
	};

	/**
	 * удаление обработчиков для определённого типа эвентов
	 * @param  {string} eventType тип эвента
	 * @param  {string} ns        неймспейс для уточнения (опционально)
	 */
	Sandbox.prototype.unbind = function (eventType, ns) {
		var moduleType;

		eventType = eventType.split('.');
		moduleType = eventType[1] || undefined;
		eventType = eventType[0];

		if (this.triggers[eventType]) {
			// если указан неймспейс, то чистим эвенты
			// только этого неймспейса
			if (ns || moduleType) {
				this.triggers[eventType] = this.triggers[eventType].filter(function (trigger) {
					if (trigger.ns === ns && trigger.module === moduleType) {
						return false;
					}

					return true;
				});
			} else {
				// если неймспейс не указан, то удаляем
				// все обработчики данного типа
				this.triggers[eventType] = [];
			}
		}
	};

	function checkEvent (event, ns, data) {
		var moduleType;

		if (typeof (event) === 'string') {
			event = event.split('.');
			moduleType = event[1] || undefined;
			event = event[0];

			if (typeof(ns) !== 'string') {
				data = ns;
				ns = undefined;
			}

			return new Event(event, ns, {
				data: data,
				module: moduleType
			});
		}

		return event;
	}

	/**
	 * Выполнение обработчиков эвента
	 * @param  {Object|string} event эвент или тип эвента
	 * @param  {string} ns    неймспейс (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.trigger = function (event, ns, data) {
		var sandbox = this;

		if (!event.module || (event.module === sandbox.name)) {
			event = checkEvent(event, ns, data);

			if (this.working || event.type === 'append') {
				// если модуль готов к работе,
				// выполняем обработчики
				if (this.triggers[event.type]) {
					this.triggers[event.type].forEach(function (trigger) {
						// при уточнении неймспейса, выполняем
						// только нужные обработчики
						if (
							(!trigger.module || (trigger.module === event.module)) &&
							(!event.ns || (trigger.ns === event.ns))
						) {
							trigger.callback.call(sandbox, event);
						}
					});
				}
			} else {
				// если модуль ещё не готов,
				// сохраняем эвент в отложенный список
				this.bufferedEvents.push(event);
			}
		}
	};

	/**
	 * Посылание эвента
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.emit = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		// дёргаем обработчик эвента у всего приложения
		this.app.trigger(event);
	};

	/**
	 * Посылание эвента вверх по родителям
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.bubble = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		// выполняем собственный обработчик
		this.trigger(event);

		// дёргаем бабблинг у родителя
		// если он есть
		if (this.parent) {
			this.parent.bubble(event, ns, data);
		}
	};

	/**
	 * Посылание эвента вниз внутренним модулям
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	Sandbox.prototype.notify = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		// выполняем собственный обработчик
		this.trigger(event);

		// дёргаем уведомление у детей
		this.children.forEach(function (child) {
			child.notify(event, ns, data);
		});
	};

	/**
	 * Выполнение обработчиков у всех песочниц
	 * @param  {string|Object} event тип эвента или сам эвент
	 * @param  {string} ns    неймспейс эвента (опционально)
	 * @param  {object} data  данные (опционально)
	 */
	App.prototype.trigger = function (event, ns, data) {
		event = checkEvent(event, ns, data);

		this.sandboxes.forEach(function (sandbox) {
			sandbox.trigger(event);
		});
	};

	/**
	 * Эвент-сообщение
	 * @param {string} type тип эвента
	 * @param {string} ns   неймспейс эвента
	 * @param {object} data данные
	 */
	var Event = function (type, ns, params) {
		this.type = type;
		this.ns = ns || undefined;
		this.data = extend({}, params.data);

		if (params.module) {
			this.module = params.module;
		}
	};
}(window));
/* global -decorate */
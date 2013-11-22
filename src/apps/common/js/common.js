if (!Object.create) {
    Object.create = (function(){
        function F(){}

        return function(o){
            if (arguments.length != 1) {
                throw new Error('Object.create implementation only accepts one parameter.');
            }
            F.prototype = o;
            return new F();
        };
    })();
}

if (typeof(Function.bind) !== "function"){
    Function.prototype.bind = function(bindTo){
        var fn = this;

        return function(){
            fn.apply(bindTo,arguments);
        };
    };
}


if (typeof([].forEach) !== "function"){
    Array.prototype.forEach = function(fn, thisObj) {
        var i, l;

        for (i = 0, l = this.length; i < l; i+=1) {
            if (i in this) {
                fn.call(thisObj, this[i], i, this);
            }
        }
    };
}

if (typeof([].indexOf) !== "function"){
    Array.prototype.indexOf = function(elt /*, from*/){
        var len = this.length,
            from = Number(arguments[1]) || 0;

        from = (from < 0) ? Math.ceil(from): Math.floor(from);
        if (from < 0){
            from += len;
        }

        for (; from < len; from+=1){
            if (from in this && this[from] === elt){
                return from;
            }
        }
        return -1;
    };
}

if (typeof([].map) !== "function") {
    Array.prototype.map = function(mapper, that /*opt*/) {
        var other = new Array(this.length),
            i,
            n = this.length;

        for (i = 0; i < n; i+=1) {
            if (i in this) {
                other[i] = mapper.call(that, this[i], i, this);
            }
        }

        return other;
    };
}

if (typeof([].filter) !== "function") {
    Array.prototype.filter = function(filter, that /*opt*/) {
        var other = [],
            v,
            i,
            n = this.length;

        for (i = 0; i < n; i += 1) {
            if (i in this && filter.call(that, v = this[i], i, this)) {
                other.push(v);
            }
        }

        return other;
    };
}

/* exported extend */
function extend () {
    return jQuery.extend.apply(jQuery, arguments);
}

/* exported decorate */
function decorate (originFunction, decoratorFunction) {
    return function () {
        originFunction.apply(this, arguments);
        decoratorFunction.apply(this, arguments);
    };
}

/* exported wordEnd */
function wordEnd(word,num){
    //word = ['сайтов','сайта','сайт']
    var num100 = num % 100;

    if (num === 0){
        return typeof(word[3]) !== 'undefined' ? word[3] : word[0];
    }
    if (num100 > 10 && num100 < 20){
        return word[0];
    }
    if ( (num % 5 >= 5) && (num100 <= 20) ){
        return word[0];
    }else{
        num = num % 10;
        if (((num >= 5) && num <= 9) || (num === 0)){
            return word[0];
        }
        if ((num >= 2) && (num <= 4)){
            return word[1];
        }
        if (num === 1){
            return word[2];
        }
    }
    return word[0];
}

/* exported getRandom */
function getRandom(min,max){
    min = min || 1;
    if (!max){
        max = min;
        min = 0;
    }

    return Math.floor(Math.random()*(max-min) + min);
}

(function (window, $) {
    jQuery.fn.blockHide = function (duration, callback) {
        var $this = $(this),
            timer = $this.data('fadeTimer');

        if (timer) {
            window.clearTimeout(timer);
        }

        $this.addClass('g-fade');
        timer = window.setTimeout(function () {
            $this.addClass('g-hidden');

            if (callback) {
                callback.apply(this);
            }
        }, duration);

        $this.data('fadeTimer', timer);
    };

    jQuery.fn.blockShow = function (duration, callback) {
        var $this = $(this),
            timer = $this.data('fadeTimer');

        if (timer) {
            window.clearTimeout(timer);
        }

        $this.removeClass('g-hidden');
        timer = window.setTimeout(function () {
            $this.removeClass('g-fade');

            timer = window.setTimeout(function () {
                if (callback) {
                    callback.apply(this);
                }
            }, duration);

            $this.data('fadeTimer', timer);
        }, 13);

        $this.data('fadeTimer', timer);
    };
} (window, jQuery));
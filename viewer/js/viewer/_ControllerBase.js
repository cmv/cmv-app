/*eslint no-console: 0*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/Deferred'
], function (
    declare,
    lang,
    Deferred
) {
    return declare(null, {
        init: function () {

            // create a set of deferreds that can be resolved by mixins
            // other mixins can also create deferreds in their relevent constructors
            this.configDeferred = new Deferred();

            this.inherited(arguments);
        },

        startup: function () {
            this.init();
            this.mapDeferred.then(function () {
                console.log(' map deferred');
            });
            this.configDeferred.then(function () {
                console.log(' config deferred');
            });
            this.layoutDeferred.then(function () {
                console.log(' layout deferred');
            });
            this.inherited(arguments);
        },

        //centralized error handler
        handleError: function (options) {
            if (this.config.isDebug) {
                if (typeof (console) === 'object') {
                    for (var option in options) {
                        if (options.hasOwnProperty(option)) {
                            console.log(option, options[option]);
                        }
                    }
                }
            } else {
                // add growler here?
                return;
            }
        },

        mixinDeep: function (dest, source) {
            //Recursively mix the properties of two objects
            var empty = {};
            for (var name in source) {
                if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
                    try {
                        if (source[name].constructor === Object) {
                            dest[name] = this.mixinDeep(dest[name], source[name]);
                        } else {
                            dest[name] = source[name];
                        }
                    } catch (e) {
                        // Property in destination object not set. Create it and set its value.
                        dest[name] = source[name];
                    }
                }
            }
            return dest;
        }
    });
});

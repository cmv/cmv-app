/*eslint no-console: 0*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang'
], function (
    declare,
    lang
) {
    return declare(null, {

        startup: function () {
            this.inherited(arguments);

            // in _ConfigMixin
            this.initConfigAsync().then(
                lang.hitch(this, 'initConfigSuccess'),
                lang.hitch(this, 'initConfigError')
            );
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
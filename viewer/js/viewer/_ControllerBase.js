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
        }
    });
});
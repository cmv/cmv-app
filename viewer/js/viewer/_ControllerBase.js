/*eslint no-console: 0*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/Deferred'
], function (
    declare, lang, Deferred
) {
    return declare(null, {

        /**
         * Mixes in this apps properties with the passed arguments
         * @param  {Object} args The properties to mixin
         * @return {undefined}
         */
        constructor: function (args) {
            lang.mixin(this, args);
        },

        /**
         * A method run before anything else, can be inherited by mixins to
         * load and process the config sync or async
         * @return {undefined | Deferred} If the operation is async it should return
         * a deferred, otherwise it should return the value of `this.inherited(arguments)`
         */
        loadConfig: function () {
            return this.inherited(arguments);
        },
        /**
         * A method run after the config is loaded but before startup is called
         * on mixins
         * @return {undefined | Deferred} If the operation is async it should return
         * a deferred, otherwise it should return the value of `this.inherited(arguments)`
         */
        postConfig: function () {
            return this.inherited(arguments);
        },
        /**
         * Start the application mixin chain, once the
         * startupDeferred is resolved
         * @return {undefined}
         */
        startup: function () {

            // cache the inherited
            var inherited = this.getInherited(arguments);

            // load config and process it
            this.startupDeferred = this.executeSync([
                this.loadConfig,
                this.postConfig
            ]);

            // wait for any loading to complete
            this.startupDeferred.then(lang.hitch(this, function () {

                // start up the mixin chain
                inherited.apply(this);
            }));
        },
        /**
         * executes an array of asynchronous methods synchronously
         * @param  {Array<function>} methods  The array of functions to execute
         * @param {Deferred} deferred A deferred created inside the method and resolved once all methods are complete
         * @return {Deferred}          A deferred resolved once all methods are executed
         */
        executeSync: function (methods, deferred) {
            deferred = deferred || new Deferred();

            // if our list is empty, resolve the deferred and quit
            if (!methods || !methods.length) {
                deferred.resolve();
                return deferred;
            }

            // execute and remove the method from the list
            var result = lang.hitch(this, methods.splice(0, 1)[0])();

            // execute our next function once this one completes
            if (result) {
                result.then(lang.hitch(this, 'executeSync', methods, deferred));
            } else {
                this.executeSync(methods, deferred);
            }
            return deferred;

        },

        //centralized error handler
        handleError: function (options) {
            if (this.config.isDebug) {
                if (typeof(console) === 'object') {
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

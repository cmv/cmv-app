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

        // the default name of the config file to load if ?config=configName
        // is not specified
        defaultConfig: 'viewer',
        loadConfig: function (wait) {

            // this will be used to make any inherited methods 'wait'
            var waitDeferred;

            if (wait) {
                waitDeferred = new Deferred();

                // if we need to wait for a previous deferred
                // wait for it,
                wait.then(lang.hitch(this, function () {

                    // load the config
                    this.initConfigAsync().then(lang.hitch(this, function () {

                        // do some stuff
                        this.initConfigSuccess(arguments);

                        // resolve
                        waitDeferred.resolve();
                    }),
                        lang.hitch(this, 'initConfigError')
                    );

                }));
            } else {

                waitDeferred = this.initConfigAsync();
                waitDeferred.then(
                    lang.hitch(this, 'initConfigSuccess'),
                    lang.hitch(this, 'initConfigError')
                );
            }
            // call any inherited methods or return a deferred
            return this.inherited(arguments, [waitDeferred]) || waitDeferred;
        },

        initConfigAsync: function () {
            var returnDeferred = new Deferred();
            // get the config file from the url if present
            var file = 'config/' + this.defaultConfig,
                s = window.location.search,
                q = s.match(/config=([^&]*)/i);
            if (q && q.length > 0) {
                file = q[1];
                if (file.indexOf('/') < 0) {
                    file = 'config/' + file;
                }
            }
            require([file], function (config) {
                returnDeferred.resolve(config);
            });
            return returnDeferred;
        },

        initConfigSuccess: function (config) {
            this.config = config;
            if (config.isDebug) {
                window.app = this; //dev only
            }

            // setup the map click mode
            this.mapClickMode = {
                current: config.defaultMapClickMode,
                defaultMode: config.defaultMapClickMode
            };
        },

        initConfigError: function (err) {
            this.handleError({
                source: 'Controller',
                error: err
            });
        }
    });
});

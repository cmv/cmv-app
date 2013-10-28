/* This patch should be removed at JSAPI 3.8 */
require([
    "dojo/_base/lang",
    "dojo/Deferred",
    "esri/dijit/Directions"
], function(lang, Deferred, Directions) {
    Directions.prototype._getCandidate = function(stop, index) {
        var def = new Deferred();
        var stopType = typeof stop;
        var emptyStop = {
            name: ''
        };
        if (!stop) {
            // stop not defined. Add empty string to end of list (default)
            def.resolve(emptyStop);
        } else if (stopType === 'object' && stop.hasOwnProperty('feature') && stop.hasOwnProperty('name')) {
            // stop is good to go
            def.resolve(stop);
        } else if (stopType === 'object' && stop.hasOwnProperty('address') && stop.hasOwnProperty('location')) {
            // stop needs to be converted but not gecoded
            var hydrated = this._globalGeocoder._hydrateResult(stop);
            def.resolve(hydrated);
        } else if (stopType === 'object' && stop.hasOwnProperty('name') && !stop.name) {
            // stop is empty stop. Has a name but it is null or empty string. we don't want to try and find it.
            def.resolve(emptyStop);
        } else {
            // stop missing geocode info -> convert it to text and geocode it.
            if (stopType === 'object' && stop.hasOwnProperty('name')) {
                stop = stop.name;
            }
            if (this.geocoders[index]) {
                emptyStop.name = this.geocoders[index].get("value");
            }
            // geocode stop
            this._globalGeocoder.find(stop).then(lang.hitch(this, function(candidates) {
                // return stop(s)
                if (candidates.results && candidates.results.length) {
                    def.resolve(candidates.results[0]);
                } else {
                    var message = 'Directions: candidate error';
                    this._resultError(message);
                    def.reject(message);
                }
            }), lang.hitch(this, function() {
                var message = 'Directions: find error';
                this._resultError(message);
                def.reject(message);
            }));
        }
        return def;
    };
});
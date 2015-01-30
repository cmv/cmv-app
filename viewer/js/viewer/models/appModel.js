define([
    'dojo/_base/declare',
    'dojo/Stateful',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic'
], function (
    declare, Stateful, lang, array, topic
) {
    var model = {
        debug: false,
        mapConfig: null,
        mapExtent: null,
        mapLod: null,
        map: null,
        layerInfos: [],
        widgetInfos: []
    };

    var SingletonClass = declare([Stateful], {
        constructor: function () {
            lang.mixin(this, model);
        },

        // custom map setter
        _mapSetter: function (map) {
            this.map = map;
            if (map.loaded) {
                this.mapLoad({
                    map: map
                });
            } else {
                map.on('load', lang.hitch(this, 'mapLoad'));
            }
            this.map.on('resize', function (evt) {
                var pnt = evt.target.extent.getCenter();
                setTimeout(function () {
                    evt.target.centerAt(pnt);
                }, 100);
            });
        },

        // wire up model map events
        mapLoad: function (r) {
            var map = r.map;
            //wire up extent change handler and defaults
            map.on('extent-change', lang.hitch(this, '_mapExtentChangeHandler'));
            this.set('mapExtent', map.extent);
            this.set('mapLod', map.getLevel());
        },

        // set model properties on extent change
        _mapExtentChangeHandler: function (evt) {
            this.set('mapExtent', evt.extent);
            this.set('mapLod', evt.lod);
        },

        // get layerInfo by layer id
        getLayerInfo: function (id) {
            var filter = array.filter(this.layerInfos, function (layerInfo) {
                return layerInfo.id === id;
            });
            if (filter[0]) {
                return filter[0];
            } else {
                return null;
            }
        },

        // get widgetInfo by widget (dijit) id
        getWidgetInfo: function (id) {
            var filter = array.filter(this.widgetInfos, function (widgetInfo) {
                return widgetInfo.id === id;
            });
            if (filter[0]) {
                return filter[0];
            } else {
                return null;
            }
        },

        // custom setter for debug wires up or removes error handling
        _debugSetter: function (debug) {
            this.debug = debug;
            if (this.debug) {
                this._errorHandler = topic.subscribe('viewer/error', lang.hitch(this, 'handleError'));
            } else {
                if (this._errorHandler) {
                    this._errorHandler.remove();
                }
            }
        },

        // log errors
        //    call directly if class/widget includes appModel
        //    or publish 'viewer/error' topic if not
        handleError: function (options) {
            if (this.debug) {
                if (typeof (console) === 'object') {
                    for (var option in options) {
                        if (options.hasOwnProperty(option)) {
                            console.log(option, options[option]);
                        }
                    }
                }
            } else {
                return;
            }
        }
    });

    if (!_instance) {
        var _instance = new SingletonClass();
    }
    return _instance;
});
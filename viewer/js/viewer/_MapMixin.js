define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom',
    'dojo/_base/array',
    'dojo/Deferred',

    'esri/map',

    'esri/IdentityManager'

], function (
    declare,
    lang,
    on,
    dom,
    array,
    Deferred,

    Map
) {

    return declare(null, {

        initMapAsync: function () {
            var returnDeferred = new Deferred();
            var returnWarnings = [];

            this._createMap();

            if (this.config.mapOptions.basemap) {
                this.map.on('load', lang.hitch(this, '_initLayers', returnWarnings));
            } else {
                this._initLayers(returnWarnings);
            }

            if (this.config.operationalLayers && this.config.operationalLayers.length > 0) {
                on.once(this.map, 'layers-add-result', lang.hitch(this, '_onLayersAddResult', returnDeferred, returnWarnings));
            } else {
                returnDeferred.resolve(returnWarnings);
            }
            return returnDeferred;
        },

        _createMap: function () {
            var container = dom.byId(this.config.layout.map) || 'mapCenter';
            this.map = new Map(container, this.config.mapOptions);
        },

        _onLayersAddResult: function (returnDeferred, returnWarnings, lyrsResult) {
            array.forEach(lyrsResult.layers, function (addedLayer) {
                if (addedLayer.success !== true) {
                    returnWarnings.push(addedLayer.error);
                }
            }, this);
            returnDeferred.resolve(returnWarnings);
        },

        _initLayers: function (returnWarnings) {
            this.layers = [];
            var layerTypes = {
                csv: 'esri/layers/CSVLayer',
                dataadapter: 'esri/layers/DataAdapterFeatureLayer', //untested
                dynamic: 'esri/layers/ArcGISDynamicMapServiceLayer',
                feature: 'esri/layers/FeatureLayer',
                georss: 'esri/layers/GeoRSSLayer',
                image: 'esri/layers/ArcGISImageServiceLayer',
                imagevector: 'esri/layers/ArcGISImageServiceVectorLayer',
                kml: 'esri/layers/KMLLayer',
                label: 'esri/layers/LabelLayer', //untested
                mapimage: 'esri/layers/MapImageLayer', //untested
                osm: 'esri/layers/OpenStreetMapLayer',
                raster: 'esri/layers/RasterLayer',
                stream: 'esri/layers/StreamLayer',
                tiled: 'esri/layers/ArcGISTiledMapServiceLayer',
                vectortile: 'esri/layers/VectorTileLayer',
                webtiled: 'esri/layers/WebTiledLayer',
                wfs: 'esri/layers/WFSLayer',
                wms: 'esri/layers/WMSLayer',
                wmts: 'esri/layers/WMTSLayer' //untested
            };
            // add any user-defined layer types such as https://github.com/Esri/geojson-layer-js
            layerTypes = lang.mixin(layerTypes, this.config.layerTypes || {});
            // loading all the required modules first ensures the layer order is maintained
            var modules = [];
            array.forEach(this.config.operationalLayers, function (layer) {
                var type = layerTypes[layer.type];
                if (type) {
                    modules.push(type);
                } else {
                    returnWarnings.push('Layer type "' + layer.type + '" is not supported: ');
                }
            }, this);

            require(modules, lang.hitch(this, function () {
                array.forEach(this.config.operationalLayers, function (layer) {
                    var type = layerTypes[layer.type];
                    if (type) {
                        require([type], lang.hitch(this, '_initLayer', layer));
                    }
                }, this);
                this.map.addLayers(this.layers);
            }));
        },

        _initLayer: function (layer, Layer) {
            var l;
            if (layer.url) {
                l = new Layer(layer.url, layer.options);
            } else {
                l = new Layer(layer.options);
            }
            this.layers.unshift(l); //unshift instead of push to keep layer ordering on map intact

            //Legend LayerInfos array
            var excludeLayerFromLegend = false;
            if (typeof layer.legendLayerInfos !== 'undefined' && typeof layer.legendLayerInfos.exclude !== 'undefined') {
                excludeLayerFromLegend = layer.legendLayerInfos.exclude;
            }
            if (!excludeLayerFromLegend) {
                var configuredLayerInfo = {};
                if (typeof layer.legendLayerInfos !== 'undefined' && typeof layer.legendLayerInfos.layerInfo !== 'undefined') {
                    configuredLayerInfo = layer.legendLayerInfos.layerInfo;
                }
                var layerInfo = lang.mixin({
                    layer: l,
                    title: layer.title || null
                }, configuredLayerInfo);
                this.legendLayerInfos.unshift(layerInfo); //unshift instead of push to keep layer ordering in legend intact
            }

            //LayerControl LayerInfos array
            this.layerControlLayerInfos.unshift({ //unshift instead of push to keep layer ordering in LayerControl intact
                layer: l,
                type: layer.type,
                title: layer.title,
                controlOptions: layer.layerControlLayerInfos
            });

            if (layer.type === 'feature') {
                var options = {
                    featureLayer: l
                };
                if (layer.editorLayerInfos) {
                    lang.mixin(options, layer.editorLayerInfos);
                }
                if (options.exclude !== true) {
                    this.editorLayerInfos.push(options);
                }
            }

            if (layer.type === 'dynamic' || layer.type === 'feature') {
                var idOptions = {
                    layer: l,
                    title: layer.title
                };
                if (layer.identifyLayerInfos) {
                    lang.mixin(idOptions, layer.identifyLayerInfos);
                }
                if (idOptions.exclude !== true) {
                    this.identifyLayerInfos.push(idOptions);
                }
            }
        },
        initMapComplete: function (warnings) {
            if (warnings && warnings.length > 0) {
                this.handleError({
                    source: 'Controller',
                    error: warnings.join(', ')
                });
            }

            this.map.on('resize', function (evt) {
                var pnt = evt.target.extent.getCenter();
                setTimeout(function () {
                    evt.target.centerAt(pnt);
                }, 100);
            });

            // in _LayoutsMixin
            this.createPanes();

            // in _WidgetsMixin
            this.initWidgets();
        },

        initMapError: function (err) {
            this.handleError({
                source: 'Controller',
                error: err
            });
        },

        resizeMap: function () {
            if (this.map) {
                this.map.resize();
            }
        },

        getMapHeight: function () {
            if (this.map) {
                return this.map.height;
            } else {
                return 0;
            }
        }
    });
});
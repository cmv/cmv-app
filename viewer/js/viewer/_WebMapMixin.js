define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom',

    'esri/arcgis/utils',
    'esri/units'

], function (
    declare,
    lang,
    array,
    dom,

    arcgisUtils,
    units
) {
    return declare(null, {
        startup: function () {
            this.inherited(arguments);
            // this.mapDeferred.then(lang.hitch(this, '_initWebMap'));
        },

        createMap: function () {
            var webMapOptions = this.config.webMapOptions || {};
            if (!webMapOptions.mapOptions && this.config.mapOptions) {
                webMapOptions.mapOptions = this.config.mapOptions;
            }
            var container = dom.byId(this.config.layout.map) || 'mapCenter';

            var mapDeferred = arcgisUtils.createMap(this.config.webMapId, container, webMapOptions);
            mapDeferred.then(lang.hitch(this, function (response) {
                this.webMap = {
                    clickEventHandle: response.clickEventHandle,
                    clickEventListener: response.clickEventListener,
                    itemInfo: response.itemInfo
                };
                this.map = response.map;

                // get the layerInfos from the webmap
                this._initWebMapLayerInfos(response);

                // add any widgets included in the webmap
                this._initWebMapWidgets(response);
            }));
            return mapDeferred;

        },

        _initWebMapLayerInfos: function (response) {
            if (this.config.layerControlLayerInfos) {
                // get the layerInfos for the layerControl widget from the config
                this.layerControlLayerInfos = this.config.layerControlLayerInfos;

            } else if (response.itemInfo && response.itemInfo.itemData) {
                // get the layerInfos for the layerControl widget from the webmap

                // https://developers.arcgis.com/web-map-specification/objects/operationalLayers/
                var layerTypes = {
                    'CSV': 'csv',
                    'ArcGISMapServiceLayer': 'dynamic',
                    'ArcGISFeatureLayer': 'feature',
                    'GeoRSSLayer': 'georss',
                    'ArcGISImageServiceLayer': 'image',
                    'esri/layers/ArcGISImageServiceVectorLayer': 'imagevector',
                    'KML': 'kml',
                    'ArcGISStreamLayer': 'stream',
                    'ArcGISTiledMapServiceLayer': 'tiled',
                    'VectorTileLayer': 'vectortile',
                    'WebTiledLayer': 'webtiled',
                    'WMS': 'wms'

                    /*
                        Are these supported in Webmaps?

                        'dataadapter': 'esri/layer/DataAdapterFeatureLayer', //untested
                        label: 'esri/layers/LabelLayer', //untested
                        mapimage: 'esri/layers/MapImageLayer', //untested
                        osm: 'esri/layers/OpenStreetMapLayer',
                        raster: 'esri/layers/RasterLayer',
                        'wfs': 'esri/layers/WFSLayer',
                        'esri/layers/WMTS': 'wmts'
                    */
                };

                var operationalLayers = response.itemInfo.itemData.operationalLayers;
                array.forEach(operationalLayers, lang.hitch(this, function (layer) {
                    var layerType = layerTypes[layer.layerType];
                    if (layerType) {
                        this.layerControlLayerInfos.push({
                            layer: layer.layerObject,
                            type: layerType,
                            title: layer.title
                        });
                    }
                }));
            }

            if (this.config.legendLayerInfos) {
                // get the layerInfos for the legend widget from the config
                this.legendLayerInfos = this.config.legendLayerInfos;
            } else {
                // get the layerInfos for the legend widget from the webmap
                this.legendLayerInfos = arcgisUtils.getLegendLayers(response);
            }
        },

        _initWebMapWidgets: function (response) {
            if (!response.itemInfo || !response.itemInfo.itemData) {
                return;
            }

            // existing widgets if any
            var widgets = this.config.widgets;

            var bookmarks = response.itemInfo.itemData.bookmarks;
            if (bookmarks && bookmarks.length > 0) {
                widgets.bookmarks = this.mixinDeep({
                    include: true,
                    id: 'bookmarks',
                    type: 'titlePane',
                    path: 'gis/dijit/Bookmarks',
                    title: 'Bookmarks',
                    open: false,
                    position: 999,
                    options: {
                        map: true,
                        editable: false,
                        bookmarks: bookmarks
                    }
                }, widgets.bookmarks || {});
            }

            if (response.itemInfo.itemData.applicationProperties) {
                // https://developers.arcgis.com/web-map-specification/objects/viewing/
                var viewing = response.itemInfo.itemData.applicationProperties.viewing;
                // possible widgets: basemapGallery, measure, routing, search

                if (viewing.basemapGallery && viewing.basemapGallery.enabled) {
                    if (!widgets.basemaps || !widgets.basemaps.include) { // basemap gallery widget and basemaps widget cannot co-exist
                        widgets.basemapGallery = this.mixinDeep({
                            include: true,
                            id: 'basemapGallery',
                            type: 'domNode',
                            path: 'gis/dijit/BasemapGallery',
                            srcNodeRef: 'basemapsDijit',
                            options: {
                                map: true
                            }
                        }, widgets.basemapGallery || {});
                    }
                }

                if (viewing.routing && viewing.routing.enabled) {
                    widgets.directions = this.mixinDeep({
                        include: true,
                        id: 'directions',
                        type: 'titlePane',
                        path: 'gis/dijit/Directions',
                        title: 'Directions',
                        open: false,
                        position: 999,
                        options: {
                            map: true,
                            mapRightClickMenu: true,
                            options: {
                                routeTaskUrl: 'https://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Network/USA/NAServer/Route',
                                routeParams: {
                                    directionsLanguage: 'en-US',
                                    directionsLengthUnits: units.MILES
                                },
                                active: false //for 3.12, starts active by default, which we dont want as it interfears with mapClickMode
                            }
                        }
                    }, widgets.directions || {});
                }

                if (viewing.measure && viewing.measure.enabled) {
                    widgets.measure = this.mixinDeep({
                        include: true,
                        id: 'measurement',
                        type: 'titlePane',
                        path: 'gis/dijit/Measurement',
                        title: 'Measurement',
                        open: false,
                        position: 999,
                        options: {
                            map: true,
                            mapClickMode: true,
                            defaultAreaUnit: units.SQUARE_MILES,
                            defaultLengthUnit: units.MILES
                        }
                    }, widgets.measure || {});
                }

                if (viewing.search && viewing.search.enabled) {
                    widgets.search = this.mixinDeep({
                        include: true,
                        type: 'domNode',
                        path: 'esri/dijit/Search',
                        srcNodeRef: 'geocoderButton',
                        options: {
                            map: true,
                            visible: true,
                            enableButtonMode: true,
                            expanded: true,
                            disablePlaceFinder: viewing.search.disablePlaceFinder,
                            hintText: viewing.search.hintText,
                            layers: viewing.search.layers
                        }
                    }, widgets.search || {});
                }
            }

            // https://developers.arcgis.com/web-map-specification/objects/widgets/
            if (response.itemInfo.itemData.widgets) {
                var timeSlider = response.itemInfo.itemData.widgets.timeSlider;
                if (timeSlider) {
                    widgets.timeSlider = this.mixinDeep({
                        include: true,
                        type: 'domNode',
                        path: 'esri/dijit/TimeSlider',
                        srcNodeRef: 'geocoderButton',
                        options: lang.mixin({
                            map: true
                        }, timeSlider)
                    }, widgets.slider || {});
                }
            }
        }
    });
});

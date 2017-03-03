define([
    'dojo/_base/declare',
    'dojo/_base/lang',

    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/dijit/PopupTemplate',
    'esri/graphicsUtils'

], function (
    declare,
    lang,

    GraphicsLayer,
    Graphic,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleFillSymbol,
    PopupTemplate,
    graphicsUtils
) {

    return declare(null, {

        //graphic layers
        featureGraphics: null,
        selectedGraphics: null,
        bufferGraphics: null,
        sourceGraphics: null,

        spatialReference: null,
        pointExtentSize: null,

        symbolOptions: {},

        // Default symbology for features
        defaultSymbolOptions: {
            features: {
                point: {
                    type: 'esriSMS',
                    style: 'esriSMSCircle',
                    size: 15,
                    color: [200, 0, 200, 16],
                    angle: 0,
                    xoffset: 0,
                    yoffset: 0,
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [200, 0, 200, 200],
                        width: 2
                    }
                },
                polyline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [200, 0, 200, 192],
                    width: 2
                },
                polygon: {
                    type: 'esriSFS',
                    style: 'esriSFSSolid',
                    color: [255, 0, 255, 16],
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [200, 0, 200, 192],
                        width: 1
                    }
                }
            },

            // Default symbology for selected features
            selected: {
                point: {
                    type: 'esriSMS',
                    style: 'esriSMSCircle',
                    size: 15,
                    color: [0, 255, 255, 16],
                    angle: 0,
                    xoffset: 0,
                    yoffset: 0,
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [0, 255, 255, 255],
                        width: 2
                    }
                },
                polyline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 255, 255, 255],
                    width: 2
                },
                polygon: {
                    type: 'esriSFS',
                    style: 'esriSFSSolid',
                    color: [0, 255, 255, 32],
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [0, 255, 255, 255],
                        width: 2
                    }
                }
            },

            // Default symbology for highlighted features
            highlighted: {
                point: {
                    type: 'esriSMS',
                    style: 'esriSMSCircle',
                    size: 15,
                    color: [255, 255, 255, 64],
                    angle: 0,
                    xoffset: 0,
                    yoffset: 0,
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [0, 255, 255, 255],
                        width: 2
                    }
                },
                polyline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 255, 255, 255],
                    width: 2
                },
                polygon: {
                    type: 'esriSFS',
                    style: 'esriSFSSolid',
                    color: [0, 255, 255, 64],
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [0, 255, 255, 255],
                        width: 2
                    }
                }
            },

            // Default symbology for source features
            source: {
                point: {
                    type: 'esriSMS',
                    style: 'esriSMSCircle',
                    size: 3,
                    color: [0, 0, 0, 32],
                    angle: 0,
                    xoffset: 0,
                    yoffset: 0,
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [0, 0, 0, 128],
                        width: 1
                    }
                },
                polyline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 0, 0, 128],
                    width: 1
                },
                polygon: {
                    type: 'esriSFS',
                    style: 'esriSFSSolid',
                    color: [0, 0, 0, 32],
                    outline: {
                        type: 'esriSLS',
                        style: 'esriSLSSolid',
                        color: [0, 0, 0, 128],
                        width: 1
                    }
                }
            },

            // Default symbology for buffer
            buffer: {
                type: 'esriSFS',
                style: 'esriSFSSolid',
                color: [255, 0, 0, 32],
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSDash',
                    color: [255, 0, 0, 255],
                    width: 1
                }
            }
        },

        getGraphicsConfiguration: function (options) {
            this.symbolOptions = this.mixinDeep(lang.clone(this.defaultSymbolOptions), options);

            // symbology for features returned from query
            var symbol = lang.mixin({}, this.symbolOptions.features);
            this.featurePointSymbol = new SimpleMarkerSymbol(symbol.point);
            this.featurePolylineSymbol = new SimpleLineSymbol(symbol.polyline);
            this.featurePolygonSymbol = new SimpleFillSymbol(symbol.polygon);

            // symbology for the source feature
            symbol = lang.mixin({}, this.symbolOptions.source);
            this.sourcePointSymbol = new SimpleMarkerSymbol(symbol.point);
            this.sourcePolylineSymbol = new SimpleLineSymbol(symbol.polyline);
            this.sourcePolygonSymbol = new SimpleFillSymbol(symbol.polygon);

            // symbology for features selected
            symbol = lang.mixin({}, this.symbolOptions.selected);
            this.selectedPointSymbol = new SimpleMarkerSymbol(symbol.point);
            this.selectedPolylineSymbol = new SimpleLineSymbol(symbol.polyline);
            this.selectedPolygonSymbol = new SimpleFillSymbol(symbol.polygon);

            // symbology for features highlighted (mouseover)
            symbol = lang.mixin({}, this.symbolOptions.highlighted);
            this.highlightedPointSymbol = new SimpleMarkerSymbol(symbol.point);
            this.highlightedPolylineSymbol = new SimpleLineSymbol(symbol.polyline);
            this.highlightedPolygonSymbol = new SimpleFillSymbol(symbol.polygon);

            // symbology for source feature buffer
            symbol = lang.mixin({}, this.symbolOptions.buffer);
            this.bufferPolygonSymbol = new SimpleFillSymbol(symbol);

        },

        /*******************************
        *  Add Graphics Layer
        *******************************/

        addGraphicsLayer: function () {
            this.sourceGraphics = new GraphicsLayer({
                id: this.topicID + '_SourceGraphics',
                title: 'Attribute Source Graphics'
            });
            this.map.addLayer(this.sourceGraphics);

            this.bufferGraphics = new GraphicsLayer({
                id: this.topicID + '_BufferGraphics',
                title: 'Attribute Buffer Graphics'
            });
            this.map.addLayer(this.bufferGraphics);

            this.featureGraphics = new GraphicsLayer({
                id: this.topicID + '_FeatureGraphics',
                title: 'Attribute Feature Graphics'
            });
            if (this.featureOptions && this.featureOptions.selected !== false) {
                this.featureGraphics.on('click', lang.hitch(this, 'selectFeatureFromMap'));
                this.featureGraphics.on('mouse-over', lang.hitch(this, 'highlightGraphic'));
                this.featureGraphics.on('mouse-out', lang.hitch(this, 'unhighlightGraphic'));
            }
            this.map.addLayer(this.featureGraphics);

            this.selectedGraphics = new GraphicsLayer({
                id: this.topicID + '_SelectedGraphics',
                title: 'Attribute Selected Graphics'
            });
            this.map.addLayer(this.selectedGraphics);

        },

        /*******************************
        *  Adding Graphics Functions
        *******************************/

        addFeatureGraphic: function (feature) {
            var symbol, graphic;
            switch (feature.geometry.type) {
            case 'point':
            case 'multipoint':
                symbol = this.featurePointSymbol;
                break;
            case 'polyline':
                symbol = this.featurePolylineSymbol;
                break;
            case 'polygon':
                symbol = this.featurePolygonSymbol;
                break;
            default:
            }
            if (symbol) {
                graphic = new Graphic(feature.geometry, symbol, feature.attributes);
                if (this.infoTemplate) {
                    var infoTemplate = new PopupTemplate(this.infoTemplate);
                    graphic.setInfoTemplate(infoTemplate);
                }
                this.featureGraphics.add(graphic);
            }
        },

        addSourceGraphic: function (geometry) {
            var symbol, graphic;
            switch (geometry.type) {
            case 'point':
            case 'multipoint':
                symbol = this.sourcePointSymbol;
                break;
            case 'polyline':
                symbol = this.sourcePolylineSymbol;
                break;
            case 'extent':
            case 'polygon':
                symbol = this.sourcePolygonSymbol;
                break;
            default:
            }
            if (symbol) {
                graphic = new Graphic(geometry, symbol);
                this.sourceGraphics.add(graphic);
            }
        },

        addSelectedGraphic: function (feature) {
            var graphic = null,
                symbol = null;
            if (!this.featureOptions.selected) {
                return;
            }
            this.selectedFeatures.push(feature);

            switch (feature.geometry.type) {
            case 'point':
            case 'multipoint':
                symbol = this.selectedPointSymbol;
                break;
            case 'polyline':
                symbol = this.selectedPolylineSymbol;
                break;
            case 'polygon':
                symbol = this.selectedPolygonSymbol;
                break;
            default:
            }
            if (symbol) {
                graphic = new Graphic(feature.geometry, symbol, feature.attributes);
                if (this.infoTemplate) {
                    var infoTemplate = new PopupTemplate(this.infoTemplate);
                    graphic.setInfoTemplate(infoTemplate);
                }
                this.selectedGraphics.add(graphic);
            }
        },

        addBufferGraphic: function (geometry) {
            var symbol = this.bufferPolygonSymbol;
            var graphic = new Graphic(geometry, symbol);
            this.bufferGraphics.add(graphic);
        },

        /*******************************
        *  Selection Functions
        *******************************/

        selectFeatureFromMap: function (evt) {
            if (!this.featureOptions.selected) {
                return;
            }
            var key, graphic = evt.graphic,
                row, feature;
            if (graphic) {
                key = graphic.attributes[this.idProperty];
                if (key) {
                    row = this.grid.row(key);
                    if (row) {
                        if (!evt.ctrlKey) {
                            this.clearSelectedFeatures();
                        }
                        if (row.element) { // it is in the current grid
                            if (this.grid.select) {
                                // prevents the map from moving around
                                // by zooming to selected features
                                var mnu = this.toolbarOptions.zoom;
                                var zm = mnu.selected;
                                mnu.selected = false;
                                this.grid.select(row);
                                this.grid.focus(row.element);
                                row.element.focus();
                                mnu.selected = zm;
                                this.setToolbarButtons();
                            }
                        } else {
                            feature = this.getFeatureFromStore(key);
                            if (feature && feature.geometry) {
                                this.addSelectedGraphic(feature);
                                this.doneSelectingFeatures(false);
                            }
                        }
                    }
                }
                if (!evt.ctrlKey && this.selectedFeatures.length === 1) {
                    if (graphic.infoTemplate && this.map.infoWindow) {
                        var center,
                            extent = this.getGraphicsExtent(this.selectedGraphics);
                        if (extent) {
                            center = extent.getCenter();
                        }
                        if (center) {
                            this.map.infoWindow.setFeatures([graphic]);
                            //this.map.infoWindow.setTitle(item.title);
                            //this.map.infoWindow.setContent(item.content);
                            if (this.map.infoWindow.reposition) {
                                this.map.infoWindow.reposition();
                            }
                            this.map.infoWindow.show(center);
                        }
                    }
                }
            }
        },

        /*******************************
        *  Visibility Functions
        *******************************/

        showAllGraphics: function () {
            this.showFeatureGraphics();
            this.showSelectedGraphics();
            this.showSourceGraphics();
            this.showBufferGraphics();
        },

        hideAllGraphics: function () {
            this.hideFeatureGraphics();
            this.hideSelectedGraphics();
            this.hideSourceGraphics();
            this.hideBufferGraphics();
        },

        showFeatureGraphics: function () {
            this.showGraphicsLayer(this.featureGraphics);
        },

        hideFeatureGraphics: function () {
            this.hideGraphicsLayer(this.featureGraphics);
        },

        showSelectedGraphics: function () {
            this.showGraphicsLayer(this.selectedGraphics);
        },

        hideSelectedGraphics: function () {
            this.hideGraphicsLayer(this.selectedGraphics);
        },

        showSourceGraphics: function () {
            this.showGraphicsLayer(this.sourceGraphics);
        },

        hideSourceGraphics: function () {
            this.hideGraphicsLayer(this.sourceGraphics);
        },

        showBufferGraphics: function () {
            this.showGraphicsLayer(this.bufferGraphics);
        },

        hideBufferGraphics: function () {
            this.hideGraphicsLayer(this.bufferGraphics);
        },

        showGraphicsLayer: function (layer) {
            if (layer) {
                layer.show();
            }
        },

        hideGraphicsLayer: function (layer) {
            if (layer) {
                layer.hide();
            }
        },

        highlightGraphic: function (evt, removehighlight) {
            var graphic = evt.graphic,
                symbol;

            // mapClickMode won't be set by default
            // so we must also look for null
            if (this.mapClickMode && this.mapClickMode !== 'identify') {
                removehighlight = true;
            }
            if (graphic) {
                switch (graphic.geometry.type) {
                case 'point':
                case 'multipoint':
                    if (removehighlight) {
                        symbol = this.featurePointSymbol;
                    } else {
                        symbol = this.highlightedPointSymbol;
                    }
                    break;
                case 'polyline':
                    if (removehighlight) {
                        symbol = this.featurePolylineSymbol;
                    } else {
                        symbol = this.highlightedPolylineSymbol;
                    }
                    break;
                case 'polygon':
                    if (removehighlight) {
                        symbol = this.featurePolygonSymbol;
                    } else {
                        symbol = this.highlightedPolygonSymbol;
                    }
                    break;
                }
                if (symbol) {
                    graphic.setSymbol(symbol);
                }
                if (graphic.getDojoShape() !== null) {
                    graphic.getDojoShape().moveToFront();
                }
            }
            this.setToolbarButtons();
        },

        unhighlightGraphic: function (evt) {
            this.highlightGraphic(evt, true);
        },

        /*******************************
        *  Zoom Functions
        *******************************/

        zoomToFeatureGraphics: function () {
            var extent, featureExtent = this.getGraphicsExtent(this.featureGraphics);
            if (featureExtent) {
                if (this.sourceGraphics) {
                    extent = this.getGraphicsExtent(this.sourceGraphics);
                    if (extent) {
                        featureExtent.union(extent);
                    }
                }
                if (this.bufferGraphics) {
                    extent = this.getGraphicsExtent(this.bufferGraphics);
                    if (extent) {
                        featureExtent.union(extent);
                    }
                }
            }

            if (featureExtent) {
                this.zoomToExtent(featureExtent);
            }
        },

        zoomToSelectedGraphics: function () {
            return this.zoomToGraphics(this.selectedGraphics);
        },

        zoomToSourceGraphics: function () {
            return this.zoomToGraphics(this.sourceGraphics);
        },

        zoomToBufferGraphics: function () {
            return this.zoomToGraphics(this.bufferGraphics);
        },

        zoomToGraphics: function (layer) {
            if (layer) {
                var zoomExtent = this.getGraphicsExtent(layer);
                if (zoomExtent) {
                    this.zoomToExtent(zoomExtent);
                }
                return zoomExtent;
            }
            return null;
        },

        zoomToExtent: function (extent) {
            this.map.setExtent(extent.expand(1.5));
        },

        getGraphicsExtent: function (layer) {
            var zoomExtent;
            if (layer.graphics && layer.graphics.length) {
                zoomExtent = graphicsUtils.graphicsExtent(layer.graphics);
                if (zoomExtent.xmin === zoomExtent.xmax || zoomExtent.ymin === zoomExtent.ymax) {
                    zoomExtent = this.expandExtent(zoomExtent);
                }
            }
            return zoomExtent;
        },

        expandExtent: function (extent) {
            if (!this.spatialReference) {
                this.spatialReference = this.map.spatialReference.wkid;
            }
            if (!this.pointExtentSize) {
                if (this.spatialReference === 4326) { // special case for geographic lat/lng
                    this.pointExtentSize = 0.0001;
                } else {
                    this.pointExtentSize = 250; // could be feet or meters
                }
            }

            extent.xmin -= this.pointExtentSize;
            extent.ymin -= this.pointExtentSize;
            extent.xmax += this.pointExtentSize;
            extent.ymax += this.pointExtentSize;
            return extent;
        },

        /*******************************
        *  Clearing Functions
        *******************************/

        clearFeatureGraphics: function () {
            this.clearGraphicsLayer(this.featureGraphics);
            this.hideInfoWindow();
        },

        clearSelectedGraphics: function () {
            this.clearGraphicsLayer(this.selectedGraphics);
        },

        clearSourceGraphics: function () {
            this.clearGraphicsLayer(this.sourceGraphics);
        },

        clearBufferGraphics: function () {
            this.clearGraphicsLayer(this.bufferGraphics);
        },

        clearGraphicsLayer: function (layer) {
            if (layer) {
                layer.clear();
            }
            this.setToolbarButtons();

        }
    });
});

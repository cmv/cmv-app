define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Form',
    'dijit/form/FilteringSelect',
    'dijit/form/ValidationTextBox',
    'dijit/form/CheckBox',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/_base/lang',
    'dojo/_base/Color',
    'dojo/_base/array',
    'dojo/store/Memory',
    'dgrid/OnDemandGrid',
    'dgrid/Selection',
    'dgrid/Keyboard',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/layers/FeatureLayer',
    'esri/graphicsUtils',
    'esri/tasks/FindTask',
    'esri/tasks/FindParameters',
    'esri/geometry/Extent',
    'dojo/text!./Find/templates/Find.html',
    'xstyle/css!./Find/css/Find.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Form, FilteringSelect, ValidationTextBox, CheckBox, dom, domConstruct, domClass, lang, Color, array, Memory, OnDemandGrid, Selection, Keyboard, GraphicsLayer, Graphic, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, FeatureLayer, graphicsUtils, FindTask, FindParameters, Extent, FindTemplate, css) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: FindTemplate,
        baseClass: 'gis_FindDijit',

        // Spatial Reference. uses the map's spatial reference if none provided
        spatialReference: null,

        // Use 0.0001 for decimal degrees (wkid 4326)
        // or 500 for meters/feet
        pointExtentSize: null,

        // default symbology for found features
        defaultSymbols: {
            point: {
                type: 'esriSMS',
                style: 'esriSMSCircle',
                size: 25,
                color: [0, 255, 255, 255],
                angle: 0,
                xoffset: 0,
                yoffset: 0,
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 0, 0, 255],
                    width: 2
                }
            },
            polyline: {
                type: 'esriSLS',
                style: 'esriSLSSolid',
                color: [0, 0, 255, 255],
                width: 3
            },
            polygon: {
                type: 'esriSFS',
                style: 'esriSFSSolid',
                color: [0, 255, 255, 32],
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 255, 255, 255],
                    width: 3
                }
            }
        },

        postCreate: function () {
            this.inherited(arguments);

            if (this.spatialReference === null) {
                this.spatialReference = this.map.spatialReference.wkid;
            }
            if (this.pointExtentSize === null) {
                if (this.spatialReference === 4326) { // special case for geographic lat/lng
                    this.pointExtentSize = 0.0001;
                } else {
                    this.pointExtentSize = 500; // could be feet or meters
                }
            }

            var pointSymbol = null, polylineSymbol = null, polygonSymbol = null;
            var pointRenderer = null, polylineRenderer = null, polygonRenderer = null;

            var symbols = lang.mixin({}, this.symbols);
            // handle each property to preserve as much of the object heirarchy as possible
            symbols = {
                point: lang.mixin(this.defaultSymbols.point, symbols.point),
                polyline: lang.mixin(this.defaultSymbols.polyline, symbols.polyline),
                polygon:  lang.mixin(this.defaultSymbols.polygon, symbols.polygon)
            };

            // points
            this.pointGraphics = new GraphicsLayer({
                id: 'findGraphics_point',
                title: 'Find'
            });

            if (symbols.point) {
                pointSymbol = new SimpleMarkerSymbol(symbols.point);
                pointRenderer = new SimpleRenderer(pointSymbol);
                pointRenderer.label = 'Find Results (Points)';
                pointRenderer.description = 'Find results (Points)';
                this.pointGraphics.setRenderer(pointRenderer);
            }

            // poly line
            this.polylineGraphics = new GraphicsLayer({
                id: 'findGraphics_line',
                title: 'Find Graphics'
            });

            if (symbols.polyline) {
                polylineSymbol = new SimpleLineSymbol(symbols.polyline);
                polylineRenderer = new SimpleRenderer(polylineSymbol);
                polylineRenderer.label = 'Find Results (Lines)';
                polylineRenderer.description = 'Find Results (Lines)';
                this.polylineGraphics.setRenderer(polylineRenderer);
            }

            // polygons
            this.polygonGraphics = new GraphicsLayer({
                id: 'findGraphics_polygon',
                title: 'Find Graphics'
            });

            if (symbols.polygon) {
                polygonSymbol = new SimpleFillSymbol(symbols.polygon);
                polygonRenderer = new SimpleRenderer(polygonSymbol);
                polygonRenderer.label = 'Find Results (Polygons)';
                polygonRenderer.description = 'Find Results (Polygons)';
                this.polygonGraphics.setRenderer(polygonRenderer);
            }

            this.map.addLayer(this.polygonGraphics);
            this.map.addLayer(this.polylineGraphics);
            this.map.addLayer(this.pointGraphics);

            var k = 0, queryLen = this.queries.length;

            // add an id so it becomes key/value pair store
            for (k = 0; k < queryLen; k++) {
                this.queries[k].id = k;
            }
            this.queryIdx = 0;
            if (queryLen > 1) {
                var queryStore = new Memory({
                    data: this.queries
                });
                this.querySelectDijit.set('store', queryStore);
                this.querySelectDijit.set('value', this.queryIdx);
            } else {
                this.querySelectDom.style.display = 'none';
            }
        },
        search: function () {
            var query = this.queries[this.queryIdx];
            var searchText = this.searchTextDijit.value;
            if (query && query.minChars && searchText) {
                if (searchText.length === 0 || (query.minChars && (searchText.length < query.minChars))) {
                    this.findResultsNode.innerHTML = 'You must enter at least ' + query.minChars + ' characters.';
                    this.findResultsNode.style.display = 'block';
                    return;
                }
            }

            this.createResultsGrid();
            this.clearResultsGrid();
            this.clearFeatures();
            domConstruct.empty(this.findResultsNode);

            if (!query || !query.url || !query.layerIds || !query.searchFields) {
                return;
            }

            //create find parameters
            var findParams = new FindParameters();
            findParams.returnGeometry = true;
            findParams.layerIds = query.layerIds;
            findParams.searchFields = query.searchFields;
            findParams.layerDefs = query.layerDefs;

            findParams.searchText = searchText;
            findParams.contains = !this.containsSearchText.checked;

            findParams.outSpatialReference = {
                wkid: this.spatialReference
            };

            this.findResultsNode.innerHTML = 'Searching...';
            this.findResultsNode.style.display = 'block';

            var findTask = new FindTask(query.url);
            findTask.execute(findParams, lang.hitch(this, 'showResults'));
        },

        createResultsGrid: function () {
            if (!this.resultsStore) {
                this.resultsStore = new Memory({
                    idProperty: 'id',
                    data: []
                });
            }

            if (!this.resultsGrid) {
                var Grid = declare([OnDemandGrid, Keyboard, Selection]);
                this.resultsGrid = new Grid({
                    selectionMode: 'single',
                    cellNavigation: false,
                    showHeader: true,
                    store: this.resultsStore,
                    columns:{
                      layerName: 'Layer',
                      foundFieldName: 'Field',
                      value: 'Result'
                    },
                    sort: [{
                        attribute: 'value',
                        descending: false
                    }]
                    //minRowsPerPage: 250,
                    //maxRowsPerPage: 500
                }, this.findResultsGrid);

                this.resultsGrid.startup();
                this.resultsGrid.on('dgrid-select', lang.hitch(this, 'selectFeature'));
            }
        },

        showResults: function (results) {
            var resultText = '';
            this.resultIdx = 0;
            this.results = results;

            if (this.results.length > 0) {
                var s = (this.results.length === 1) ? '' : 's';
                resultText = this.results.length + ' Result' + s + ' Found';
                this.highlightFeatures();
                this.showResultsGrid();
            } else {
                resultText = 'No Results Found';
            }
            this.findResultsNode.innerHTML = resultText;

        },

        showResultsGrid: function () {
            var query = this.queries[this.queryIdx];
            this.resultsGrid.store.setData(this.results);
            this.resultsGrid.refresh();

            var lyrDisplay = 'block';
            if (query.layerIds.length === 1) {
                lyrDisplay = 'none';
            }
            this.resultsGrid.styleColumn('layerName', 'display:' + lyrDisplay);

            if (query && query.hideGrid !== true) {
                this.findResultsGrid.style.display = 'block';
            }
        },

        highlightFeatures: function () {
            var unique = 0;
            array.forEach(this.results, function (result) {
                // add a unique key for the store
                result.id = unique;
                unique++;
                var graphic, feature = result.feature;
                switch (feature.geometry.type) {
                    case 'point':
                        graphic = new Graphic(feature.geometry);
                        this.pointGraphics.add(graphic);
                        break;
                    case 'polyline':
                        graphic = new Graphic(feature.geometry);
                        this.polylineGraphics.add(graphic);
                        break;
                    case 'polygon':
                        graphic = new Graphic(feature.geometry, null, {
                            ren: 1
                        });
                        this.polygonGraphics.add(graphic);
                        break;
                    default:
                }
            }, this);

            // zoom to layer extent
            var zoomExtent = null;
            //If the layer is a single point then extents are null
            // if there are no features in the layer then extents are null
            // the result of union() to null extents is null

            if (this.pointGraphics.graphics.length > 0) {
                zoomExtent = this.getPointFeaturesExtent(this.pointGraphics.graphics);
            }
            if (this.polylineGraphics.graphics.length > 0) {
                if (zoomExtent === null) {
                    zoomExtent = graphicsUtils.graphicsExtent(this.polylineGraphics.graphics);
                } else {
                    zoomExtent = zoomExtent.union(graphicsUtils.graphicsExtent(this.polylineGraphics.graphics));
                }
            }
            if (this.polygonGraphics.graphics.length > 0) {
                if (zoomExtent === null) {
                    zoomExtent = graphicsUtils.graphicsExtent(this.polygonGraphics.graphics);
                } else {
                    zoomExtent = zoomExtent.union(graphicsUtils.graphicsExtent(this.polygonGraphics.graphics));
                }
            }

            this.zoomToExtent(zoomExtent);
        },

        selectFeature: function (event) {
            var result = event.rows;

            // zoom to feature
            if (result.length) {
                var data = result[0].data;
                if (data) {
                    var feature = data.feature;
                    if (feature) {
                        var extent = feature.geometry.getExtent();
                        if (!extent && feature.geometry.type === 'point') {
                            extent = this.getExtentFromPoint(feature);
                        }
                        if (extent) {
                            this.zoomToExtent(extent);
                        }
                    }
                }
            }
        },

        zoomToExtent: function (extent) {
            this.map.setExtent(extent.expand(1.2));
        },

        clearResults: function () {
            this.results = null;
            this.clearResultsGrid();
            this.clearFeatures();
            this.searchFormDijit.reset();
            this.querySelectDijit.setValue(this.queryIdx);
            domConstruct.empty(this.findResultsNode);
        },

        clearResultsGrid: function () {
            if (this.resultStore) {
                this.resultsStore.setData([]);
            }
            if (this.resultsGrid) {
                this.resultsGrid.refresh();
            }
            this.findResultsNode.style.display = 'none';
            this.findResultsGrid.style.display = 'none';
        },

        clearFeatures: function () {
            this.pointGraphics.clear();
            this.polylineGraphics.clear();
            this.polygonGraphics.clear();
        },

        getPointFeaturesExtent: function (pointFeatures) {
            var extent = graphicsUtils.graphicsExtent(pointFeatures);
            if (extent === null && pointFeatures.length > 0) {
                extent = this.getExtentFromPoint(pointFeatures[0]);
            }

            return extent;
        },

        getExtentFromPoint: function (point) {
            var sz = this.pointExtentSize; // hack
            var pt = point.geometry;
            var extent = new Extent({
                'xmin': pt.x - sz,
                'ymin': pt.y - sz,
                'xmax': pt.x + sz,
                'ymax': pt.y + sz,
                'spatialReference': {
                    wkid: this.spatialReference
                }
            });
            return extent;
        },

        _onQueryChange: function (queryIdx) {
            if (queryIdx >= 0 && queryIdx < this.queries.length) {
                this.queryIdx = queryIdx;
            }
        }
    });
});
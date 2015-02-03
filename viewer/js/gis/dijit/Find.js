define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/dom-construct',
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/on',
	'dojo/keys',
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
	'esri/graphicsUtils',
	'esri/tasks/FindTask',
	'esri/tasks/FindParameters',
	'esri/geometry/Extent',
	'dojo/text!./Find/templates/Find.html',
	'js/gis/dijit/Find/symbology/symbols.js',
	'dojo/i18n!./Find/nls/resource',
	'dijit/form/Form',
	'dijit/form/FilteringSelect',
	'dijit/form/ValidationTextBox',
	'dijit/form/CheckBox',
	'xstyle/css!./Find/css/Find.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, domConstruct, lang, array, on, keys, Memory, OnDemandGrid, Selection, Keyboard, GraphicsLayer, Graphic, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, graphicsUtils, FindTask, FindParameters, Extent, FindTemplate, symbols, i18n) {
	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		widgetsInTemplate: true,
		templateString: FindTemplate,
		baseClass: 'gis_FindDijit',
		i18n: i18n,

		// Spatial Reference. uses the map's spatial reference if none provided
		spatialReference: null,

		// Use 0.0001 for decimal degrees (wkid 4326)
		// or 500 for meters/feet
		pointExtentSize: null,

		symbols: symbols,
		resultsSymbols: null,
		selectionSymbols: null,








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

			this.createGraphicLayers();

			// allow pressing enter key to initiate the search
			this.own(on(this.searchTextDijit, 'keyup', lang.hitch(this, function (evt) {
				if (evt.keyCode === keys.ENTER) {
					this.search();
				}
			})));

			this.queryIdx = 0;

			// add an id so the queries becomes key/value pair store
			var k = 0, queryLen = this.queries.length;
			for (k = 0; k < queryLen; k++) {
				this.queries[k].id = k;
			}

			// add the queries to the drop-down list
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

		createGraphicLayers: function () {

			// handle each property to preserve as much of the object heirarchy as possible
			resultsSymbols = lang.mixin(symbols.resultsSymbols, this.resultsSymbols);
			selectionSymbols = lang.mixin(symbols.selectionSymbols, this.selectionSymbols);

			// points
			this.pointResultsGraphics = new GraphicsLayer({
				id: 'findResultsGraphics_point',
				title: 'Find'
			});

			if (resultsSymbols.point) {
				pointResultsSymbol = new SimpleMarkerSymbol(resultsSymbols.point);
				pointResultsRenderer = new SimpleRenderer(pointResultsSymbol);
				pointResultsRenderer.label = 'Find Results (Points)';
				pointResultsRenderer.description = 'Find results (Points)';
				this.pointResultsGraphics.setRenderer(pointResultsRenderer);
			}

			this.pointSelectionGraphics = new GraphicsLayer({
				id: this.id + '_findSelectionGraphics_point',
				title: 'Selection'
			});

			if (selectionSymbols.point) {
				pointSelectionSymbol = new SimpleMarkerSymbol(selectionSymbols.point);
				pointSelectionRenderer = new SimpleRenderer(pointSelectionSymbol);
				pointSelectionRenderer.label = 'Selection (Points)';
				pointSelectionRenderer.description = 'Selection (Points)';
				this.pointSelectionGraphics.setRenderer(pointSelectionRenderer);
			}

			// poly line
			this.polylineResultsGraphics = new GraphicsLayer({
				id: 'findResultsGraphics_line',
				title: 'Find Graphics'
			});

			if (resultsSymbols.polyline) {
				polylineResultsSymbol = new SimpleLineSymbol(resultsSymbols.polyline);
				polylineResultsRenderer = new SimpleRenderer(polylineResultsSymbol);
				polylineResultsRenderer.label = 'Find Results (Lines)';
				polylineResultsRenderer.description = 'Find Results (Lines)';
				this.polylineResultsGraphics.setRenderer(polylineResultsRenderer);
			}

			this.polylineSelectionGraphics = new GraphicsLayer({
				id: this.id + '_findSelectionGraphics_line',
				title: 'Selection'
			});

			if (selectionSymbols.polyline) {
				polylineSelectionSymbol = new SimpleLineSymbol(selectionSymbols.polyline);
				polylineSelectionRenderer = new SimpleRenderer(polylineSelectionSymbol);
				polylineSelectionRenderer.label = 'Selection + (Lines)';
				polylineSelectionRenderer.description = 'Selection (Lines)';
				this.polylineSelectionGraphics.setRenderer(polylineSelectionRenderer);
			}

			// polygons
			this.polygonResultsGraphics = new GraphicsLayer({
				id: 'findResultsGraphics_polygon',
				title: 'Find Graphics'
			});

			if (resultsSymbols.polygon) {
				polygonSymbol = new SimpleFillSymbol(resultsSymbols.polygon);
				polygonRenderer = new SimpleRenderer(polygonSymbol);
				polygonRenderer.label = 'Find Results (Polygons)';
				polygonRenderer.description = 'Find Results (Polygons)';
				this.polygonResultsGraphics.setRenderer(polygonRenderer);
			}

			this.polygonSelectionGraphics = new GraphicsLayer({
				id: this.id + '_findSelectionGraphics_polygon',
				title: 'Selection'
			});

			if (selectionSymbols.polygon) {
				polygonSelectionSymbol = new SimpleFillSymbol(selectionSymbols.polygon);
				polygonSelectionRenderer = new SimpleRenderer(polygonSelectionSymbol);
				polygonSelectionRenderer.label = 'Selection (Polygons)';
				polygonSelectionRenderer.description = 'Selection (Polygons)';
				this.polygonSelectionGraphics.setRenderer(polygonSelectionRenderer);
			}

			this.map.addLayer(this.polygonResultsGraphics);
			this.map.addLayer(this.polylineResultsGraphics);
			this.map.addLayer(this.pointResultsGraphics);
			this.map.addLayer(this.polygonSelectionGraphics);
			this.map.addLayer(this.polylineSelectionGraphics);
			this.map.addLayer(this.pointSelectionGraphics);
		},
		search: function () {
			var query = this.queries[this.queryIdx];
			var searchText = this.searchTextDijit.get('value');
			if (!query || !searchText || searchText.length === 0) {
				return;
			}
			if (query.minChars && (searchText.length < query.minChars)) {
				this.findResultsNode.innerHTML = 'You must enter at least ' + query.minChars + ' characters.';
				this.findResultsNode.style.display = 'block';
				return;
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
			findParams.layerDefinitions = query.layerDefs;

			findParams.searchText = searchText;
			findParams.contains = !this.containsSearchText.checked;

			findParams.outSpatialReference = {
				wkid: this.spatialReference
			};

			this.findResultsNode.innerHTML = this.i18n.searching;
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
					columns: {
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
				this.resultsGrid.on('.dgrid-row:click', lang.hitch(this, 'zoomOnRowClick'));
				this.resultsGrid.on('.dgrid-row:keyup', lang.hitch(this, 'zoomOnKeyboardNavigation'));
			}
		},

		showResults: function (results) {
			var resultText = '';
			this.resultIdx = 0;
			this.results = results;

			if (this.results.length > 0) {
				//var s = (this.results.length === 1) ? '' : 's';
				var s = (this.results.length === 1) ? '' : this.i18n.resultsLabel.multipleResultsSuffix;
				//resultText = this.results.length + ' Result' + s + ' Found';
				resultText = this.results.length + ' ' + this.i18n.resultsLabel.labelPrefix + s + ' ' + this.i18n.resultsLabel.labelSuffix;
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
						// only add points to the map that have an X/Y
						if (feature.geometry.x && feature.geometry.y) {
							graphic = new Graphic(feature.geometry);
							this.pointResultsGraphics.add(graphic);
						}
						break;
					case 'polyline':
						// only add polylines to the map that have paths
						if (feature.geometry.paths && feature.geometry.paths.length > 0) {
							graphic = new Graphic(feature.geometry);
							this.polylineResultsGraphics.add(graphic);
						}
						break;
					case 'polygon':
						// only add polygons to the map that have rings
						if (feature.geometry.rings && feature.geometry.rings.length > 0) {
							graphic = new Graphic(feature.geometry, null, {
								ren: 1
							});
							this.polygonResultsGraphics.add(graphic);
						}
						break;
					default:
				}
			}, this);

			// zoom to layer extent
			var zoomExtent = null;
			//If the layer is a single point then extents are null
			// if there are no features in the layer then extents are null
			// the result of union() to null extents is null

			if (this.pointResultsGraphics.graphics.length > 0) {
				zoomExtent = this.getPointFeaturesExtent(this.pointResultsGraphics.graphics);
			}
			if (this.polylineResultsGraphics.graphics.length > 0) {
				if (zoomExtent === null) {
					zoomExtent = graphicsUtils.graphicsExtent(this.polylineResultsGraphics.graphics);
				} else {
					zoomExtent = zoomExtent.union(graphicsUtils.graphicsExtent(this.polylineResultsGraphics.graphics));
				}
			}
			if (this.polygonResultsGraphics.graphics.length > 0) {
				if (zoomExtent === null) {
					zoomExtent = graphicsUtils.graphicsExtent(this.polygonResultsGraphics.graphics);
				} else {
					zoomExtent = zoomExtent.union(graphicsUtils.graphicsExtent(this.polygonResultsGraphics.graphics));
				}
			}

			if (zoomExtent) {
				this.zoomToExtent(zoomExtent);
			}
		},

		zoomOnRowClick: function (event) {
			var feature = this.getFeatureFromRowEvent(event);
			this.getFeatureExtentAndZoom(feature);
		},

		zoomOnKeyboardNavigation: function (event){
			var keyCode = event.keyCode;
			if ( keyCode === 38 || keyCode === 40 ) {
				var feature = this.getFeatureFromRowEvent(event);
				this.getFeatureExtentAndZoom(feature);
			}
		},

		getFeatureFromRowEvent: function (event) {
			var row = this.resultsGrid.row(event);
			if (!row){
				return null;
			}

			var data = row.data;
			if (!data) {
				return null;
			}

			this.clearSelectionFeatures();

			var graphic, feature = data.feature;
			switch (feature.geometry.type) {
				case 'point':
					// only add points to the map that have an X/Y
					if (feature.geometry.x && feature.geometry.y) {
						graphic = new Graphic(feature.geometry);
						this.pointSelectionGraphics.add(graphic);
					}
					break;
				case 'polyline':
					// only add polylines to the map that have paths
					if (feature.geometry.paths && feature.geometry.paths.length > 0) {
						graphic = new Graphic(feature.geometry);
						this.polylineSelectionGraphics.add(graphic);
					}
					break;
				case 'polygon':
					// only add polygons to the map that have rings
					if (feature.geometry.rings && feature.geometry.rings.length > 0) {
						graphic = new Graphic(feature.geometry, null, {
							ren: 1
						});
						this.polygonSelectionGraphics.add(graphic);
					}
					break;
				default:
			}


			return data.feature;
		},

		getFeatureExtentAndZoom: function (feature){
			if (!feature){
				return;
			}

			var extent = feature.geometry.getExtent();
			if (!extent && feature.geometry.type === 'point') {
				extent = this.getExtentFromPoint(feature);
			}

			if (extent) {
				this.zoomToExtent(extent);
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
			this.pointResultsGraphics.clear();
			this.polylineResultsGraphics.clear();
			this.polygonResultsGraphics.clear();
			this.clearSelectionFeatures();
		},

		clearSelectionFeatures: function () {
			this.pointSelectionGraphics.clear();
			this.polylineSelectionGraphics.clear();
			this.polygonSelectionGraphics.clear();
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
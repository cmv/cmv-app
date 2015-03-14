define([
	'dojo/_base/declare',
	'esri/map',
	'dojo/on',
	'dojo/_base/array',
	'dojo/Deferred',
	'dojo/_base/lang',
	'dojo/aspect'
], function (declare, Map, on, array, Deferred, lang) {

	return declare([], {

		_config: null,
		_loadMapDeferred: null,

		layers: [],
		legendLayerInfos: [],
		editorLayerInfos: [],
		identifyLayerInfos: [],
		layerControlLayerInfos: [],
		map: null,

		constructor: function() {
		},
		
		LoadMapAsync: function(domId, config) {

			this._config = config;

			this._loadMapDeferred = new Deferred();

			this.map = new Map(domId, this._config.mapOptions);
			if (this._config.mapOptions.basemap) {
				this.map.on('load', lang.hitch(this, '_initLayers'));
			} else {
				this._initLayers();
			}

			if (this._config.operationalLayers && this._config.operationalLayers.length > 0) {
				on.once(this.map, 'layers-add-result', lang.hitch(this, function(lyrsResult) { 
					var loadingError = null;
					var isLoadingError = array.some(lyrsResult.layers, function (addedLayer) {
						if (addedLayer.success !== true) {
							loadingError = addedLayer.error;
							return true;
						}
					});
					if (isLoadingError === true) {
						this._loadMapDeferred.reject(loadingError);
					}
					else {
						this._loadMapDeferred.resolve();
					}
				}));
			} else {
				this._loadMapDeferred.resolve();
			}
			return this._loadMapDeferred;
		},

		_initLayers: function () {
			this.layers = [];
			var layerTypes = {
				csv: 'CSV',
				dynamic: 'ArcGISDynamicMapService',
				feature: 'Feature',
				georss: 'GeoRSS',
				image: 'ArcGISImageService',
				kml: 'KML',
				label: 'Label', //untested
				mapimage: 'MapImage', //untested
				osm: 'OpenStreetMap',
				tiled: 'ArcGISTiledMapService',
				wms: 'WMS',
				wmts: 'WMTS' //untested
			};
			// loading all the required modules first ensures the layer order is maintained
			var modules = [];
			array.forEach(this._config.operationalLayers, function (layer) {
				var type = layerTypes[layer.type];
				if (type) {
					modules.push('esri/layers/' + type + 'Layer');
				} else {
					this.loadMapDeferred.reject('Layer type "' + layer.type + '"" isnot supported: ');
				}
			}, this);
			require(modules, lang.hitch(this, function () {
				array.forEach(this._operationalLayers, function (layer) {
					var type = layerTypes[layer.type];
					if (type) {
						require(['esri/layers/' + type + 'Layer'], lang.hitch(this, 'initLayer', layer));
					}
				}, this);
				this.map.addLayers(this.layers);
			}));
		},
		initLayer: function (layer, Layer) {
			var l = new Layer(layer.url, layer.options);
			this.layers.unshift(l); //unshift instead of push to keep layer ordering on map intact
			//Legend LayerInfos array
			this.legendLayerInfos.unshift({ //unshift instead of push to keep layer ordering in legend intact
				layer: l,
				title: layer.title || null
			});
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
				this.editorLayerInfos.push(options);
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
		}
	});
});

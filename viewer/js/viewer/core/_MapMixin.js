define([
	'dojo/on',
	'dojo/_base/declare',
	'esri/map',
	'dojo/_base/array',
	'dojo/Deferred',
	'dojo/_base/lang',
	'dojo/aspect'
], function (on, declare, Map, array, Deferred, lang) {

	return declare(null, {
	 
	 	constructor: function() {
			
	 	},

		initMapAsync: function () {
			var returnDeferred = new Deferred();
			var returnWarnings = [];
			this.map = new Map('mapCenter', this.config.mapOptions);
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
		
		_onLayersAddResult: function(returnDeferred, returnWarnings, lyrsResult) {
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
			array.forEach(this.config.operationalLayers, function (layer) {
				var type = layerTypes[layer.type];
				if (type) {
					modules.push('esri/layers/' + type + 'Layer');
				} else {
					returnWarnings.push('Layer type "' + layer.type + '"" isnot supported: ');
				}
			}, this);
			require(modules, lang.hitch(this, function () {
				array.forEach(this.config.operationalLayers, function (layer) {
					var type = layerTypes[layer.type];
					if (type) {
						require(['esri/layers/' + type + 'Layer'], lang.hitch(this, '_initLayer', layer));
					}
				}, this);
				this.map.addLayers(this.layers);
			}));
		},
		
		_initLayer: function (layer, Layer) {
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
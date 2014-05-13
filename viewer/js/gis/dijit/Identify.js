define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/_base/lang',
    'dojo/_base/array',
    'esri/lang',
    'esri/tasks/IdentifyTask',
    'esri/tasks/IdentifyParameters',
    'esri/dijit/PopupTemplate',
    'dojo/on',
    'dojo/promise/all',
    './Identify/config'
], function(declare, _WidgetBase, lang, array, esriLang, IdentifyTask, IdentifyParameters, PopupTemplate, on, all, config) {

    var Identify = declare([_WidgetBase], {
        declaredClass: 'gis.dijit.Identify',
        postCreate: function() {
            this.inherited(arguments);
            this.layers = [];
            array.forEach(this.controller.layers, function(lyr) {
                var lyrId = lyr.id;
                var layer = this.map.getLayer(lyrId);
                if ((layer.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') || (layer.declaredClass === 'esri.layers.FeatureLayer')) {
                    var url = layer.url;

                    // If a Feature Layer from a Map Service
                    // we get the base url for the map service by removing the layer ID.
                    // Feature Layers from Feature Services are ignored
                    if (layer.declaredClass === 'esri.layers.FeatureLayer') {
                        // Skip if layer is from a Feature Service
                        if (layer.capabilities.toLowerCase().indexOf('data') < 0) {
                            return;
                        }
                        layerId = layer.layerId;
                        var lastSL = url.lastIndexOf('/' + layerId);
                        if (lastSL > 0) {
                            url = url.substring(0, lastSL);
                        }
                    }

                    this.layers.push({
                        ref: layer,
                        identifyTask: new IdentifyTask(url)
                    });
                }
            }, this);
            this.map.on('click', lang.hitch(this, function(evt) {
                if (this.mapClickMode.current === 'identify') {
                    this.executeIdentifyTask(evt);
                }
            }));
        },
        executeIdentifyTask: function(evt) {
            this.map.infoWindow.hide();
            this.map.infoWindow.clearFeatures();
            this.map.infoWindow.setTitle('Identifing...');
            this.map.infoWindow.setContent('<img src="images/loading.gif" style="height:20px;width:20px;margin-top:5px"></img>');
            this.map.infoWindow.show(evt.mapPoint);

            var identifyParams = new IdentifyParameters();
            identifyParams.tolerance = this.identifyTolerance;
            identifyParams.returnGeometry = true;
            identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
            identifyParams.geometry = evt.mapPoint;
            identifyParams.mapExtent = this.map.extent;
            identifyParams.width = this.map.width;
            identifyParams.height = this.map.height;

            var identifies = [];
            var identifiedlayers = [];
            array.forEach(this.layers, function(layer) {
                if (layer.ref.visible && (!isNaN(layer.ref.layerId) || (layer.ref.visibleLayers && layer.ref.visibleLayers.length !== 0 && layer.ref.visibleLayers[0] !== -1))) {
                    var params = lang.clone(identifyParams);
                    if (!isNaN(layer.ref.layerId)) {
                        params.layerIds = [layer.ref.layerId];
                    } else {
                        params.layerIds = layer.ref.visibleLayers;
                    }
                    if (params.layerIds && params.layerIds.length > 0) {
                        identifies.push(layer.identifyTask.execute(params));
                        identifiedlayers.push(layer);
                    }
                }
            });

            all(identifies).then(lang.hitch(this, 'identifyCallback', identifiedlayers), function(err) {
                console.log('identify tasks error: ', err);
            });
        },
        identifyCallback: function(identifiedlayers, responseArray) {
            var fSet = [];
            array.forEach(responseArray, function(response, i) {
                var layerId = identifiedlayers[i].ref.id;
                array.forEach(response, function(result) {
                    // see if we have a Popup config defined for this layer
                    if (config.hasOwnProperty(layerId)) {
                        if (config[layerId].hasOwnProperty(result.layerId)) {
                            result.feature.setInfoTemplate(new PopupTemplate(config[layerId][result.layerId]));
                        }
                    }
                    // if no Popup defined output all attributes
                    if (result.feature.infoTemplate === undefined) {
                        result.feature.setInfoTemplate(new PopupTemplate({
                            title: result.layerName,
                            description: esriLang.substitute(result.feature.attributes)
                        }));
                    }
                    fSet.push(result.feature);
                }, this);
            }, this);
            this.map.infoWindow.setFeatures(fSet);
        }
    });

    return Identify;
});
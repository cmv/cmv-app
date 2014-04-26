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
            array.forEach(this.map.layerIds, function(layerId) {
                var layer = this.map.getLayer(layerId);
                if (layer.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') {
                    this.layers.push({
                        ref: layer,
                        identifyTask: new IdentifyTask(layer.url)
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
                if (layer.ref.visible && layer.ref.visibleLayers.length !== 0 && layer.ref.visibleLayers[0] !== -1) {
                    var params = lang.clone(identifyParams);
                    params.layerIds = layer.ref.visibleLayers;
                    identifies.push(layer.identifyTask.execute(params));
                    identifiedlayers.push(layer);
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
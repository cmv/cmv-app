define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Form',
    'dijit/form/FilteringSelect',
    'dijit/MenuItem',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/store/Memory',
    'esri/lang',
    'esri/tasks/IdentifyTask',
    'esri/tasks/IdentifyParameters',
    'esri/dijit/PopupTemplate',
    'dojo/on',
    'dojo/promise/all',
    'dojo/text!./Identify/templates/Identify.html',
    'xstyle/css!./Identify/css/Identify.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Form, FilteringSelect, MenuItem, lang, array, Memory, esriLang, IdentifyTask, IdentifyParameters, PopupTemplate, on, all, IdentifyTemplate, css) {
    var Identify = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: IdentifyTemplate,
        baseClass: 'gis_IdentifyDijit',
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

                    // rebuild the layer selection list when any layer is hidden
                    // but only if we have a UI
                    if (this.parentWidget) {
                        layer.on('visibility-change', lang.hitch(this, function(evt) {
                            if (evt.visible === false) {
                                this.createIdentifyLayerList();
                            }
                        }));
                    }
                }
            }, this);
            this.map.on('click', lang.hitch(this, function(evt) {
                if (this.mapClickMode.current === 'identify' && !evt.graphic) {
                    this.handleMapClick(evt);
                }
            }));
            if (this.mapRightClickMenu) {
                this.map.on('MouseDown', lang.hitch(this, function(evt) {
                    this.mapRightClickPoint = evt.mapPoint;
                }));
                this.mapRightClickMenu.addChild(new MenuItem({
                    label: 'Identify here',
                    onClick: lang.hitch(this, 'handleRightClick')
                }));
            }

            // rebuild the layer selection list when the map is updated
            // but only if we have a UI
            if (this.parentWidget) {
                this.createIdentifyLayerList();
                this.map.on('update-end', lang.hitch(this, function(evt) {
                    this.createIdentifyLayerList();
                }));
            }
        },
        executeIdentifyTask: function(mapPoint) {
            this.map.infoWindow.hide();
            this.map.infoWindow.clearFeatures();
            this.map.infoWindow.setTitle('Identifying...');
            this.map.infoWindow.setContent('<div class="loading"></div>');
            this.map.infoWindow.show(mapPoint);

            var identifyParams = new IdentifyParameters();
            identifyParams.tolerance = this.identifyTolerance;
            identifyParams.returnGeometry = true;
            identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
            identifyParams.geometry = mapPoint;
            identifyParams.mapExtent = this.map.extent;
            identifyParams.width = this.map.width;
            identifyParams.height = this.map.height;
            identifyParams.spatialReference = this.map.spatialReference;

            var identifies = [];
            var identifiedlayers = [];
            var selectedLayer = '***'; // default is all layers

            // if we have a UI, then get the selected layer
            if (this.parentWidget) {
                var form = this.identifyFormDijit.get('value');
                if (!form.identifyLayer || form.identifyLayer === '') {
                    return;
                }
                selectedLayer = form.identifyLayer;
            }

            // all layers
            if (selectedLayer === '***') {
                array.forEach(this.layers, function(layer) {
                    if (layer.ref.visible && layer.ref.visibleLayers.length !== 0 && layer.ref.visibleLayers[0] !== -1) {
                        var params = lang.clone(identifyParams);
                        var nonGroupLayers = array.filter(layer.ref.layerInfos, function (x) {
                            return x.subLayerIds === null;
                        });
                        params.layerIds = [];
                        array.forEach(nonGroupLayers, function(subLayer) {
                            if (array.indexOf(layer.ref.visibleLayers, subLayer.id) !== -1) {
                                params.layerIds.push(subLayer.id);
                            }
                        });
                        identifies.push(layer.identifyTask.execute(params));
                        identifiedlayers.push(layer);
                    }
                });
            // only selected layer
            } else {
                var arrIds = form.identifyLayer.split('||');
                array.forEach(this.layers, function(layer) {
                    if (layer.ref.id === arrIds[0]) {
                        array.forEach(layer.ref.layerInfos, function(layerInfo) {
                            if (layerInfo.id.toString() === arrIds[1]) {
                                var params = lang.clone(identifyParams);
                                params.layerIds = [layerInfo.id];
                                identifies.push(layer.identifyTask.execute(params));
                                identifiedlayers.push(layer);
                            }
                        });
                    }
                });
            }

            all(identifies).then(lang.hitch(this, 'identifyCallback', identifiedlayers), lang.hitch(this, 'identifyError'));
        },
        identifyCallback: function(identifiedlayers, responseArray) {
            var fSet = [];
            array.forEach(responseArray, function(response, i) {
                var layerId = identifiedlayers[i].ref.id;
                array.forEach(response, function(result) {
                    result.feature.geometry.spatialReference = this.map.spatialReference; //temp workaround for ags identify bug. remove when fixed.
                    // see if we have a Popup config defined for this layer
                    if (this.identifies.hasOwnProperty(layerId)) {
                        if (this.identifies[layerId].hasOwnProperty(result.layerId)) {
                            result.feature.setInfoTemplate(new PopupTemplate(this.identifies[layerId][result.layerId]));
                        }
                    }
                    // if no Popup defined output all attributes
                    if (result.feature.infoTemplate === undefined) {
                        var fieldInfos = [];
                        for (var prop in result.feature.attributes) {
                            if (result.feature.attributes.hasOwnProperty(prop)) {
                                fieldInfos.push({
                                    fieldName: prop,
                                    visible: true
                                });
                            }
                        }
                        result.feature.setInfoTemplate(new PopupTemplate({
                            title: result.layerName,
                            fieldInfos: fieldInfos
                        }));
                    }
                    fSet.push(result.feature);
                }, this);
            }, this);
            this.map.infoWindow.setFeatures(fSet);
        },
        identifyError: function(err) {
            this.map.infoWindow.hide();
            console.log('identify tasks error: ', err);
        },
        handleMapClick: function(evt) {
            if (evt && evt.mapPoint) {
                this.executeIdentifyTask(evt.mapPoint);
            }
        },
        handleRightClick: function() {
            if (this.mapRightClickPoint) {
                this.executeIdentifyTask(this.mapRightClickPoint);
            }
        },
        createIdentifyLayerList: function() {
            var id = null;
            var identifyItems = [];
            var selectedId = this.identifyLayerDijit.get('value');

            array.forEach(this.layers, lang.hitch(this, function(layer) {
                // only include layers that are currently visible
                if (layer.ref.visible !== false) {
                    array.forEach(layer.ref.layerInfos, lang.hitch(this, function (layerInfo) {
                        var ref = layer.ref;
                        // only include sublayers that are currently visible
                        if (array.indexOf(ref.visibleLayers, layerInfo.id) !== -1 && this.layerVisibleAtCurrentScale(layerInfo)) {
                            identifyItems.push({
                                name: ref._titleForLegend + ' \\ ' + layerInfo.name,
                                id: ref.id + '||' + layerInfo.id
                            });
                            // previously selected sublayer is still visible so keep it selected
                            if (ref.id + '||' + layerInfo.id === selectedId) {
                                id = selectedId;
                            }
                        }
                    }));
                }
            }));

            identifyItems.sort(function (a, b) {
                return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
            });

            this.identifyLayerDijit.set('disabled', (identifyItems.length < 1));
            if (identifyItems.length > 0) {
                identifyItems.unshift({name: '*** All Visible Layers ***', id: '***'});
                if (!id) {
                    id = identifyItems[0].id;
                }
            }
            var identify = new Memory({
                data: identifyItems
            });
            this.identifyLayerDijit.set('store', identify);
            this.identifyLayerDijit.set('value', id);
        },
        layerVisibleAtCurrentScale: function(layer) {
            var mapScale = this.map.getScale();
            return !(((layer.maxScale !== 0 && mapScale < layer.maxScale) || (layer.minScale !== 0 && mapScale > layer.minScale)));
        }
    });

    return Identify;
});

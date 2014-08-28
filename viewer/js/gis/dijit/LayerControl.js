/* layer control */
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dijit/_WidgetBase',
    'dijit/_Container',
    'esri/tasks/ProjectParameters',
    'esri/config',
    //the css
    'xstyle/css!./LayerControl/css/LayerControl.css'
], function(
    declare,
    array,
    lang,
    domConst,
    WidgetBase,
    Container,
    ProjectParameters,
    esriConfig
) {
    'use strict';
    return declare([WidgetBase, Container], {
        _vectorContainer: null, //vector layer control container
        _overlayContainer: null, //overlay layer control container
        _controls: {
            dynamic: 'gis/dijit/LayerControl/controls/Dynamic',
            feature: 'gis/dijit/LayerControl/controls/Feature'
                //image: 'gis/dijit/LayerController/controls/Image',
                //tiled: 'gis/dijit/LayerController/controls/Tiled',
                //webTiled: 'gis/dijit/LayerController/controls/WebTiled'
        },
        constructor: function(options) {
            options = options || {};
            if (!options.map) {
                console.log('LayerControl error::map option is required');
                return;
            }
            declare.safeMixin(this, {
                map: null,
                layerInfos: [],
                overlayReorder: false,
                vectorReorder: false,
                basemapCount: 0,
                fontAwesome: true
            }, options);
        },
        postCreate: function() {
            var ControlContainer = declare([WidgetBase, Container]);
            //vector layer control container
            this._vectorContainer = new ControlContainer({
                className: 'overlayLayerContainer'
            }, domConst.create('div'));
            this.addChild(this._vectorContainer, 'first');
            //overlay layer control container
            this._overlayContainer = new ControlContainer({
                className: 'vectorLayerContainer'
            }, domConst.create('div'));
            this.addChild(this._overlayContainer, 'last');
            //load only the modules we need
            var modules = [];
            //load font awesome
            if (this.fontAwesome) {
                modules.push('xstyle/css!//maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css');
            }
            //push used controls
            array.forEach(this.layerInfos, function(layerInfo) {
                var mod = this._controls[layerInfo.type];
                if (mod) {
                    modules.push(mod);
                } else {
                    console.log('LayerControl error::the layer type "' + layerInfo.type + '" is not valid');
                }
            }, this);
            //load and go
            require(modules, lang.hitch(this, function() {
                array.forEach(this.layerInfos, function(layerInfo) {
                    var control = this._controls[layerInfo.type];
                    if (control) {
                        require([control], lang.hitch(this, '_addControl', layerInfo));
                    }
                }, this);
            }));
        },
        //create layer control and add to appropriate _container
        _addControl: function(layerInfo, LayerControl) {
            var layerControl = new LayerControl({
                controller: this,
                layer: layerInfo.layer,
                layerTitle: layerInfo.title,
                controlOptions: layerInfo.controlOptions
            });
            layerControl.startup();
            if (layerControl._layerType === 'overlay') {
                this._overlayContainer.addChild(layerControl, 'first');
            } else {
                this._vectorContainer.addChild(layerControl, 'first');
            }
        },
        //move control up in controller and layer up in map
        _moveUp: function(control) {
            var id = control.layer.id,
                node = control.domNode,
                index;
            if (control._layerType === 'overlay') {
                var count = this.map.layerIds.length;
                index = array.indexOf(this.map.layerIds, id);
                if (index < count - 1) {
                    this.map.reorderLayer(id, index + 1);
                    this._overlayContainer.containerNode.insertBefore(node, node.previousSibling);
                }
            } else if (control._layerType === 'vector') {
                if (control.getPreviousSibling()) {
                    index = array.indexOf(this.map.graphicsLayerIds, id);
                    this.map.reorderLayer(id, index + 1);
                    this._vectorContainer.containerNode.insertBefore(node, node.previousSibling);
                }
            }
        },
        //move control down in controller and layer down in map
        _moveDown: function(control) {
            var id = control.layer.id,
                node = control.domNode,
                index;
            if (control._layerType === 'overlay') {
                index = array.indexOf(this.map.layerIds, id);
                if (index > this.basemapCount) {
                    this.map.reorderLayer(id, index - 1);
                    if (node.nextSibling !== null) {
                        this._overlayContainer.containerNode.insertBefore(node, node.nextSibling.nextSibling);
                    }
                }
            } else if (control._layerType === 'vector') {
                if (control.getNextSibling()) {
                    index = array.indexOf(this.map.graphicsLayerIds, id);
                    this.map.reorderLayer(id, index - 1);
                    this._vectorContainer.containerNode.insertBefore(node, node.nextSibling.nextSibling);
                }
            }
        },
        //zoom to layer
        _zoomToLayer: function(layer) {
            var map = this.map;
            if (layer.spatialReference === map.spatialReference) {
                map.setExtent(layer.fullExtent, true);
            } else {
                if (esriConfig.defaults.geometryService) {
                    esriConfig.defaults.geometryService.project(lang.mixin(new ProjectParameters(), {
                        geometries: [layer.fullExtent],
                        outSR: map.spatialReference
                    }), function(r) {
                        map.setExtent(r[0], true);
                    }, function(e) {
                        console.log(e);
                    });
                } else {
                    console.log('LayerControl _zoomToLayer::esriConfig.defaults.geometryService is not set');
                }
            }
        }
    });
});

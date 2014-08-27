/* ags dynamic control */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dojo/html',
    'dijit/registry',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/MenuSeparator',
    'esri/request',
    'gis/dijit/LayerControl/plugins/Transparency',
    'gis/dijit/LayerControl/plugins/Scales',
    'gis/dijit/LayerControl/controls/DynamicSublayer',
    'gis/dijit/LayerControl/controls/DynamicFolder',
    'dojo/text!./templates/Control.html'
], function (
    declare,
    lang,
    array,
    on,
    query,
    domClass,
    domStyle,
    domConst,
    domAttr,
    html,
    registry,
    WidgetBase,
    TemplatedMixin,
    Contained,
    Menu,
    MenuItem,
    MenuSeparator,
    esriRequest,
    Transparency,
    Scales,
    DynamicSublayer,
    DynamicFolder,
    controlTemplate
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, Contained], {
        templateString: controlTemplate,
        layerTitle: 'Layer Title',
        _layerType: 'overlay', //for reoredering
        _scaleRangeHandler: null,
        constructor: function(options) {
            options = options || {};
            declare.safeMixin(this, options);
        },
        postCreate: function() {
            if (!this.controller) {
                console.log('Dynamic error::controller option is required');
                this.destroy();
                return;
            }
            if (!this.layer) {
                console.log('Dynamic error::layer option is required');
                this.destroy();
                return;
            }
            if (this.layer.loaded) {
                this._initialize();
            } else {
                this.layer.on('load', lang.hitch(this, '_initialize'));
            }
        },
        //add layer and init control
        _initialize: function() {
            var layer = this.layer;
            //template defaults as unchecked if visible checked
            if (layer.visible) {
                domClass.remove(this.checkNode, 'fa-square-o');
                domClass.add(this.checkNode, 'fa fa-check-square-o');
            }
            //toggle layer
            on(this.checkNode, 'click', lang.hitch(this, function () {
                if (layer.visible) {
                    layer.hide();
                    domClass.remove(this.checkNode, 'fa-check-square-o');
                    domClass.add(this.checkNode, 'fa-square-o');
                } else {
                    layer.show();
                    domClass.remove(this.checkNode, 'fa-square-o');
                    domClass.add(this.checkNode, 'fa-check-square-o');
                }
                if (layer.minScale !== 0 || layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                }
            }));
            //set title
            html.set(this.labelNode, this.layerTitle);
            //wire up updating indicator
            layer.on('update-start', lang.hitch(this, function() {
                domStyle.set(this.layerUpdateNode, 'display', 'inline-block'); //font awesome display
            }));
            layer.on('update-end', lang.hitch(this, function() {
                domStyle.set(this.layerUpdateNode, 'display', 'none');
            }));
            //build sublayers
            if (this.controlOptions.sublayers) {
                this._sublayers();
                this._expandClick();
            } else {
                domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
                domStyle.set(this.expandIconNode, 'cursor', 'default');
                domConst.destroy(this.expandNode);
            }
            //layer menu
            this._menu();
            //if layer has scales set
            if (layer.minScale !== 0 || layer.maxScale !== 0) {
                this._checkboxScaleRange();
                this._scaleRangeHandler = layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
            //if layer scales change
            this.layer.on('scale-range-change', lang.hitch(this, function() {
                if (layer.minScale !== 0 || layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    this._scaleRangeHandler = layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
                } else {
                    this._checkboxScaleRange();
                    if (this._scaleRangeHandler) {
                        this._scaleRangeHandler.remove();
                        this._scaleRangeHandler = null;
                    }
                }
            }));
        },
        //add on event to expandClickNode
        _expandClick: function () {
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
                var expandNode = this.expandNode,
                    iconNode = this.expandIconNode;
                if (domStyle.get(expandNode, 'display') === 'none') {
                    domStyle.set(expandNode, 'display', 'block');
                    domClass.replace(iconNode, 'fa-minus-square-o', 'fa-plus-square-o');
                } else {
                    domStyle.set(expandNode, 'display', 'none');
                    domClass.replace(iconNode, 'fa-plus-square-o', 'fa-minus-square-o');
                }
            }));
        },
        //add folder/sublayer controls per layer.layerInfos
        _sublayers: function() {
            //check for single sublayer - if so no sublayer/folder controls
            if (this.layer.layerInfos.length > 1) {
                array.forEach(this.layer.layerInfos, lang.hitch(this, function(info) {
                    var pid = info.parentLayerId,
                        slids = info.subLayerIds,
                        controlId = this.layer.id + '-' + info.id + '-sublayer-control',
                        control;
                    if (pid === -1 && slids === null) {
                        //it's a top level sublayer
                        control = new DynamicSublayer({
                            id: controlId,
                            control: this,
                            sublayerInfo: info
                        });
                        control.startup();
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid === -1 && slids !== null) {
                        //it's a top level folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            folderInfo: info
                        });
                        control.startup();
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid !== -1 && slids !== null) {
                        //it's a nested folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            folderInfo: info
                        });
                        control.startup();
                        domConst.place(control.domNode, registry.byId(this.layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                    } else if (pid !== -1 && slids === null) {
                        //it's a nested sublayer
                        control = new DynamicSublayer({
                            id: controlId,
                            control: this,
                            sublayerInfo: info
                        });
                        control.startup();
                        domConst.place(control.domNode, registry.byId(this.layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                    }
                }));
            }
            //check ags version and create legends
            if (this.layer.version >= 10.01) {
                this._legend(this.layer);
            }
        },
        //create the layer control menu
        _menu: function() {
            var menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            //reorder menu items
            if (this.controller.overlayReorder) {
                menu.addChild(new MenuItem({
                    label: 'Move Up',
                    onClick: lang.hitch(this, function() {
                        this.controller._moveUp(this);
                    })
                }));
                menu.addChild(new MenuItem({
                    label: 'Move Down',
                    onClick: lang.hitch(this, function() {
                        this.controller._moveDown(this);
                    })
                }));
                menu.addChild(new MenuSeparator());
            }
            //zoom to layer extent
            menu.addChild(new MenuItem({
                label: 'Zoom to Layer',
                onClick: lang.hitch(this, function() {
                    this.controller._zoomToLayer(this.layer);
                })
            }));
            //add plugins
            if (this.controlOptions.transparency) {
                menu.addChild(new Transparency({
                    label: 'Transparency',
                    layer: this.layer
                }));
            }
            if (this.controlOptions.scales) {
                menu.addChild(new Scales({
                    label: 'Scales',
                    layer: this.layer
                }));
            }
            menu.startup();
        },
        //get legend json and build
        _legend: function(layer) {
            esriRequest({
                url: layer.url + '/legend',
                callbackParamName: 'callback',
                content: {
                    f: 'json',
                    token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                }
            }).then(lang.hitch(this, function(r) {
                array.forEach(r.layers, function(_layer) {
                    var legendContent;
                        legendContent = '<table class="layerControlLegendTable">';
                        array.forEach(_layer.legend, function(legend) {
                            var label = legend.label || '&nbsp;';
                            legendContent += '<tr><td class="layerControlLegendImage"><img class="' + layer.id + '-layerLegendImage" style="opacity:' + layer.opacity + ';width:' + legend.width + ';height:' + legend.height + ';" src="data:' + legend.contentType + ';base64,' + legend.imageData + '" alt="' + label + '" /></td><td class="layerControlLegendLabel">' + label + '</td></tr>';
                        }, this);
                        legendContent += '</table>';
                        //check for single layer
                        //if so use expandNode for legend
                        if (layer.layerInfos.length > 1) {
                            html.set(registry.byId(layer.id + '-' + _layer.layerId + '-sublayer-control').expandNode, legendContent);
                        } else {
                            html.set(this.expandNode, legendContent);
                        }
                }, this);
            }), lang.hitch(this, function(e) {
                console.log(e);
                console.log('Dynamic::an error occurred retrieving legend');
                if (this.layer.layerInfos.length === 1) {
                    html.set(this.expandNode, 'No Legend');
                }
            }));  
        },
        //set dynamic layer visible layers
        _setVisibleLayers: function() {
            //because ags doesn't respect a layer group's visibility
            //i.e. layer 3 (the group) is off but it's sublayers still show
            //so check and if group is off also remove the sublayers
            var layer = this.layer,
                setLayers = [];
            array.forEach(query('.' + layer.id + '-layerControlSublayerCheck'), function(i) {
                if (domAttr.get(i, 'data-checked') === 'checked') {
                    setLayers.push(parseInt(domAttr.get(i, 'data-sublayer-id'), 10));
                }
            }, this);
            array.forEach(layer.layerInfos, function(info) {
                if (info.subLayerIds !== null && array.indexOf(setLayers, info.id) === -1) {
                    array.forEach(info.subLayerIds, function(sub) {
                        if (array.indexOf(setLayers, sub) !== -1) {
                            setLayers.splice(array.indexOf(setLayers, sub), 1);
                        }
                    });
                } else if (info.subLayerIds !== null && array.indexOf(setLayers, info.id) !== -1) {
                    setLayers.splice(array.indexOf(setLayers, info.id), 1);
                }
            }, this);
            if (setLayers.length) {
                layer.setVisibleLayers(setLayers);
                layer.refresh();
            } else {
                layer.setVisibleLayers([-1]);
                layer.refresh();
            }
        },
        //check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function() {
            var node = this.checkNode,
                layer = this.layer,
                scale = layer.getMap().getScale(),
                min = layer.minScale,
                max = layer.maxScale;
            domClass.remove(node, 'layerControlCheckIconOutScale');
            if ((min !== 0 && scale > min) || (max !== 0 && scale < max)) {
                domClass.add(node, 'layerControlCheckIconOutScale');
            }
        }
    });
});

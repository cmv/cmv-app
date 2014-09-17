define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
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
    'dijit/PopupMenuItem',
    'dijit/MenuSeparator',
    'esri/request',
    'gis/dijit/LayerControl/controls/DynamicSublayer',
    'gis/dijit/LayerControl/controls/DynamicFolder',
    'dojo/text!./templates/Control.html',
    'gis/dijit/LayerControl/plugins/Transparency'
], function (
    declare,
    lang,
    array,
    topic,
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
    PopupMenuItem,
    MenuSeparator,
    esriRequest,
    DynamicSublayer,
    DynamicFolder,
    controlTemplate,
    Transparency
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, Contained], {
        templateString: controlTemplate,
        layerTitle: 'Layer Title',
        _layerType: 'overlay', //for reoredering
        _scaleRangeHandler: null,
        _expandClickHandler: null,
        _sublayerControls: [], //array of sublayer controls
        layerMenu: null,
        _reorderUp: null, //reorder move up menu item
        _reorderDown: null, //reorder move down menu item
        constructor: function(options) {
            options = options || {};
            declare.safeMixin(this, options);
        },
        postCreate: function() {
            if (!this.controller) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/Dynamic',
                    error: 'controller option is required'
                });
                this.destroy();
                return;
            }
            if (!this.layer) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/Dynamic',
                    error: 'layer option is required'
                });
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
                    topic.publish('layerControl/layerToggle', {
                        id: layer.id,
                        visible: layer.visible
                    });
                } else {
                    layer.show();
                    domClass.remove(this.checkNode, 'fa-square-o');
                    domClass.add(this.checkNode, 'fa-check-square-o');
                    topic.publish('layerControl/layerToggle', {
                        id: layer.id,
                        visible: layer.visible
                    });
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
                this._expandClick();
                this._createSublayers(layer);
            } else {
                domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
                domStyle.set(this.expandClickNode, 'cursor', 'default');
                domConst.destroy(this.expandNode);
            }
            //show expandNode
            if (this.controlOptions.expanded && this.controlOptions.sublayers) {
                this.expandClickNode.click();
            }
            //layer menu
            this._createMenu(layer);
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
            this._expandClickHandler = on(this.expandClickNode, 'click', lang.hitch(this, function() {
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
        _createSublayers: function(layer) {
            //check for single sublayer - if so no sublayer/folder controls
            if (layer.layerInfos.length > 1) {
                array.forEach(layer.layerInfos, lang.hitch(this, function(info) {
                    var pid = info.parentLayerId,
                        slids = info.subLayerIds,
                        controlId = layer.id + '-' + info.id + '-sublayer-control',
                        control;
                    if (pid === -1 && slids === null) {
                        //it's a top level sublayer
                        control = new DynamicSublayer({
                            id: controlId,
                            control: this,
                            sublayerInfo: info
                        });
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid === -1 && slids !== null) {
                        //it's a top level folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            folderInfo: info
                        });
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid !== -1 && slids !== null) {
                        //it's a nested folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            folderInfo: info
                        });
                        domConst.place(control.domNode, registry.byId(layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                    } else if (pid !== -1 && slids === null) {
                        //it's a nested sublayer
                        control = new DynamicSublayer({
                            id: controlId,
                            control: this,
                            sublayerInfo: info
                        });
                        domConst.place(control.domNode, registry.byId(layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                    }
                    control.startup();
                    this._sublayerControls.push(control);
                }));
            }
            //create legend
            this._createLegend(layer);
        },
        //create the layer control menu
        _createMenu: function(layer) {
            this.layerMenu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            var menu = this.layerMenu,
                controlOptions = this.controlOptions;
            //reorder menu items
            if (this.controller.overlayReorder) {
                this._reorderUp = new MenuItem({
                    label: 'Move Up',
                    onClick: lang.hitch(this, function() {
                        this.controller._moveUp(this);
                    })
                });
                menu.addChild(this._reorderUp);
                this._reorderDown = new MenuItem({
                    label: 'Move Down',
                    onClick: lang.hitch(this, function() {
                        this.controller._moveDown(this);
                    })
                });
                menu.addChild(this._reorderDown);
                menu.addChild(new MenuSeparator());
            }
            //zoom to layer
            if (controlOptions.noZoom !== true) {
                menu.addChild(new MenuItem({
                    label: 'Zoom to Layer',
                    onClick: lang.hitch(this, function() {
                        this.controller._zoomToLayer(layer);
                    })
                }));
            }
            //transparency
            if (controlOptions.noTransparency !== true) {
                menu.addChild(new Transparency({
                    label: 'Transparency',
                    layer: layer
                }));
            }
            //layer swipe
            if (controlOptions.noSwipe !== true) {
                var swipeMenu = new Menu();
                swipeMenu.addChild(new MenuItem({
                    label: 'Vertical',
                    onClick: lang.hitch(this, function () {
                        this.controller._swipeLayer(layer, 'vertical');
                    })
                }));
                swipeMenu.addChild(new MenuItem({
                    label: 'Horizontal',
                    onClick: lang.hitch(this, function () {
                        this.controller._swipeLayer(layer, 'horizontal');
                    })
                }));
                menu.addChild(new PopupMenuItem({
                    label: 'Layer Swipe',
                    popup: swipeMenu
                }));
            }
            menu.startup();
            //if last child is a separator remove it
            var lastChild = menu.getChildren()[menu.getChildren().length - 1];
            if (lastChild.isInstanceOf(MenuSeparator)) {
                menu.removeChild(lastChild);
            }
        },
        //create legend
        _createLegend: function(layer) {
            if (this.controlOptions.noLegend === true) {
                this._noLegend();
                return;
            }
            //check ags version and create legends
            if (layer.version >= 10.01) {
                esriRequest({
                    url: layer.url + '/legend',
                    callbackParamName: 'callback',
                    content: {
                        f: 'json',
                        token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                    }
                }).then(lang.hitch(this, function(r) {
                    array.forEach(r.layers, function(_layer) {
                        //create legend table
                        var table = domConst.create('table');
                        domClass.add(table, 'layerControlLegendTable');
                        //iterate through legends
                        array.forEach(_layer.legend, function(legend) {
                            //create a table row and symbol & label table data
                            //  add label too
                            var row = domConst.create('tr', {}, table, 'last'),
                                symbol = domConst.create('td', {}, row, 'first'),
                                label = domConst.create('td', {
                                    innerHTML: legend.label || '&nbsp;'
                                }, row, 'last');
                            domClass.add(symbol, 'layerControlLegendImage');
                            domClass.add(label, 'layerControlLegendLabel');
                            //create image
                            var img = domConst.create('img', {
                                src: 'data:' + legend.contentType + ';base64,' + legend.imageData
                            }, symbol);
                            domStyle.set(img, {
                                'width': legend.width + 'px',
                                'height': legend.height + 'px',
                                'opacity': layer.opacity
                            });
                            domClass.add(img, layer.id + '-layerLegendImage');
                        }, this);
                        //place it!
                        //check for single layer, if so use expandNode for legend
                        if (layer.layerInfos.length > 1) {
                            var expandNode = registry.byId(layer.id + '-' + _layer.layerId + '-sublayer-control').expandNode;
                            html.set(expandNode, ''); //clear "No Legend" placeholder
                            domConst.place(table, expandNode);
                        } else {
                            domConst.place(table, this.expandNode);
                        }
                    }, this);
                }), lang.hitch(this, function(e) {
                    topic.publish('viewer/handleError', {
                        source: 'LayerControl/Dynamic',
                        error: 'an error occurred retrieving legend'
                    });
                    topic.publish('viewer/handleError', {
                        source: 'LayerControl/Dynamic',
                        error: e
                    });
                    this._noLegend();
                }));
            } else {
                this._noLegend();
            }
        },
        //handle no legend checking for number of sublayers in service
        _noLegend: function () {
            if (this.layer.layerInfos.length === 1) {
                this._noLegendRemove(this, false);
            } else {
                array.forEach(this._sublayerControls, function (control) {
                    //layers not folders
                    if (control.sublayerInfo) {
                        this._noLegendRemove(control, true);
                    }
                }, this);
            }
        },
        //remove classes and click handler
        _noLegendRemove: function (obj, unindent) {
            domClass.remove(obj.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
            domStyle.set(obj.expandClickNode, 'cursor', 'default');
            domConst.destroy(obj.expandNode);
            if (unindent) {
                domStyle.set(obj.expandClickNode, 'width', '4px');
            }
            if (obj._expandClickHandler) {
                obj._expandClickHandler.remove();
            }
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
            });
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
            });
            if (setLayers.length) {
                layer.setVisibleLayers(setLayers);
            } else {
                layer.setVisibleLayers([-1]);
            }
            layer.refresh();
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

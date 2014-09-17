define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/on',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dojo/html',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/PopupMenuItem',
    'dijit/MenuSeparator',
    'esri/request',
    'gis/dijit/LayerControl/plugins/Transparency',
    'dojo/text!./templates/Control.html'
], function (
    declare,
    lang,
    array,
    topic,
    on,
    domClass,
    domStyle,
    domConst,
    domAttr,
    html,
    WidgetBase,
    TemplatedMixin,
    Contained,
    Menu,
    MenuItem,
    PopupMenuItem,
    MenuSeparator,
    esriRequest,
    Transparency,
    controlTemplate
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, Contained], {
        templateString: controlTemplate,
        layerTitle: 'Layer Title',
        _layerType: 'overlay', //for reoredering
        _scaleRangeHandler: null,
        _expandClickHandler: null,
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
                    source: 'LayerControl/Tiled',
                    error: 'controller option is required'
                });
                this.destroy();
                return;
            }
            if (!this.layer) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/Tiled',
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
            //wire up expand click
            this._expandClick();
            //show expandNode
            if (this.controlOptions.expanded) {
                this.expandClickNode.click();
            }
            //create legend
            this._createLegend(layer);
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
            //zoom to layer extent
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
                this._noLegendRemove(this);
                return;
            }
            //check ags version and create legends
            if (layer.version >= 10.01) {
                //create array for legend nodes
                this._legendNodes = [];
                esriRequest({
                    url: layer.url + '/legend',
                    callbackParamName: 'callback',
                    content: {
                        f: 'json',
                        token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                    }
                }).then(lang.hitch(this, function(r) {
                    //iterate through legends
                    array.forEach(r.layers, function (_layer) {
                        //check default visibility of layer
                        //  if `false` what's the point
                        if (!layer.layerInfos[_layer.layerId].defaultVisibility) {
                            return;
                        }
                        //create div for layer legend
                        var node = domConst.create('div');
                        this._legendNodes.push(node);
                        //add a class and min/max scales
                        domClass.add(node, 'layerControlTiledLegend');
                        domAttr.set(node, 'data-min-scale', _layer.minScale);
                        domAttr.set(node, 'data-max-scale', _layer.maxScale);
                        //create table for legends
                        var table = domConst.create('table', {}, node, 'last');
                        //group legends w/ title if more than one
                        if (_layer.legend.length > 1) {
                            //add title
                            var titleNode = domConst.create('div', {
                                innerHTML: _layer.layerName
                            }, node, 'first');
                            domClass.add(titleNode, 'layerControlTiledLegendTitle');
                            //add classes to table
                            domClass.add(table, ['layerControlLegendTable', 'layerControlIndent']);
                            //iterate through each legend
                            array.forEach(_layer.legend, function (legend) {
                                this._legendRow(table, legend);
                            }, this);
                        } else {
                            //add classes to table
                            domClass.add(table, ['layerControlLegendTable']);
                            //pass single legend
                            this._legendRow(table, _layer.legend[0], _layer.layerName);
                        }
                        //place it!
                        domConst.place(node, this.expandNode);
                        
                        layer.getMap().on('zoom-end', lang.hitch(this, '_legendScales'));
                        
                        this._legendScales();
                    }, this);
                }), lang.hitch(this, function(e) {
                    topic.publish('viewer/handleError', {
                        source: 'LayerControl/Tiled',
                        error: 'an error occurred retrieving legend'
                    });
                    topic.publish('viewer/handleError', {
                        source: 'LayerControl/Tiled',
                        error: e
                    });
                    html.set(this.expandNode, 'No Legend');
                }));
            } else {
                this._noLegendRemove(this);
            }
        },
        _legendRow: function (table, legend, layerName) {
            //create a table row and symbol & label table data
            //  add label too and min/max scales
            var row = domConst.create('tr', {}, table, 'last'),
                symbol = domConst.create('td', {}, row, 'first'),
                label = domConst.create('td', {
                    innerHTML: layerName || legend.label || '&nbsp;'
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
                'opacity': this.layer.opacity
            });
            domClass.add(img, this.layer.id + '-layerLegendImage');
        },
        //remove classes and click handler
        _noLegendRemove: function (obj) {
            domClass.remove(obj.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
            domStyle.set(obj.expandClickNode, 'cursor', 'default');
            domConst.destroy(obj.expandNode);
            if (obj._expandClickHandler) {
                obj._expandClickHandler.remove();
            }
        },
        //legend scales
        _legendScales: function () {
            var scale = this.layer.getMap().getScale();
            array.forEach(this._legendNodes, function (node) {
                var min = domAttr.get(node, 'data-min-scale'),
                    max = domAttr.get(node, 'data-max-scale');
                if ((min !== 0 && scale > min) || (max !== 0 && scale < max)) {
                    domStyle.set(node, 'display', 'none');
                } else {
                    domStyle.set(node, 'display', 'block');
                }
            });
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

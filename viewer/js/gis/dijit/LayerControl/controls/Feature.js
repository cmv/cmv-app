define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/on',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/html',
    'dojox/gfx',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/PopupMenuItem',
    'dijit/MenuSeparator',
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
    html,
    gfx,
    WidgetBase,
    TemplatedMixin,
    Contained,
    Menu,
    MenuItem,
    PopupMenuItem,
    MenuSeparator,
    Transparency,
    controlTemplate
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, Contained], {
        templateString: controlTemplate,
        layerTitle: 'Layer Title',
        _layerType: 'vector', //for reoredering
        _scaleRangeHandler: null,
        _expandClickHandler: null,
        _surfaceDims: [20, 20],
        layerMenu: null,
        constructor: function(options) {
            options = options || {};
            declare.safeMixin(this, options);
        },
        postCreate: function() {
            if (!this.controller) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/Feature',
                    error: 'controller option is required'
                });
                this.destroy();
                return;
            }
            if (!this.layer) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/Feature',
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
            //layer menu
            this._createMenu(layer);
            //legend
            this._createLegend(layer);
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
            if (this.controller.vectorReorder) {
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
        //create legend (check for noLegend and decide how to proceed)
        _createLegend: function(layer) {
            if (this.controlOptions.noLegend === true) {
                domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
                domStyle.set(this.expandClickNode, 'cursor', 'default');
                domConst.destroy(this.expandNode);
                if (this._expandClickHandler) {
                    this._expandClickHandler.remove();
                }
                return;
            }
            //  layer.renderer.symbol = single symbol (esri.renderer.SimpleRenderer, etc)
            //  layer.renderer.infos = multiple symbols (esri.renderer.UniqueValueRenderer, etc)
            //  TODO: read up on every single renderer! (just to be a better person)
            var symbol = layer.renderer.symbol,
                infos = layer.renderer.infos;
            //are we dealing w/ a single symbol, multiple symbols or nothing
            if (symbol) {
                //pass array with single object equivalent to an `infos` object 
                this._buildLegend([{
                    symbol: symbol,
                    description: '',
                    label: '',
                    value: ''
                }]);
            } else if (infos) {
                this._buildLegend(infos);
            } else {
                html.set(this.expandNode, 'No Legend');
            }
        },
        //build and place legend
        _buildLegend: function (infos) {
            //create legend table
            var table = domConst.create('table');
            domClass.add(table, 'layerControlLegendTable');
            //iterate over infos
            array.forEach(infos, function (info) {
                //create a table row and symbol & label table data
                //  add label too
                var row = domConst.create('tr', {}, table, 'last'),
                    symbol = domConst.create('td', {}, row, 'first'),
                    label = domConst.create('td', {
                        innerHTML: info.label || '&nbsp;'
                    }, row, 'last');
                domClass.add(symbol, 'layerControlLegendImage');
                domClass.add(label, 'layerControlLegendLabel');
                //the symbol and descriptors
                var sym = info.symbol,
                    descriptor = sym.getShapeDescriptors(),
                    ds = descriptor.defaultShape,
                    fill = descriptor.fill,
                    stroke = descriptor.stroke;
                //it's either an image or we're creating a gfx shape representation of the symbol
                if (!ds.src) {
                    if (sym) {
                        //width and height
                        var w = this._surfaceDims[0],
                            h = this._surfaceDims[1];
                        if (sym.width && sym.height) {
                            w = sym.width;
                            h = sym.height;
                        }
                        //create node for surface
                        var surfaceNode = domConst.create('span', {}, symbol);
                        domStyle.set(surfaceNode, {
                            'width': w + 'px',
                            'height': h + 'px',
                            'display': 'inline-block'
                        });
                        //create surface and add shape
                        var surface = gfx.createSurface(surfaceNode, w, h);
                        var shape = surface.createShape(ds);
                        if (fill) {
                            shape.setFill(fill);
                        }
                        if (stroke) {
                            shape.setStroke(stroke);
                        }
                        shape.applyTransform({
                            dx: w / 2,
                            dy: h / 2
                        });
                        //set opacity of td
                        //  it works but is there a better way?
                        domStyle.set(symbol, {
                            'opacity': this.layer.opacity
                        });
                        domClass.add(symbol, this.layer.id + '-layerLegendImage');
                    } else {
                        html.set(this.expandNode, 'No Legend');
                        topic.publish('viewer/handleError', {
                            source: 'LayerControl/Tiled',
                            error: 'renderer does not contain symbol(s)'
                        });
                    }
                } else {
                    //create image
                    var img = domConst.create('img', {
                        src: ds.src
                    }, symbol);
                    domStyle.set(img, {
                        'width': sym.width + 'px',
                        'height': sym.height + 'px',
                        'opacity': this.layer.opacity
                    });
                    domClass.add(img, this.layer.id + '-layerLegendImage');
                }
                //place it!
                domConst.place(table, this.expandNode);
            }, this);
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

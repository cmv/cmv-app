/* ags image control */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/on',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/html',
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
    topic,
    on,
    domClass,
    domStyle,
    html,
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
        _layerType: 'overlay', //for reoredering
        _scaleRangeHandler: null,
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
                    source: 'LayerControl/Image',
                    error: 'controller option is required'
                });
                this.destroy();
                return;
            }
            if (!this.layer) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/Image',
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
            //remove expandIconNode icon
            //  retain .layerControlIcon
            domClass.remove(this.expandIconNode, ['fa', 'fa-minus-square-o', 'fa-plus-square-o']);
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

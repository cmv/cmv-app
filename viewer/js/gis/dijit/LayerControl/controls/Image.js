define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/html',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    './../plugins/LayerMenu',
    './../plugins/legendUtil',
    'dojo/text!./templates/Control.html'
], function (
    declare,
    lang,
    topic,
    on,
    domConst,
    domClass,
    domStyle,
    html,
    WidgetBase,
    TemplatedMixin,
    Contained,
    LayerMenu,
    legendUtil,
    controlTemplate
) {
    return declare([WidgetBase, TemplatedMixin, Contained], {
        controller: null,
        layer: null,
        layerTitle: 'Layer Title',
        controlOptions: null,
        // ^args
        templateString: controlTemplate,
        layerMenu: null,
        _layerType: 'overlay',
        _scaleRangeHandler: null,
        _reorderUp: null, // used by LayerMenu
        _reorderDown: null, // used by LayerMenu
        postCreate: function () {
            this.inherited(arguments);
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
        // add layer and init control
        _initialize: function () {
            var layer = this.layer,
                controlOptions = this.controlOptions,
                isLegend = legendUtil.isLegend(controlOptions.noLegend, this.controller.noLegend);
            // template defaults as unchecked if visible checked
            if (layer.visible) {
                domClass.remove(this.checkNode, 'fa-square-o');
                domClass.add(this.checkNode, 'fa fa-check-square-o');
            }
            // toggle layer
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
            // set title
            html.set(this.labelNode, this.layerTitle);
            // wire up updating indicator
            layer.on('update-start', lang.hitch(this, function () {
                domStyle.set(this.layerUpdateNode, 'display', 'inline-block'); //font awesome display
            }));
            layer.on('update-end', lang.hitch(this, function () {
                domStyle.set(this.layerUpdateNode, 'display', 'none');
            }));
            // create legend
            if (isLegend) {
                this._expandClick();
                legendUtil.layerLegend(layer, this.expandNode);
            } else {
                domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
                domStyle.set(this.expandClickNode, 'cursor', 'default');
                domConst.destroy(this.expandNode);
            }
            // show expandNode
            if (controlOptions.expanded) {
                this.expandClickNode.click();
            }
            //layer menu
            this.layerMenu = new LayerMenu({
                control: this,
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            this.layerMenu.startup();
            //if layer has scales set
            if (layer.minScale !== 0 || layer.maxScale !== 0) {
                this._checkboxScaleRange();
                this._scaleRangeHandler = layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
            //if layer scales change
            this.layer.on('scale-range-change', lang.hitch(this, function () {
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
        // add on event to expandClickNode
        _expandClick: function () {
            this._expandClickHandler = on(this.expandClickNode, 'click', lang.hitch(this, function () {
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
        // check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function () {
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
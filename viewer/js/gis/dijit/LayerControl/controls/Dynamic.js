define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/aspect',
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
    './../plugins/LayerMenu',
    './../plugins/legendUtil',
    './DynamicSublayer',
    './DynamicFolder',
    'dojo/text!./templates/Control.html'
], function (
    declare,
    lang,
    array,
    aspect,
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
    LayerMenu,
    legendUtil,
    DynamicSublayer,
    DynamicFolder,
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
        _layerType: 'overlay', // constant
        _scaleRangeHandler: null,
        _expandClickHandler: null,
        _sublayerControls: [],
        _reorderUp: null, // used by LayerMenu
        _reorderDown: null, // used by LayerMenu
        postCreate: function () {
            this.inherited(arguments);
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
        // initialize the control
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
            // build sublayers and create legend
            if (isLegend && controlOptions.sublayers) {
                this._expandClick();
                this._createSublayers(layer);
                // create legends after sublayers created
                aspect.after(this, '_createSublayers', lang.hitch(this, legendUtil.dynamicSublayerLegend(layer, this.expandNode)));
            } else if (isLegend && controlOptions.sublayers === false) {
                this._expandClick();
                legendUtil.layerLegend(layer, this.expandNode);
            } else {
                domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'layerControlToggleIcon']);
                domStyle.set(this.expandClickNode, 'cursor', 'default');
                domConst.destroy(this.expandNode);
            }
            // show expandNode
            if (controlOptions.expanded && controlOptions.sublayers) {
                this.expandClickNode.click();
            }
            // create layer menu
            this.layerMenu = new LayerMenu({
                control: this,
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            this.layerMenu.startup();
            // if layer has scales set
            if (layer.minScale !== 0 || layer.maxScale !== 0) {
                this._checkboxScaleRange();
                this._scaleRangeHandler = layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
            // if layer scales change
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
        // add folder/sublayer controls per layer.layerInfos
        _createSublayers: function (layer) {
            // check for single sublayer - if so no sublayer/folder controls
            if (layer.layerInfos.length > 1) {
                array.forEach(layer.layerInfos, lang.hitch(this, function (info) {
                    var pid = info.parentLayerId,
                        slids = info.subLayerIds,
                        controlId = layer.id + '-' + info.id + '-sublayer-control',
                        control;
                    if (pid === -1 && slids === null) {
                        // it's a top level sublayer
                        control = new DynamicSublayer({
                            id: controlId,
                            control: this,
                            sublayerInfo: info
                        });
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid === -1 && slids !== null) {
                        // it's a top level folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            folderInfo: info
                        });
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid !== -1 && slids !== null) {
                        // it's a nested folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            folderInfo: info
                        });
                        domConst.place(control.domNode, registry.byId(layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                    } else if (pid !== -1 && slids === null) {
                        // it's a nested sublayer
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
        },
        // set dynamic layer visible layers
        _setVisibleLayers: function () {
            // because ags doesn't respect a layer group's visibility
            //   i.e. layer 3 (the group) is not in array but it's sublayers are; sublayers will show
            //   so check and if group is off also remove the sublayers
            var layer = this.layer,
                setLayers = [];
            array.forEach(query('.' + layer.id + '-layerControlSublayerCheck'), function (i) {
                if (domAttr.get(i, 'data-checked') === 'checked') {
                    setLayers.push(parseInt(domAttr.get(i, 'data-sublayer-id'), 10));
                }
            });
            array.forEach(layer.layerInfos, function (info) {
                if (info.subLayerIds !== null && array.indexOf(setLayers, info.id) === -1) {
                    array.forEach(info.subLayerIds, function (sub) {
                        if (array.indexOf(setLayers, sub) !== -1) {
                            setLayers.splice(array.indexOf(setLayers, sub), 1);
                        }
                    });
                } else if (info.subLayerIds !== null && array.indexOf(setLayers, info.id) !== -1) {
                    setLayers.splice(array.indexOf(setLayers, info.id), 1);
                }
            });
            if (!setLayers.length) {
                setLayers.push(-1);
            }
            layer.setVisibleLayers(setLayers);
            layer.refresh();
            topic.publish('layerControl/setVisibleLayers', {
                id: layer.id,
                visibleLayers: setLayers
            });
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
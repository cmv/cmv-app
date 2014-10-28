define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/aspect',
    'dojo/topic',
    'dojo/query',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dijit/registry',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    'dijit/MenuItem',
    'dijit/MenuSeparator',
    './_Control', // layer control base class
    './_DynamicSublayer',
    './_DynamicFolder',
    './../plugins/legendUtil',
    'dojo/i18n!./../nls/resource'
], function (
    declare,
    lang,
    array,
    aspect,
    topic,
    query,
    domConst,
    domAttr,
    registry,
    _WidgetBase,
    _TemplatedMixin,
    _Contained,
    MenuItem,
    MenuSeparator,
    _Control, // most everything happens here
    DynamicSublayer,
    DynamicFolder,
    legendUtil,
    i18n
) {
    var DynamicControl = declare([_WidgetBase, _TemplatedMixin, _Contained, _Control], {
        _layerType: 'overlay', // constant
        _esriLayerType: 'dynamic', // constant
        //_sublayerControls: [], // sublayer/folder controls
        _hasSublayers: false, // true when sublayers created
        constructor: function () {
            this._sublayerControls = [];
        },
        _layerTypePreInit: function () {
            if (this.layer.layerInfos.length > 1 && this.controlOptions.sublayers) {
                // we have sublayer controls
                this._hasSublayers = true;
            }
        },
        // create sublayers and legend
        _layerTypeInit: function () {
            if (legendUtil.isLegend(this.controlOptions.noLegend, this.controller.noLegend) && this.controlOptions.sublayers) {
                this._expandClick();
                this._createSublayers(this.layer);
                // create legends after sublayers created
                aspect.after(this, '_createSublayers', lang.hitch(this, legendUtil.dynamicSublayerLegend(this.layer, this.expandNode)));
            } else if (this.controlOptions.sublayers === false) {
                this._expandClick();
                legendUtil.layerLegend(this.layer, this.expandNode);
            } else {
                this._expandRemove();
            }
        },
        // called from LayerMenu plugin
        _dynamicToggleMenuItems: function (menu) {
            if (this._hasSublayers && this.controlOptions.allSublayerToggles !== false) {
                menu.addChild(new MenuItem({
                    label: i18n.dynamicSublayersOn,
                    onClick: lang.hitch(this, '_toggleAllSublayers', true)
                }));
                menu.addChild(new MenuItem({
                    label: i18n.dynamicSublayersOff,
                    onClick: lang.hitch(this, '_toggleAllSublayers', false)
                }));
                menu.addChild(new MenuSeparator());
            }
        },
        // toggle all sublayers on/off
        _toggleAllSublayers: function (state) {
            array.forEach(this._sublayerControls, function (control) {
                control._setSublayerCheckbox(state);
            });
            this._setVisibleLayers();
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
                            sublayerInfo: info,
                            icons: this.icons
                        });
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid === -1 && slids !== null) {
                        // it's a top level folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            sublayerInfo: info,
                            icons: this.icons
                        });
                        domConst.place(control.domNode, this.expandNode, 'last');
                    } else if (pid !== -1 && slids !== null) {
                        // it's a nested folder
                        control = new DynamicFolder({
                            id: controlId,
                            control: this,
                            sublayerInfo: info,
                            icons: this.icons
                        });
                        domConst.place(control.domNode, registry.byId(layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                    } else if (pid !== -1 && slids === null) {
                        // it's a nested sublayer
                        control = new DynamicSublayer({
                            id: controlId,
                            control: this,
                            sublayerInfo: info,
                            icons: this.icons
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
        }
    });
    return DynamicControl;
});
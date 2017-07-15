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
        _visLayersHandler: null,
        constructor: function () {
            this._sublayerControls = [];
            this._folderControls = [];
        },
        _layerTypePreInit: function () {
            if (this.layer.layerInfos.length > 1 && this.controlOptions.sublayers) {
                // we have sublayer controls
                this._hasSublayers = true;
                this._visLayersHandler = aspect.after(this.layer, 'setVisibleLayers', lang.hitch(this, '_onSetVisibleLayers'), true);
            }
        },
        // create sublayers and legend
        _layerTypeInit: function () {
            var isLegend = legendUtil.isLegend(this.controlOptions.noLegend, this.controller.noLegend);
            if (isLegend && this.controlOptions.sublayers === true) {
                this._expandClick();
                this._createSublayers(this.layer);
                aspect.after(this, '_createSublayers', lang.hitch(this, legendUtil.dynamicSublayerLegend(this.layer, this.expandNode)));
            } else if (this.controlOptions.sublayers === false && isLegend) {
                this._expandClick();
                legendUtil.layerLegend(this.layer, this.expandNode);
            } else if (this.controlOptions.sublayers === true && !isLegend) {
                this._expandClick();
                aspect.after(this, '_createSublayers', lang.hitch(this, '_removeSublayerLegends'));
                this._createSublayers(this.layer);
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
        _initCustomMenu: function () {
            // add custom sublayer menu items if we only have one sublayer
            if (!this._hasSublayers) {
                array.forEach(this.controlOptions.subLayerMenu, lang.hitch(this, '_addCustomMenuItem', this.layerMenu));
                this.layerMenu.addChild(new MenuSeparator());
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
                var allLayers = array.map(layer.layerInfos, function (l) {
                    return l.id;
                });
                array.forEach(layer.layerInfos, lang.hitch(this, function (info) {
                    // see if there was any override needed from the subLayerInfos array in the controlOptions
                    var sublayerInfo = array.filter(this.controlOptions.subLayerInfos, function (sli) {
                        return sli.id === info.id;
                    }).shift();
                    lang.mixin(info, sublayerInfo);
                    var pid = info.parentLayerId,
                        slids = info.subLayerIds,
                        controlId = layer.id + '-' + info.id + '-sublayer-control',
                        control = null,
                        controlIsSubLayer = false;
                    // it's a top level
                    if (pid === -1 || allLayers.indexOf(pid) === -1) {
                        if (slids === null) {
                            // it's a top level sublayer
                            control = new DynamicSublayer({
                                id: controlId,
                                control: this,
                                sublayerInfo: info,
                                icons: this.icons
                            });
                            domConst.place(control.domNode, this.expandNode, 'last');
                            controlIsSubLayer = true;
                        } else if (slids !== null) {
                            // it's a top level folder
                            control = new DynamicFolder({
                                id: controlId,
                                control: this,
                                sublayerInfo: info,
                                icons: this.icons
                            });
                            domConst.place(control.domNode, this.expandNode, 'last');
                        }
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
                        controlIsSubLayer = true;
                    }
                    control.startup();
                    if (controlIsSubLayer) {
                        this._sublayerControls.push(control);
                    } else {
                        this._folderControls.push(control);
                    }
                }));

                array.forEach(this._folderControls, function (control) {
                    control._checkFolderVisibility();
                });
            }
        },
        // simply remove expandClickNode
        _removeSublayerLegends: function () {
            array.forEach(this._sublayerControls, function (control) {
                if (!control.sublayerInfo.subLayerIds) {
                    domConst.destroy(control.expandClickNode);
                }
            });
        },
        // set dynamic layer visible layers
        _setVisibleLayers: function () {
            // remove aspect handler
            this._visLayersHandler.remove();
            var layer = this.layer,
                visibleLayers = [];
            array.forEach(query('.' + layer.id + '-layerControlSublayerCheck'), function (i) {
                if (domAttr.get(i, 'data-checked') === 'checked' && !domAttr.get(i, 'data-layer-folder')) {
                    visibleLayers.push(parseInt(domAttr.get(i, 'data-sublayer-id'), 10));
                }
            });
            if (!visibleLayers.length) {
                visibleLayers.push(-1);
            }

            array.forEach(this._folderControls, function (control) {
                control._checkFolderVisibility();
            });

            layer.setVisibleLayers(visibleLayers);
            layer.refresh();

            topic.publish('layerControl/setVisibleLayers', {
                id: layer.id,
                visibleLayers: visibleLayers
            });
            // set aspect handler
            this._visLayersHandler = aspect.after(this.layer, 'setVisibleLayers', lang.hitch(this, '_onSetVisibleLayers'), true);
        },
        _onSetVisibleLayers: function (visLayers) {
            // set the sub layer visibilty first
            array.forEach(this._sublayerControls, function (control) {
                if (array.indexOf(visLayers, control.sublayerInfo.id) !== -1) {
                    control._setSublayerCheckbox(true);
                } else {
                    control._setSublayerCheckbox(false);
                }
            });

            // setting the folder (group layer) visibility will change
            // visibility for all children sub layer and folders
            array.forEach(this._folderControls, function (control) {
                if (array.indexOf(visLayers, control.sublayerInfo.id) !== -1) {
                    control._setFolderCheckbox(true);
                } else {
                    control._setFolderCheckbox(false);
                }
            });

            // finally, set the folder UI (state of checkbox) based on
            // the sub layers and folders within the parent folder
            array.forEach(this._folderControls, function (control) {
                control._checkFolderVisibility();
            });
        }
    });
    return DynamicControl;
});

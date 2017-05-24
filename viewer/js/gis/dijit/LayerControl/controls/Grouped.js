define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/html',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    './_Control' // layer control base class
], function (
    declare,
    lang,
    array,
    on,
    topic,
    html,
    domClass,
    domStyle,
    domConstruct,
    _WidgetBase,
    _TemplatedMixin,
    _Contained,
    _Control
) {
    var GroupedControl = declare([_WidgetBase, _TemplatedMixin, _Contained, _Control], {
        layerDetails: null,
        _layerType: 'grouped', // constant
        _esriLayerType: null, // constant

        // create and legend
        _layerTypePreInit: function () {
            array.forEach(this.layerDetails, lang.hitch(this, function (layerDetail) {
                domConstruct.place(layerDetail.layerControl.domNode, this.expandNode, 'first');
            }));
        },

        _layerTypeInit: function () {
            this._expandClick();
        },

        hasAnyVisibleLayer: function () {
            return array.some(this.layerDetails, function (layerDetail) {
                return layerDetail.layerInfo.layer.visible;
            });
        },

        hasAnyInvisibleLayer: function () {
            return array.some(this.layerDetails, function (layerDetail) {
                return !layerDetail.layerInfo.layer.visible;
            });
        },

        _initialize: function () {
            // an optional function in each control widget called before widget init
            if (this._layerTypePreInit) {
                this._layerTypePreInit();
            }
            var layer = this.layer,
                controlOptions = this.controlOptions,
                layerDetails = this.layerDetails;

            // set checkbox
            this._setLayerCheckbox(layer, this.checkNode);

            // wire up layer visibility
            on(this.checkNode, 'click', lang.hitch(this, '_setLayerVisibility', layerDetails, this.checkNode));

            // set title
            html.set(this.labelNode, this.layerTitle);

            // create layer menu
            domClass.remove(this.menuNode, 'fa, layerControlMenuIcon, ' + this.icons.menu);
            domStyle.set(this.menuClickNode, 'cursor', 'default');

            // if layer has scales set
            if (layer.minScale !== 0 || layer.maxScale !== 0) {
                this._checkboxScaleRange();
                this._scaleRangeHandler = layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }

            // a function in each control widget for layer type specifics like legends and such
            this._layerTypeInit();

            // show expandNode
            //   no harm if click handler wasn't created
            if (controlOptions.expanded) {
                this.expandClickNode.click();
            }

            topic.subscribe('layerControl/layerToggle', lang.hitch(this, function (options) {
                if (options.params && !options.forced && options.id !== layer.id && options.params.groupID === this.layerTitle) {
                    var layerVisible = this.layer.visible;
                    if (layerVisible && !this.hasAnyVisibleLayer()) {
                        this.toggleVisibility();
                    } else if (!layerVisible && !this.hasAnyInvisibleLayer()) {
                        this.toggleVisibility();
                    }
                }
                this._setLayerCheckbox();
            }));
        },

        toggleVisibility: function () {
            var layer = this.layer;
            layer.visible = !layer.visible;
            if (this.hasAnyVisibleLayer() && this.hasAnyInvisibleLayer()) {
                layer.visible = true;
            }
            this._setLayerCheckbox(layer, this.checkNode);
            topic.publish('layerControl/layerToggle', {
                id: layer.id,
                visible: layer.visible,
                forced: true
            });
        },

        _setLayerVisibility: function (layerDetails, checkNode, event) {
            this.toggleVisibility();

            var _arguments = arguments;
            // Calls _setLayerVisibility for each grouped layer
            array.forEach(layerDetails, lang.hitch(this, function (layerDetail) {
                if (this.layer.visible !== layerDetail.layerInfo.layer.visible) {
                    this.inherited(_arguments, [layerDetail.layerInfo.layer, layerDetail.layerControl.checkNode, event]);
                }
            }));
            this._setLayerCheckbox();
        },

        // overrides the method in _Control
        _setLayerCheckbox: function () {
            var checkNode = this.checkNode,
                i = this.icons;

            domClass.remove(checkNode, i.checked);
            domClass.remove(checkNode, i.unchecked);
            domClass.remove(checkNode, i.indeterminate);

            var hasVisible = this.hasAnyVisibleLayer();
            var hasHidden = this.hasAnyInvisibleLayer();

            // indeterminate - both visible and invisible layers in group
            if (hasVisible && hasHidden) {
                domClass.add(checkNode, i.indeterminate);
            } else if (hasVisible) {
                domClass.add(checkNode, i.checked);
            } else {
                domClass.add(checkNode, i.unchecked);
            }
        }
    });
    return GroupedControl;
});
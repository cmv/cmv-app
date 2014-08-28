define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-attr',
    'dojo/html',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/MenuSeparator',
    'dojo/text!./templates/Sublayer.html'
], function(
    declare,
    lang,
    arrayUtil,
    on,
    domClass,
    domStyle,
    domAttr,
    html,
    WidgetBase,
    TemplatedMixin,
    Menu,
    MenuItem,
    MenuSeparator,
    sublayerTemplate
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin], {
        templateString: sublayerTemplate,
        control: null,
        sublayer: null,
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            if (this.sublayerInfo.defaultVisibility) {
                domClass.remove(this.checkNode, 'fa-square-o');
                domClass.add(this.checkNode, 'fa fa-check-square-o');
                domAttr.set(this.checkNode, 'data-checked', 'checked');
            } else {
                domAttr.set(this.checkNode, 'data-checked', 'unchecked');
            }
            domAttr.set(this.checkNode, 'data-sublayer-id', this.sublayerInfo.id);
            domClass.add(this.checkNode, this.control.layer.id + '-layerControlSublayerCheck');
            on(this.checkNode, 'click', lang.hitch(this, function() {
                if (domAttr.get(this.checkNode, 'data-checked') === 'checked') {
                    domAttr.set(this.checkNode, 'data-checked', 'unchecked');
                    domClass.remove(this.checkNode, 'fa-check-square-o');
                    domClass.add(this.checkNode, 'fa-square-o');
                } else {
                    domAttr.set(this.checkNode, 'data-checked', 'checked');
                    domClass.remove(this.checkNode, 'fa-square-o');
                    domClass.add(this.checkNode, 'fa-check-square-o');
                }
                this.control._setVisibleLayers();
                this._checkboxScaleRange();
            }));
            html.set(this.labelNode, this.sublayerInfo.name);
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
                var expandNode = this.expandNode,
                    iconNode = this.expandIconNode;
                if (domStyle.get(expandNode, 'display') === 'none') {
                    domStyle.set(expandNode, 'display', 'block');
                    domClass.remove(iconNode, 'fa-plus-square-o');
                    domClass.add(iconNode, 'fa-minus-square-o');
                } else {
                    domStyle.set(expandNode, 'display', 'none');
                    domClass.remove(iconNode, 'fa-minus-square-o');
                    domClass.add(iconNode, 'fa-plus-square-o');
                }
            }));
            if (this.sublayerInfo.minScale !== 0 || this.sublayerInfo.maxScale !== 0) {
                this._checkboxScaleRange();
                this.control.layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
            //add custom menu items
            var items = this.control.params.controlOptions.sublayerMenuItems;
            if (items && items.length) {
                this._sublayerMenu(items);
            } else {
                domClass.remove(this.labelNode, 'layerControlClick');
            }
        },
        //check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function() {
            var node = this.checkNode,
                scale = this.control.layer.getMap().getScale(),
                min = this.sublayerInfo.minScale,
                max = this.sublayerInfo.maxScale;
            domClass.remove(node, 'layerControlCheckIconOutScale');
            if ((min !== 0 && scale > min) || (max !== 0 && scale < max)) {
                domClass.add(node, 'layerControlCheckIconOutScale');
            }
        },
        //create menu
        _sublayerMenu: function(items) {
            var menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            arrayUtil.forEach(items, function (item) {
                if (item.separator && item.separator === 'separator') {
                    menu.addChild(new MenuSeparator());
                } else {
                    menu.addChild(new MenuItem(item));
                }
            }, this);
            menu.startup();
        }
    });
});

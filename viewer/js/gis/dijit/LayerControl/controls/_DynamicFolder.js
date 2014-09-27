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
    'dojo/text!./templates/Folder.html'
], function (
    declare,
    lang,
    array,
    on,
    domClass,
    domStyle,
    domAttr,
    html,
    WidgetBase,
    TemplatedMixin,
    folderTemplate
) {
    var _DynamicFolder =  declare([WidgetBase, TemplatedMixin], {
        control: null,
        sublayerInfo: null,
        // ^args

        templateString: folderTemplate,
        _expandClickHandler: null,

        postCreate: function () {
            this.inherited(arguments);

            var checkNode = this.checkNode;

            domAttr.set(checkNode, 'data-sublayer-id', this.sublayerInfo.id);
            
            domClass.add(checkNode, this.control.layer.id + '-layerControlSublayerCheck');

            if (array.indexOf(this.control.layer.visibleLayers, this.sublayerInfo.id) !== -1) {
                this._setSublayerCheckbox(true, checkNode);
            } else {

                this._setSublayerCheckbox(false, checkNode);
            }
                        
            on(checkNode, 'click', lang.hitch(this, function () {
                if (domAttr.get(checkNode, 'data-checked') === 'checked') {
                    this._setSublayerCheckbox(false, checkNode);
                } else {
                    this._setSublayerCheckbox(true, checkNode);
                }
                this.control._setVisibleLayers();
                this._checkboxScaleRange();
            }));
            
            html.set(this.labelNode, this.sublayerInfo.name);
            
            this._expandClick();
            
            if (this.sublayerInfo.minScale !== 0 || this.sublayerInfo.maxScale !== 0) {
                this._checkboxScaleRange();
                this.control.layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
        },

        // add on event to expandClickNode
        _expandClick: function () {
            this._expandClickHandler = on(this.expandClickNode, 'click', lang.hitch(this, function () {
                var expandNode = this.expandNode,
                    iconNode = this.expandIconNode;
                if (domStyle.get(expandNode, 'display') === 'none') {
                    domStyle.set(expandNode, 'display', 'block');
                    domClass.replace(iconNode, 'fa-folder-open-o', 'fa-folder-o');
                } else {
                    domStyle.set(expandNode, 'display', 'none');
                    domClass.replace(iconNode, 'fa-folder-o', 'fa-folder-open-o');
                }
            }));
        },

        // set checkbox based on layer so it's always in sync
        _setSublayerCheckbox: function (checked, checkNode) {
            if (checked) {
                domAttr.set(checkNode, 'data-checked', 'checked');
                domClass.replace(checkNode, 'fa-check-square-o', 'fa-square-o');
            } else {
                domAttr.set(checkNode, 'data-checked', 'unchecked');
                domClass.replace(checkNode, 'fa-square-o', 'fa-check-square-o');
            }
        },

        // check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function () {
            var node = this.checkNode,
                scale = this.control.layer.getMap().getScale(),
                min = this.sublayerInfo.minScale,
                max = this.sublayerInfo.maxScale;
            domClass.remove(node, 'layerControlCheckIconOutScale');
            if ((min !== 0 && scale > min) || (max !== 0 && scale < max)) {
                domClass.add(node, 'layerControlCheckIconOutScale');
            }
        }
    });

    return _DynamicFolder;
});
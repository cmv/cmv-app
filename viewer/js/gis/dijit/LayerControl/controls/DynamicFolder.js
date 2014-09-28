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
    return declare([WidgetBase, TemplatedMixin], {
        control: null,
        folderInfo: null,
        // ^args
        templateString: folderTemplate,
        postCreate: function () {
            this.inherited(arguments);
            if (array.indexOf(this.control.layer.visibleLayers, this.folderInfo.id) !== -1) {
                domClass.remove(this.checkNode, 'fa-square-o');
                domClass.add(this.checkNode, 'fa fa-check-square-o');
                domAttr.set(this.checkNode, 'data-checked', 'checked');
            } else {
                domAttr.set(this.checkNode, 'data-checked', 'unchecked');
            }
            domAttr.set(this.checkNode, 'data-sublayer-id', this.folderInfo.id);
            domClass.add(this.checkNode, this.control.layer.id + '-layerControlSublayerCheck');
            on(this.checkNode, 'click', lang.hitch(this, function () {
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
            html.set(this.labelNode, this.folderInfo.name);
            on(this.expandClickNode, 'click', lang.hitch(this, function () {
                var expandNode = this.expandNode,
                    iconNode = this.expandIconNode;
                if (domStyle.get(expandNode, 'display') === 'none') {
                    domStyle.set(expandNode, 'display', 'block');
                    domClass.remove(iconNode, 'fa-folder-o');
                    domClass.add(iconNode, 'fa-folder-open-o');
                } else {
                    domStyle.set(expandNode, 'display', 'none');
                    domClass.remove(iconNode, 'fa-folder-open-o');
                    domClass.add(iconNode, 'fa-folder-o');
                }
            }));
            if (this.folderInfo.minScale !== 0 || this.folderInfo.maxScale !== 0) {
                this._checkboxScaleRange();
                this.control.layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
        },
        // check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function () {
            var node = this.checkNode,
                scale = this.control.layer.getMap().getScale(),
                min = this.folderInfo.minScale,
                max = this.folderInfo.maxScale;
            domClass.remove(node, 'layerControlCheckIconOutScale');
            if ((min !== 0 && scale > min) || (max !== 0 && scale < max)) {
                domClass.add(node, 'layerControlCheckIconOutScale');
            }
        }
    });
});
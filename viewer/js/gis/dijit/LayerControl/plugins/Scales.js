/* set layer scales component */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-style',
    'dojo/html',
    'dojo/number',
    'dijit/PopupMenuItem',
    'dijit/TooltipDialog',
    'dojo/text!./templates/Scales.html'
], function (
    declare,
    lang,
    domStyle,
    html,
    number,
    PopupMenuItem,
    TooltipDialog,
    scalesTemplate
) {
    'use strict';
    //custom tooltip dialog
    var ScalesTooltipDialog = declare([TooltipDialog], {
        templateString: scalesTemplate,
        layer: null,
        map: null,
        constructor: function (options) {
            options = options || {};
            lang.mixin(this, options);
            this.map = this.layer.getMap();
        },
        postCreate: function () {
            this.on('show', lang.hitch(this, function () {
                this._setHtml(this.mapScaleNode, '1:' + number.format(this.map.getScale(), {places: 0}));
                this._setHtml(this.minScaleNode, this._getScale(this.layer.minScale));
                this._setHtml(this.maxScaleNode, this._getScale(this.layer.maxScale));
            }));
        },
        _setMinScale: function () {
            var mapScale = this.map.getScale();
            this.layer.setMinScale(mapScale + 1);
            this._setHtml(this.minScaleNode, this._getScale(mapScale));
        },
        _clearMinScale: function () {
            this.layer.setMinScale(0);
            this._setHtml(this.minScaleNode, 'UNLIMITED');
        },
        _setMaxScale: function () {
            var mapScale = this.map.getScale();
            this.layer.setMaxScale(mapScale - 1);
            this._setHtml(this.maxScaleNode, this._getScale(mapScale));
        },
        _clearMaxScale: function () {
            this.layer.setMaxScale(0);
            this._setHtml(this.maxScaleNode, 'UNLIMITED');
        },
        _getScale: function (scale) {
            if (scale === 0) {
                return 'UNLIMITED';
            } else {
                return '1:' + number.format(scale, {places: 0});
            }
        },
        _setHtml: function (node, cont, params) {
            params = params || {};
            html.set(node, cont, params);
        }
    });
    //the menu item
    return declare(PopupMenuItem, {
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.popup = new ScalesTooltipDialog({
                layer: this.layer
            });
            domStyle.set(this.popup.connectorNode, 'display', 'none');
            this.popup.startup();
        }
    });
});

/* ags feature control */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    //'dojo/_base/array',
    'dojo/on',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/html',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/MenuSeparator',
    //'esri/request',
    'gis/dijit/LayerControl/plugins/Transparency',
    'gis/dijit/LayerControl/plugins/Scales',
    'dojo/text!./templates/Control.html'
], function (
    declare,
    lang,
    //arrayUtil, //will need for legend
    on,
    domClass,
    domStyle,
    html,
    WidgetBase,
    TemplatedMixin,
    Contained,
    Menu,
    MenuItem,
    MenuSeparator,
    //esriRequest, //may need for legend
    Transparency,
    Scales,
    controlTemplate
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, Contained], {
        templateString: controlTemplate,
        layerTitle: 'Layer Title',
        _layerType: 'vector', //for reoredering
        _scaleRangeHandler: null,
        constructor: function(options) {
            options = options || {};
            declare.safeMixin(this, options);
        },
        postCreate: function() {
            if (!this.controller) {
                console.log('Feature error::controller option is required');
                this.destroy();
                return;
            }
            if (!this.layer) {
                console.log('Feature error::layer option is required');
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
                } else {
                    layer.show();
                    domClass.remove(this.checkNode, 'fa-square-o');
                    domClass.add(this.checkNode, 'fa-check-square-o');
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
            //wire up expand click
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
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
            //layer menu
            this._menu();
            //legend
            //if (layer.version >= 10.01) {
                this._legend(layer);
            //} else {
                //html.set(this.expandNode, 'No Legend');
            //}
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
        _menu: function() {
            var menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            //reorder menu items
            if (this.controller.vectorReorder) {
                menu.addChild(new MenuItem({
                    label: 'Move Up',
                    onClick: lang.hitch(this, function() {
                        this.controller._moveUp(this);
                    })
                }));
                menu.addChild(new MenuItem({
                    label: 'Move Down',
                    onClick: lang.hitch(this, function() {
                        this.controller._moveDown(this);
                    })
                }));
                menu.addChild(new MenuSeparator());
            }
            //zoom to layer extent
            menu.addChild(new MenuItem({
                label: 'Zoom to Layer',
                onClick: lang.hitch(this, function() {
                    this.controller._zoomToLayer(this.layer);
                })
            }));
            //add plugins
            if (this.controlOptions.transparency) {
                menu.addChild(new Transparency({
                    label: 'Transparency',
                    layer: this.layer
                }));
            }
            if (this.controlOptions.scales) {
                menu.addChild(new Scales({
                    label: 'Scales',
                    layer: this.layer
                }));
            }
            menu.startup();
        },
        //get legend json and build
        //
        //  what really needs to happen is build a legend from the drawing info
        //  probably a lot of work or at least digging into feature layer and dojox/gfx
        _legend: function(layer) {
            layer = layer; //lint free
            
            html.set(this.expandNode, 'No Legend');
            
            /*var url = layer.url;
            if (!isNaN(parseInt(url.charAt(url.length - 1), 10))) {
                url = url.replace('FeatureServer', 'MapServer').substring(0, url.length - 2);
            }
            esriRequest({
                url: url + '/legend',
                callbackParamName: 'callback',
                content: {
                    f: 'json',
                    token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                }
            }).then(lang.hitch(this, function(r) {
                console.log(r);
            }), lang.hitch(this, function(e) {
                console.log(e);
                console.log('Feature::an error occurred retrieving legend');
                html.set(this.expandNode, 'No Legend');
            }));*/
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

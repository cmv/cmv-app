define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/topic',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-attr',
    'dojo/fx',
    'dojo/html',
    'dijit/MenuItem',
    './../plugins/LayerMenu',
    'dojo/text!./templates/Control.html'
], function (
    declare,
    lang,
    array,
    on,
    topic,
    domConst,
    domStyle,
    domClass,
    domAttr,
    fx,
    html,
    MenuItem,
    LayerMenu,
    template
) {
    var _Control = declare([], {
        templateString: template, // widget template
        controller: null, // LayerControl instance
        layer: null, // the layer object
        layerTitle: 'Layer Title', // default title
        controlOptions: null, // control options
        layerMenu: null, //the controls menu
        icons: null,
        _reorderUp: null, // used by LayerMenu
        _reorderDown: null, // used by LayerMenu
        _scaleRangeHandler: null, // handle for scale range awareness
        _expandClickHandler: null, // the click handler for the expandNode
        constructor: function (params) {
            if (params.controller) {
                this.icons = params.controller.icons;
            } // if not you've got bigger problems
            this._handlers = [];
        },
        postCreate: function () {
            this.inherited(arguments);
            if (!this.controller) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/_Control',
                    error: 'controller option is required'
                });
                this.destroy();
                return;
            }
            if (!this.layer) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl/_Control',
                    error: 'layer option is required'
                });
                this.destroy();
                return;
            }

            if (this.layer.loaded) {
                this._initialize();
            } else {
                this._handlers.push(this.layer.on('load', lang.hitch(this, '_initialize')));
            }
        },
        // initialize the control
        _initialize: function () {
            // an optional function in each control widget called before widget init
            if (this._layerTypePreInit) {
                this._layerTypePreInit();
            }
            var layer = this.layer,
                controlOptions = this.controlOptions;
            // set checkbox
            this._setLayerCheckbox(layer, this.checkNode);
            // set title
            html.set(this.labelNode, this.layerTitle);
            // create layer menu
            if ((controlOptions.noMenu !== true && this.controller.noMenu !== true) || (this.controller.noMenu === true && controlOptions.noMenu === false)) {
                this.layerMenu = new LayerMenu({
                    control: this,
                    contextMenuForWindow: false,
                    targetNodeIds: [this.menuNode],
                    leftClickToOpen: true
                });
                this.layerMenu.startup();
                this._initCustomMenu();
            } else {
                domClass.remove(this.menuNode, 'fa, layerControlMenuIcon, ' + this.icons.menu);
                domStyle.set(this.menuClickNode, 'cursor', 'default');
            }
            // if layer has scales set
            if (layer.minScale !== 0 || layer.maxScale !== 0) {
                this._checkboxScaleRange();
                this._scaleRangeHandler = layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
            }
            // a function in each control widget for layer type specifics like legends and such
            this._layerTypeInit();
            // show expandNode
            //   no harm if click handler wasn't created
            if (controlOptions.expanded && controlOptions.sublayers) {
                this.expandClickNode.click();
            }
            // esri layer's don't inherit from Stateful
            //   connect to update events to handle "watching" layers
            this._handlers.push(
                on(this.checkNode, 'click', lang.hitch(this, '_setLayerVisibility', layer, this.checkNode)),
                layer.on('scale-range-change', lang.hitch(this, '_scaleRangeChange')),
                layer.on('update-start', lang.hitch(this, '_updateStart')),
                layer.on('update-end', lang.hitch(this, '_updateEnd')),
                layer.on('visibility-change', lang.hitch(this, '_visibilityChange'))
            );
        },
        _initCustomMenu: function () {
            array.forEach(this.controlOptions.menu, lang.hitch(this, '_addCustomMenuItem', this.layerMenu));
        },
        _addCustomMenuItem: function (menu, menuItem) {
            //create the menu item
            var item = new MenuItem(menuItem);
            item.set('onClick', lang.hitch(this, function () {
                topic.publish('layerControl/' + menuItem.topic, {
                    layer: this.layer,
                    iconNode: this.iconNode,
                    menuItem: item
                });
            }));
            menu.addChild(item);
        },
        // add on event to expandClickNode
        _expandClick: function () {
            this._expandClickHandler = on(this.expandClickNode, 'click', lang.hitch(this, '_expandClicked'));
            this._handlers.push(this._expandClickHandler);
        },
        _expandClicked: function () {
            var i = this.icons,
                expandNode = this.expandNode,
                iconNode = this.expandIconNode;
            if (domStyle.get(expandNode, 'display') === 'none') {
                fx.wipeIn({
                    node: expandNode,
                    duration: 300
                }).play();
                domClass.replace(iconNode, i.collapse, i.expand);
            } else {
                fx.wipeOut({
                    node: expandNode,
                    duration: 300
                }).play();
                domClass.replace(iconNode, i.expand, i.collapse);
            }
        },
        // removes the icons and cursor:pointer from expandClickNode and destroys expandNode
        _expandRemove: function () {
            domClass.remove(this.expandIconNode, ['fa', this.icons.expand, 'layerControlToggleIcon']);
            domStyle.set(this.expandClickNode, 'cursor', 'default');
            domConst.destroy(this.expandNode);
        },
        // set layer visibility and update icon
        _setLayerVisibility: function (layer, checkNode, event) {

            // prevent click event from bubbling
            if (event.stopPropagation) {
                event.stopPropagation();
            }

            if (layer.visible) {
                this._setLayerCheckbox(layer, checkNode);
                layer.hide();
                topic.publish('layerControl/layerToggle', {
                    id: layer.id,
                    visible: layer.visible,
                    params: layer._params
                });
            } else {
                this._setLayerCheckbox(layer, checkNode);
                layer.show();
                topic.publish('layerControl/layerToggle', {
                    id: layer.id,
                    visible: layer.visible,
                    params: layer._params
                });
            }
            if (layer.minScale !== 0 || layer.maxScale !== 0) {
                this._checkboxScaleRange();
            }
        },
        // set checkbox based on layer so it's always in sync
        _setLayerCheckbox: function (layer, checkNode) {
            var i = this.icons;
            if (layer.visible) {
                domAttr.set(checkNode, 'data-checked', 'checked');
                domClass.replace(checkNode, i.checked, i.unchecked);
            } else {
                domAttr.set(checkNode, 'data-checked', 'unchecked');
                domClass.replace(checkNode, i.unchecked, i.checked);
            }
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
        },
        _scaleRangeChange: function () {
            if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                this._checkboxScaleRange();
                if (this._scaleRangeHandler) {
                    var handlerIndex = array.indexOf(this._handlers, this._scaleRangeHandler);
                    if (handlerIndex !== -1) {
                        this._handlers[handlerIndex].remove();
                        this._handlers.splice(handlerIndex, 1);
                    }
                }
                this._scaleRangeHandler = this.layer.getMap().on('zoom-end', lang.hitch(this, '_checkboxScaleRange'));
                this._handlers.push(this._scaleRangeHandler);
            } else {
                this._checkboxScaleRange();
                if (this._scaleRangeHandler) {
                    var handlerIndex2 = array.indexOf(this._handlers, this._scaleRangeHandler);
                    if (handlerIndex2 !== -1) {
                        this._handlers[handlerIndex2].remove();
                        this._handlers.splice(handlerIndex2, 1);
                    }
                    this._scaleRangeHandler = null;
                }
            }
        },
        // anything the widget may need to do before update
        _updateStart: function () {
            domStyle.set(this.layerUpdateNode, 'display', 'inline-block'); //font awesome display
            // clone a layer state before layer updates for use after update
            this._layerState = lang.clone({
                visible: this.layer.visible,
                visibleLayers: this.layer.visibleLayers || null
            });
        },
        // anything the widget may need to do after update
        _updateEnd: function () {
            domStyle.set(this.layerUpdateNode, 'display', 'none');
            // how to handle external layer.setVisibleLayers() ???
            //
            // without topics to get/set sublayer state this will be challenging
            // still up for debate...

            // anything needing before update layer state
            if (!this._layerState) {
                // clear
                this._layerState = null;
                return;
            }
        },
        // anything the widget may need to do after visibility change
        _visibilityChange: function (r) {
            // if the checkbox doesn't match layer visibility correct it by calling _setLayerCheckbox
            if ((r.visible && domAttr.get(this.checkNode, 'data-checked') === 'unchecked') || (!r.visible && domAttr.get(this.checkNode, 'data-checked') === 'checked')) {
                this._setLayerCheckbox(this.layer, this.checkNode);
            }
        },
        destroy: function () {
            this.inherited(arguments);
            this._handlers.forEach(function (h) {
                h.remove();
            });
        }
    });
    return _Control;
});

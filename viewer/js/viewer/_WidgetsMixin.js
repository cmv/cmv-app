define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/promise/all',
    'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/query',

    'dijit/Menu',
    'dijit/layout/ContentPane',

    'gis/dijit/FloatingTitlePane',
    'gis/dijit/ExpandPane',
    'gis/dijit/FloatingWidgetDialog'

], function (
    declare,
    array,
    lang,
    aspect,
    promiseAll,
    Deferred,
    domConstruct,
    domQuery,

    Menu,
    ContentPane,
    FloatingTitlePane,
    ExpandPane,
    FloatingWidgetDialog
) {

    return declare(null, {

        legendLayerInfos: [],
        editorLayerInfos: [],
        identifyLayerInfos: [],
        layerControlLayerInfos: [],

        widgets: {},
        widgetTypes: ['contentPane', 'domNode', 'expandPane', 'floating', 'invisible', 'layer', 'layout', 'loading', 'map', 'titlePane', 'ui'],
        widgetLayerInfos: ['editor', 'identify', 'layerControl', 'legend'],
        postConfig: function (wait) {

            var waitDeferred = null;
            if (wait) {
                waitDeferred = new Deferred();

                wait.then(lang.hitch(this, function () {
                    // load loading widgets
                    promiseAll(this.createWidgets(['loading'])).then(waitDeferred.resolve);
                }));
            } else {
                var deferreds = this.createWidgets(['loading']);
                if (deferreds && deferreds.length) {
                    waitDeferred = promiseAll(deferreds);
                }
            }

            return this.inherited(arguments) || waitDeferred;
        },
        startup: function () {
            this.inherited(arguments);

            // add any user-defined widget types
            this.widgetTypes = this.widgetTypes.concat(this.config.widgetTypes || []);

            // add any user-defined widget layerInfos
            this.widgetLayerInfos = this.widgetLayerInfos.concat(this.config.widgetlayerInfos || []);

            if (this.mapDeferred) {
                this.mapDeferred.then(lang.hitch(this, 'createWidgets', ['map', 'layer']));
            }
            if (this.layoutDeferred) {
                this.layoutDeferred.then(lang.hitch(this, 'createWidgets', ['layout']));
                promiseAll([this.mapDeferred, this.layoutDeferred])
                    .then(lang.hitch(this, 'createWidgets', null));
            }
        },

        createWidgets: function (widgetTypes) {
            var widgets = [], paneWidgets = [], paneWidgetKeys = [], deferreds = [];

            widgetTypes = widgetTypes || this.widgetTypes;
            for (var key in this.config.widgets) {
                if (this.config.widgets.hasOwnProperty(key)) {
                    var widget = this.config.widgets[key];
                    widget.widgetKey = widget.widgetKey || widget.id || key;
                    if (widget.include && (!this.widgets[widget.widgetKey]) && (array.indexOf(widgetTypes, widget.type) >= 0)) {
                        // default pane
                        if ((widget.type === 'titlePane' || widget.type === 'contentPane') && (!widget.placeAt && !widget.uiOptions)) {
                            widget.placeAt = 'left';
                        }
                        widget.position = this._getPosition(widget);
                        widgets.push(widget);
                        this.widgets[key] = true; // will be replaced by actual widget once created
                    }
                }
            }

            function getPaneWidgets (pane) {
                paneWidgets = array.filter(widgets, function (paneWidget) {
                    if (paneWidget.placeAt && paneWidget.placeAt === pane) {
                        paneWidgetKeys.push(paneWidget.widgetKey);
                        return true;
                    }
                    return false;
                });
                return paneWidgets;
            }

            function loadWidget (widgetConfig, i) {
                var def = this.widgetLoader(widgetConfig, i);
                if (def) {
                    deferreds.push(def);
                }
            }

            for (var pane in this.panes) {
                if (this.panes.hasOwnProperty(pane) && pane !== 'outer' && pane !== 'center') {
                    paneWidgets = getPaneWidgets(pane);
                    paneWidgets.sort(function (a, b) {
                        return a.position - b.position;
                    });
                    if (paneWidgets.length > 0 && paneWidgets[0].position !== 0) {
                        paneWidgets[0].position = 0;
                    }
                    array.forEach(paneWidgets, loadWidget, this);
                }
            }

            paneWidgets = array.filter(widgets, function (paneWidget) {
                return (array.indexOf(paneWidgetKeys, paneWidget.widgetKey) < 0);
            });
            paneWidgets.sort(function (a, b) {
                return a.position - b.position;
            });

            array.forEach(paneWidgets, loadWidget, this);
            return deferreds;
        },

        widgetLoader: function (widgetConfig, position) {
            var pnl = null,
                widgetTypes = this.widgetTypes,
                deferred = new Deferred();

            // only proceed for valid widget types
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                this.handleError({
                    source: 'Controller',
                    error: 'Widget type "' + widgetConfig.type + '" (' + widgetConfig.title + ') at position ' + position + ' is not supported.'
                });
                return null;
            }

            // build a parent widget to contain the new widget
            widgetConfig.watched = widgetConfig.watched || 'open';
            if (this._isPaneWidget(widgetConfig.type)) {
                pnl = widgetConfig.parentWidget = this._createParentWidget(widgetConfig, position);
            }

            widgetConfig.preload = (typeof widgetConfig.preload === 'undefined') ? true : widgetConfig.preload;
            if (!widgetConfig.preload) {
                widgetConfig.watchHandle = pnl.watch(widgetConfig.watched, lang.hitch(this, '_loadWidget', widgetConfig, deferred));
            } else {
                this._loadWidget(widgetConfig, deferred);
            }
            return deferred;
        },

        _loadWidget: function (widgetConfig, deferred) {
            // 2 ways to use require to accommodate widgets that may have an optional separate configuration file
            if (typeof widgetConfig.options === 'string') {
                require([widgetConfig.options, widgetConfig.path], lang.hitch(this, function (options, WidgetClass) {
                    this.createWidget(widgetConfig, options, WidgetClass);
                    deferred.resolve();
                }));
            } else {
                require([widgetConfig.path], lang.hitch(this, function (WidgetClass) {
                    this.createWidget(widgetConfig, widgetConfig.options, WidgetClass);
                    deferred.resolve();
                }));
            }
            if (widgetConfig.watchHandle) {
                widgetConfig.watchHandle.unwatch();
                widgetConfig.watchHandle.remove();
            }
        },

        createWidget: function (widgetConfig, options, WidgetClass) {
            var key = widgetConfig.widgetKey;
            if (!key) {
                return;
            }

            // set any additional options
            options = this._setWidgetOptions(widgetConfig, options);

            // create the widget
            var widget = new WidgetClass(options, widgetConfig.srcNodeRef),
                pnl = options.parentWidget || {};
            this._placeWidget(widget, pnl, widgetConfig);

            // start up the widget
            if (widget && (typeof widget.startup === 'function') && !widget._started) {
                widget.startup();
            }
            this.widgets[key] = widget;
            this._hideWidgetLoader(pnl);
        },

        _setWidgetOptions: function (widgetConfig, options) {
            if (widgetConfig.id) {
                options.id = widgetConfig.id + '_widget';
            }
            options.parentWidget = widgetConfig.parentWidget;

            //replace config map, layerInfos arrays, etc
            if (options.map) {
                options.map = this.map;
            }
            if (options.mapRightClickMenu) {
                // create right-click menu
                if (!this.mapRightClickMenu) {
                    this.mapRightClickMenu = new Menu({
                        targetNodeIds: [this.map.root],
                        selector: '.esriMapLayers' // restrict to map only
                    });
                    this.mapRightClickMenu.startup();
                }
                options.mapRightClickMenu = this.mapRightClickMenu;
            }
            if (options.mapClickMode) {
                options.mapClickMode = this.mapClickMode.current;
            }
            array.forEach(this.widgetLayerInfos, lang.hitch(this, function (key) {
                key += 'LayerInfos';
                if (options[key] && this[key]) {
                    options.layerInfos = this[key];
                }
            }));
            return options;
        },

        _showWidgetLoader: function (pnl) {
            if (pnl && pnl.containerNode) {
                pnl.loadingNode = domConstruct.create('div', {className: 'widgetLoader', innerHTML: '<i class="fa fa-spinner fa-pulse fa-fw"></i>'}, pnl.containerNode, 'first');
            }
        },

        _hideWidgetLoader: function (pnl) {
            if (pnl && pnl.loadingNode) {
                require(['dojo/domReady!'], function () {
                    domConstruct.destroy(pnl.loadingNode);
                });
            }
        },

        _createTitlePaneWidget: function (widgetConfig) {
            var options = lang.mixin({
                open: widgetConfig.open || false,
                canFloat: widgetConfig.canFloat || false,
                resizable: widgetConfig.resizable || false,
                sidebar: this._getPlaceAt(widgetConfig)
            }, widgetConfig.paneOptions || {});

            if (widgetConfig.type === 'expandPane') {
                return new ExpandPane(options);
            }
            return new FloatingTitlePane(options);
        },

        _createFloatingWidget: function (widgetConfig) {
            return new FloatingWidgetDialog(widgetConfig.paneOptions);
        },

        _createContentPaneWidget: function (widgetConfig) {
            var options = lang.mixin({
                region: widgetConfig.region || 'center'
            }, widgetConfig.paneOptions || {});
            if (widgetConfig.className) {
                options.className = widgetConfig.className;
            }
            return new ContentPane(options);
        },

        _createParentWidget: function (widgetConfig, position) {
            var parentId = widgetConfig.widgetKey + '_parent',
                pnl = null;

            widgetConfig.position = position;
            widgetConfig.srcNodeRef = widgetConfig.srcNodeRef || domConstruct.create('div');

            widgetConfig.paneOptions = lang.mixin({
                id: parentId,
                title: widgetConfig.title,
                class: parentId,
                iconClass: widgetConfig.iconClass
            }, widgetConfig.paneOptions || {});

            switch (widgetConfig.type) {
            case 'titlePane':
            case 'expandPane':
                pnl = this._createTitlePaneWidget(widgetConfig);
                break;
            case 'contentPane':
                pnl = this._createContentPaneWidget(widgetConfig);
                widgetConfig.preload = true;
                break;
            case 'floating':
                pnl = this._createFloatingWidget(widgetConfig);
                break;
            default:
            }

            var placeAt = this._getPlaceAt(widgetConfig);
            if (placeAt && (typeof pnl.placeAt === 'function')) {
                pnl.placeAt(placeAt);
            }
            if ((typeof pnl.startup === 'function') && !pnl._started) {
                pnl.startup();
            }
            this._showWidgetLoader(pnl);

            widgetConfig.preload = (widgetConfig.preload) || pnl.get(widgetConfig.watched) || (typeof pnl.watch !== 'function');
            return pnl;
        },

        _isPaneWidget: function (type) {
            var types = ['titlePane', 'contentPane', 'expandPane', 'floating'];
            return (array.indexOf(types, type) >= 0);
        },

        _placeWidget: function (widget, pnl, widgetConfig) {
            var placeAt = pnl.containerNode || this._getPlaceAt(widgetConfig);
            if (placeAt) {
                if (typeof widget.placeAt === 'function') {
                    return widget.placeAt(placeAt, widgetConfig.position);
                }
                return domConstruct.place(widget.domNode, placeAt, widgetConfig.position);
            }
            return null;
        },

        _getPlaceAt: function (widgetConfig) {
            var placeAt = widgetConfig.placeAt;

            if (typeof placeAt === 'string') {
                // is it a dojo pane?
                // possible unintended consequences  if pane has same key as shortcuts below
                if (this.panes[placeAt]) {
                    placeAt = this.panes[placeAt];

                } else {
                    if (widgetConfig.uiOptions) {
                        // for compatibility with 4.x api's use of 'position'
                        placeAt = widgetConfig.uiOptions.position || placeAt;
                    }

                    // convert 4.x-style shortcuts to a css selector.
                    var posShortCuts = [
                        'top-left', 'top-center', 'top-right',
                        'center-left', 'center-center', 'center-right',
                        'bottom-left', 'bottom-center', 'bottom-right',
                        'manual'
                    ];
                    if (array.indexOf(posShortCuts, placeAt) >= 0) {
                        if (placeAt === 'manual') {
                            // if you don't want the top-left, you must provide
                            // the full css selector or some in-line styling
                            placeAt = '.cmv-ui-map .cmv-ui-top-left';
                        } else {
                            placeAt = '.cmv-ui-inset .cmv-ui-' + placeAt;
                        }
                    }

                    // is it css selector?
                    var domNodes = domQuery(placeAt);
                    if (domNodes && domNodes.length > 0) {
                        placeAt = domNodes[0];
                    }
                }
            }
            // might also be a widget or the id of a widget or the id of a DOMNode
            return placeAt;
        },

        _getPosition: function (widgetConfig) {
            var position = widgetConfig.position;
            // default position
            if (position === null || typeof position === 'undefined') {
                if (widgetConfig.uiOptions) {
                    // for compatibility with 4.x api's use of 'index'
                    position = widgetConfig.uiOptions.index || 10000;
                } else {
                    position = 10000;
                }
            }
            return position;
        }
    });
});

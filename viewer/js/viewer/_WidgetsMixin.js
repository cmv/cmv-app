define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/promise/all',
    'dojo/Deferred',

    'put-selector',

    'dijit/Menu',
    'dijit/layout/ContentPane',

    'gis/dijit/FloatingTitlePane',
    'gis/dijit/FloatingWidgetDialog'

], function (
    declare,
    array,
    lang,
    aspect,
    promiseAll,
    Deferred,

    put,

    Menu,
    ContentPane,

    FloatingTitlePane,
    FloatingWidgetDialog
) {

    return declare(null, {

        legendLayerInfos: [],
        editorLayerInfos: [],
        identifyLayerInfos: [],
        layerControlLayerInfos: [],

        widgets: {},
        widgetTypes: ['titlePane', 'contentPane', 'floating', 'domNode', 'invisible', 'map', 'layer', 'layout', 'loading'],
        postConfig: function (wait) {

            var waitDeferred;
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
            if (this.mapDeferred) {
                this.mapDeferred.then(lang.hitch(this, 'createWidgets', ['map', 'layer']));
            }
            if (this.layoutDeferred) {
                promiseAll([this.mapDeferred, this.layoutDeferred])
                    .then(lang.hitch(this, 'createWidgets', null));
            }
        },

        createWidgets: function (widgetTypes) {
            var widgets = [],
                paneWidgets;

            widgetTypes = widgetTypes || this.widgetTypes;
            for (var key in this.config.widgets) {
                if (this.config.widgets.hasOwnProperty(key)) {
                    var widget = this.config.widgets[key];
                    widget.widgetKey = widget.widgetKey || widget.id || key;
                    if (widget.include && (!this.widgets[widget.widgetKey]) && (array.indexOf(widgetTypes, widget.type) >= 0)) {
                        widget.position = (typeof(widget.position) !== 'undefined') ? widget.position : 10000;
                        if ((widget.type === 'titlePane' || widget.type === 'contentPane') && !widget.placeAt) {
                            widget.placeAt = 'left';
                        }
                        widgets.push(widget);
                        this.widgets[key] = true; // will be replaced by actual widget once created
                    }
                }
            }

            function getPaneWidgets (pane) {
                paneWidgets = array.filter(widgets, function (paneWidget) {
                    return (paneWidget.placeAt && paneWidget.placeAt === pane);
                });
                return paneWidgets;
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
                    array.forEach(paneWidgets, function (paneWidget, i) {
                        this.widgetLoader(paneWidget, i);
                    }, this);
                }
            }
            paneWidgets = array.filter(widgets, function (paneWidget) {
                return !paneWidget.placeAt;
            });
            paneWidgets.sort(function (a, b) {
                return a.position - b.position;
            });
            var deferreds = [];
            array.forEach(paneWidgets, function (paneWidget, i) {
                var def = this.widgetLoader(paneWidget, i);
                if (def) {
                    deferreds.push(def);
                }
            }, this);
            return deferreds;
        },

        widgetLoader: function (widgetConfig, position) {
            var parentId, pnl;

            var widgetTypes = this.widgetTypes;
            // add any user-defined widget types
            widgetTypes = widgetTypes.concat(this.config.widgetTypes || []);
            // only proceed for valid widget types
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                this.handleError({
                    source: 'Controller',
                    error: 'Widget type "' + widgetConfig.type + '" (' + widgetConfig.title + ') at position ' + position + ' is not supported.'
                });
                return null;
            }

            if (position) {
                widgetConfig.position = position;
            }

            // build a titlePane or floating widget as the parent
            widgetConfig.watched = widgetConfig.watched || 'open';
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating')) {
                parentId = widgetConfig.widgetKey + '_parent';
                if (widgetConfig.type === 'titlePane') {
                    pnl = this._createTitlePaneWidget(parentId, widgetConfig);
                } else if (widgetConfig.type === 'contentPane') {
                    pnl = this._createContentPaneWidget(parentId, widgetConfig);
                    widgetConfig.preload = true;
                } else if (widgetConfig.type === 'floating') {
                    pnl = this._createFloatingWidget(parentId, widgetConfig);
                }
                widgetConfig.parentWidget = pnl;
                widgetConfig.preload = (widgetConfig.preload) || pnl.get(widgetConfig.watched) || (typeof(pnl.watch) !== 'function');
                this._showWidgetLoader(pnl);
            }

            var deferred = new Deferred();
            widgetConfig.preload = (typeof(widgetConfig.preload) === 'undefined') ? true : widgetConfig.preload;
            if (!widgetConfig.preload) {
                widgetConfig.watchHandle = pnl.watch(widgetConfig.watched, lang.hitch(this, '_loadWidget', widgetConfig, deferred));
            } else {
                this._loadWidget(widgetConfig, deferred);
            }
            return deferred;
        },

        _loadWidget: function (widgetConfig, deferred) {
            // 2 ways to use require to accommodate widgets that may have an optional separate configuration file
            if (typeof(widgetConfig.options) === 'string') {
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
            var pnl = options.parentWidget;
            var widgets = this.widgets;
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating')) {
                widgets[key] = new WidgetClass(options, put('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'domNode') {
                widgets[key] = new WidgetClass(options, widgetConfig.srcNodeRef);
            } else {
                widgets[key] = new WidgetClass(options);
            }
            // start up the widget
            if (widgets[key] && widgets[key].startup && !widgets[key]._started) {
                widgets[key].startup();
            }
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
            if (options.legendLayerInfos) {
                options.layerInfos = this.legendLayerInfos;
            }
            if (options.layerControlLayerInfos) {
                options.layerInfos = this.layerControlLayerInfos;
            }
            if (options.editorLayerInfos) {
                options.layerInfos = this.editorLayerInfos;
            }
            if (options.identifyLayerInfos) {
                options.layerInfos = this.identifyLayerInfos;
            }
            return options;
        },

        _showWidgetLoader: function (pnl) {
            if (pnl && pnl.containerNode) {
                pnl.loadingNode = put(pnl.containerNode, 'div.widgetLoader i.fa.fa-spinner.fa-pulse.fa-fw').parentNode;
            }
        },

        _hideWidgetLoader: function (pnl) {
            if (pnl && pnl.loadingNode) {
                require(['dojo/domReady!'], function () {
                    put(pnl.loadingNode, '!');
                });
            }
        },

        _createTitlePaneWidget: function (parentId, widgetConfig) {
            var tp,
                options = lang.mixin({
                    title: widgetConfig.title || 'Widget',
                    iconClass: widgetConfig.iconClass,
                    open: widgetConfig.open || false,
                    canFloat: widgetConfig.canFloat || false,
                    resizable: widgetConfig.resizable || false
                }, widgetConfig.paneOptions || {});
            if (parentId) {
                options.id = parentId;
            }
            var placeAt = widgetConfig.placeAt;
            if (typeof(placeAt) === 'string') {
                placeAt = this.panes[placeAt];
            }
            if (!placeAt) {
                placeAt = this.panes.left;
            }
            if (placeAt) {
                options.sidebar = placeAt;
                tp = new FloatingTitlePane(options).placeAt(placeAt, widgetConfig.position);
                tp.startup();
            }
            return tp;
        },

        _createFloatingWidget: function (parentId, widgetConfig) {
            var options = lang.mixin({
                title: widgetConfig.title,
                iconClass: widgetConfig.iconClass
            }, widgetConfig.paneOptions || {});
            if (parentId) {
                options.id = parentId;
            }
            var fw = new FloatingWidgetDialog(options);
            fw.startup();
            return fw;
        },

        _createContentPaneWidget: function (parentId, widgetConfig) {
            var cp,
                options = lang.mixin({
                    title: widgetConfig.title,
                    region: widgetConfig.region || 'center'
                }, widgetConfig.paneOptions || {});
            if (widgetConfig.className) {
                options.className = widgetConfig.className;
            }
            if (parentId) {
                options.id = parentId;
            }
            var placeAt = widgetConfig.placeAt;
            if (!placeAt) {
                placeAt = this.panes.left;
            } else if (typeof(placeAt) === 'string') {
                placeAt = this.panes[placeAt];
            }
            if (placeAt) {
                cp = new ContentPane(options).placeAt(placeAt);
                cp.startup();
            }
            return cp;
        }

    });
});

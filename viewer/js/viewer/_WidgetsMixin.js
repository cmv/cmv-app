define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',

    'put-selector',

    'dijit/Menu',
    'dijit/layout/ContentPane',

    'gis/dijit/FloatingTitlePane',
    'gis/dijit/FloatingWidgetDialog'

], function (
    declare,
    array,
    lang,

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

        initWidgets: function () {
            var widgets = [],
                paneWidgets;

            for (var key in this.config.widgets) {
                if (this.config.widgets.hasOwnProperty(key)) {
                    var widget = lang.clone(this.config.widgets[key]);
                    if (widget.include) {
                        widget.position = (typeof (widget.position) !== 'undefined') ? widget.position : 10000;
                        widgets.push(widget);
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
                if (this.panes.hasOwnProperty(pane) && (pane !== 'outer' || pane !== 'center')) {
                    paneWidgets = getPaneWidgets(pane);
                    paneWidgets.sort(function (a, b) {
                        return a.position - b.position;
                    });
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

            array.forEach(paneWidgets, function (paneWidget, i) {
                this.widgetLoader(paneWidget, i);
            }, this);
        },

        widgetLoader: function (widgetConfig, position) {
            var parentId, pnl;

            var widgetTypes = ['titlePane', 'contentPane', 'floating', 'domNode', 'invisible', 'map'];
            // add any user-defined widget types
            widgetTypes = widgetTypes.concat(this.config.widgetTypes || []);
            // only proceed for valid widget types
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                this.handleError({
                    source: 'Controller',
                    error: 'Widget type "' + widgetConfig.type + '" (' + widgetConfig.title + ') at position ' + position + ' is not supported.'
                });
                return;
            }

            if (position) {
                widgetConfig.position = position;
            }

            // build a titlePane or floating widget as the parent
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating') && (widgetConfig.id && widgetConfig.id.length > 0)) {
                parentId = widgetConfig.id + '_parent';
                if (widgetConfig.type === 'titlePane') {
                    pnl = this._createTitlePaneWidget(parentId, widgetConfig);
                } else if (widgetConfig.type === 'contentPane') {
                    pnl = this._createContentPaneWidget(parentId, widgetConfig);
                } else if (widgetConfig.type === 'floating') {
                    pnl = this._createFloatingWidget(parentId, widgetConfig);
                }
                widgetConfig.parentWidget = pnl;
            }

            // 2 ways to use require to accommodate widgets that may have an optional separate configuration file
            if (typeof (widgetConfig.options) === 'string') {
                require([widgetConfig.options, widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig));
            } else {
                require([widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig, widgetConfig.options));
            }
        },

        createWidget: function (widgetConfig, options, WidgetClass) {
            // set any additional options
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

            // create the widget
            var pnl = options.parentWidget;
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating')) {
                this[widgetConfig.id] = new WidgetClass(options, put('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'domNode') {
                this[widgetConfig.id] = new WidgetClass(options, widgetConfig.srcNodeRef);
            } else {
                this[widgetConfig.id] = new WidgetClass(options);
            }

            // start up the widget
            if (this[widgetConfig.id] && this[widgetConfig.id].startup && !this[widgetConfig.id]._started) {
                this[widgetConfig.id].startup();
            }
        },

        _createTitlePaneWidget: function (parentId, widgetConfig) {
            var tp,
                options = lang.mixin({
                    title: widgetConfig.title || 'Widget',
                    open: widgetConfig.open || false,
                    canFloat: widgetConfig.canFloat || false,
                    resizable: widgetConfig.resizable || false
                }, widgetConfig.paneOptions || {});
            if (parentId) {
                options.id = parentId;
            }
            var placeAt = widgetConfig.placeAt;
            if (typeof (placeAt) === 'string') {
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
                title: widgetConfig.title
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
                placeAt = this.panes.sidebar;
            } else if (typeof (placeAt) === 'string') {
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
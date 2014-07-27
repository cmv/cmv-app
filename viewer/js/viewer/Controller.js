define([
    'dojo/_base/declare',
    'esri/map',
    'dojo/dom-style',
    'dojo/dom-geometry',
    'dojo/dom-class',
    'dojo/on',
    'dojo/_base/array',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'gis/dijit/FloatingTitlePane',
    'dojo/_base/lang',
    'dojo/text!./templates/mapOverlay.html',
    'esri/IdentityManager',
    'gis/dijit/FloatingWidgetDialog',
    'put-selector',
    'dojo/aspect',
    'dojo/has',
    'dojo/window',
    'esri/dijit/PopupMobile'
], function(declare, Map, domStyle, domGeom, domClass, on, array, BorderContainer, ContentPane, FloatingTitlePane, lang, mapOverlay, IdentityManager, FloatingWidgetDialog, put, aspect, has, win, PopupMobile) {

    return {
        legendLayerInfos: [],
        editorLayerInfos: [],
        tocLayerInfos: [],
        panes: {
            left: {
                id: 'sidebarLeft',
                placeAt: 'outer',
                collapsible: true,
                region: 'left'
            },
            center: {
                id: 'mapCenter',
                placeAt: 'outer',
                region: 'center',
                content: mapOverlay
            }
        },
        collapseButtons: {},
        startup: function(config) {
            this.config = config;
            this.mapClickMode = {
                current: this.config.defaultMapClickMode,
                defaultMode: this.config.defaultMapClickMode
            };
            this.initPanes();
        },
        initPanes: function() {
            var key, panes = this.config.panes || {};
            for (key in this.panes) {
                if (this.panes.hasOwnProperty(key)) {
                    panes[key] = lang.mixin(this.panes[key], panes[key]);
                }
            }

            this.panes.outer = new BorderContainer({
                id: 'borderContainerOuter',
                design: 'sidebar',
                gutters: false
            }).placeAt(document.body);

            var options, placeAt, type;
            for (key in panes) {
                if (panes.hasOwnProperty(key)) {
                    options = lang.clone(panes[key]);
                    placeAt = this.panes[options.placeAt] || this.panes.outer;
                    options.id = options.id || key;
                    type = options.type;
                    delete options.placeAt;
                    delete options.type;
                    delete options.collapsible;
                    if (placeAt) {
                        if (type === 'border') {
                            this.panes[key] = new BorderContainer(options).placeAt(placeAt);
                        } else if (options.region) {
                            this.panes[key] = new ContentPane(options).placeAt(placeAt);
                        }
                    }
                }
            }
            this.panes.outer.startup();
            this.initMap();

            // where to place the buttons
            // either the center map pane or the outer pane?
            this.collapseButtonsPane = this.config.collapseButtonsPane || 'outer';

            for (key in panes) {
                if (panes.hasOwnProperty(key)) {
                    if (panes[key].collapsible) {
                        this.collapseButtons[key] = put(this.panes[this.collapseButtonsPane].domNode, 'div.sidebarCollapseButton.sidebar' + key + 'CollapseButton.sidebarCollapseButton' + ((key === 'bottom' || key === 'top') ? 'Vert' : 'Horz') + ' div.dijitIcon.button.close').parentNode;
                        on(this.collapseButtons[key], 'click', lang.hitch(this, 'togglePane', key));
                        this.positionSideBarToggle(key);
                        var splitter = this.panes[key]._splitterWidget;
                        if (splitter) {
                            aspect.after(splitter, '_startDrag', lang.hitch(this, 'splitterStartDrag', key));
                            aspect.after(splitter, '_stopDrag', lang.hitch(this, 'splitterStopDrag', key));
                        }
                    }
                }
            }

        },
        initMap: function() {
            if (!this.config.mapOptionsinfoWindow) {
                // simple feature detection. kinda like dojox/mobile without the overhead
                var box = win.getBox();
                if (has('touch') && (box.w < 768 || box.h < 768)) {
                    this.config.mapOptions.infoWindow = new PopupMobile(null, put('div'));
                }
            }
            this.map = new Map('mapCenter', this.config.mapOptions);

            if (this.config.mapOptions.basemap) {
                this.map.on('load', lang.hitch(this, 'initLayers'));
            } else {
                this.initLayers();
            }
            if (this.config.operationalLayers && this.config.operationalLayers.length > 0) {
                on.once(this.map, 'layers-add-result', lang.hitch(this, 'initWidgets'));
            } else {
                this.initWidgets();
            }
        },
        initLayers: function(evt) {
            this.map.on('resize', function(evt) {
                var pnt = evt.target.extent.getCenter();
                setTimeout(function() {
                    evt.target.centerAt(pnt);
                }, 100);
            });

            this.layers = [];
            var layerTypes = {
                csv: 'CSV',
                dynamic: 'ArcGISDynamicMapService',
                feature: 'Feature',
                georss: 'GeoRSS',
                image: 'ArcGISImageService',
                kml: 'KML',
                label: 'Label', //untested
                mapimage: 'MapImage', //untested
                osm: 'OpenStreetMap',
                tiled: 'ArcGISTiledMapService',
                wms: 'WMS',
                wmts: 'WMTS' //untested
            };
            // loading all the required modules first ensures the layer order is maintained
            var modules = [];
            array.forEach(this.config.operationalLayers, function(layer) {
                var type = layerTypes[layer.type];
                if (type) {
                    modules.push('esri/layers/' + type + 'Layer');
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
            }, this);
            require(modules, lang.hitch(this, function() {
                array.forEach(this.config.operationalLayers, function(layer) {
                    var type = layerTypes[layer.type];
                    if (type) {
                        require(['esri/layers/' + type + 'Layer'], lang.hitch(this, 'initLayer', layer));
                    }
                }, this);
                this.map.addLayers(this.layers);
            }));
        },
        initLayer: function(layer, Layer) {
            var l = new Layer(layer.url, layer.options);
            this.layers.unshift(l); // unshift instead of oush to keep layer ordering on map intact
            this.legendLayerInfos.unshift({
                layer: l,
                title: layer.title || null
            });
            this.tocLayerInfos.push({ //push because Legend and TOC need the layers in the opposite order
                layer: l,
                title: layer.title || null,
                slider: (layer.slider === false) ? false : true,
                noLegend: layer.noLegend || false,
                collapsed: layer.collapsed || false,
                sublayerToggle: layer.sublayerToggle || false
            });
            if (layer.type === 'feature') {
                var options = {
                    featureLayer: l
                };
                if (layer.editorLayerInfos) {
                    lang.mixin(options, layer.editorLayerInfos);
                }
                this.editorLayerInfos.push(options);
            }
        },
        initWidgets: function(evt) {
            var widgets = [];

            for (var key in this.config.widgets) {
                if (this.config.widgets.hasOwnProperty(key)) {
                    var widget = lang.clone(this.config.widgets[key]);
                    if (widget.include) {
                        widget.position = ('undefined' !== typeof(widget.position)) ? widget.position : 10000;
                        widgets.push(widget);
                    }
                }
            }

            widgets.sort(function(a, b) {
                return a.position - b.position;
            });

            array.forEach(widgets, function(widget, i) {
                this.widgetLoader(widget, i);
            }, this);
        },
        togglePane: function(id, show) {
            if (!this.panes[id]) {
                return;
            }
            var domNode = this.panes[id].domNode;
            if (domNode) {
                var disp = (show && typeof(show) === 'string') ? show : (domStyle.get(domNode, 'display') === 'none') ? 'block' : 'none';
                domStyle.set(domNode, 'display', disp);
                this.positionSideBarToggle(id);
                if (this.panes.outer) {
                    this.panes.outer.resize();
                }
            }
        },
        positionSideBarToggle: function(id) {
            var pane = this.panes[id];
            var btn = this.collapseButtons[id];
            if (!pane || !btn) {
                return;
            }
            var disp = domStyle.get(pane.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(btn.children[0], rCls);
            domClass.add(btn.children[0], aCls);

            // extra management required when the buttons
            // are not in the center map pane
            if (this.collapseButtonsPane === 'outer') {
                var pos = -1;
                var orie = (id === 'bottom' || id === 'top') ? 'h' : 'w';
                if (disp === 'block') { // pane is open
                    pos += domGeom.getMarginBox(pane.domNode)[orie];
                }
                if (pane._splitterWidget) { // account for a splitter
                    pos += domGeom.getMarginBox(pane._splitterWidget.domNode)[orie];
                }
                domStyle.set(btn, id, pos.toString() + 'px');
                domStyle.set(btn, 'display', 'block');
            }
        },
        splitterStartDrag: function (id) {
            this.togglePane(id, 'block');
            if (this.collapseButtonsPane === 'outer') {
                var btn = this.collapseButtons[id];
                domStyle.set(btn, 'display', 'none');
            }
        },
        splitterStopDrag: function (id) {
            this.positionSideBarToggle(id);
        },
        _createTitlePaneWidget: function(parentId, title, position, open, canFloat, placeAt) {
            var tp, options = {
                title: title || 'Widget',
                open: open || false,
                canFloat: canFloat || false
            };
            if (parentId) {
                options.id = parentId;
            }
            if (!placeAt) {
                placeAt = this.panes.left;
            } else if (typeof(placeAt) === 'string') {
                placeAt = this.panes[placeAt];
            }
            if (placeAt) {
                options.sidebar = placeAt;
                tp = new FloatingTitlePane(options).placeAt(placeAt, position);
                tp.startup();
            }
            return tp;
        },
        _createFloatingWidget: function(parentId, title) {
            var options = {
                title: title
            };
            if (parentId) {
                options.id = parentId;
            }
            var fw = new FloatingWidgetDialog(options);
            fw.startup();
            return fw;
        },
        _createContentPaneWidget: function(parentId, title, className, region, placeAt) {
            var cp, options = {
                title: title,
                region: region || 'center'
            };
            if (className) {
                options.className = className;
            }
            if (parentId) {
                options.id = parentId;
            }
            if (!placeAt) {
                placeAt = this.panes.sidebar;
            } else if (typeof(placeAt) === 'string') {
                placeAt = this.panes[placeAt];
            }
            if (placeAt) {
                cp = new ContentPane(options).placeAt(placeAt);
                cp.startup();
            }
            return cp;
        },
        widgetLoader: function(widgetConfig, position) {
            var parentId, pnl;

            // only proceed for valid widget types
            var widgetTypes = ['titlePane', 'contentPane', 'floating', 'domNode', 'invisible', 'map'];
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                console.log('Widget type ' + widgetConfig.type + ' (' + widgetConfig.title + ') at position ' + position + ' is not supported.');
                return;
            }

            // build a titlePane or floating widget as the parent
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating') && (widgetConfig.id && widgetConfig.id.length > 0)) {
                parentId = widgetConfig.id + '_parent';
                if (widgetConfig.type === 'titlePane') {
                    pnl = this._createTitlePaneWidget(parentId, widgetConfig.title, position, widgetConfig.open, widgetConfig.canFloat, widgetConfig.placeAt);
                } else if (widgetConfig.type === 'contentPane') {
                    pnl = this._createContentPaneWidget(parentId, widgetConfig.title, widgetConfig.className, widgetConfig.region, widgetConfig.placeAt);
                } else if (widgetConfig.type === 'floating') {
                    pnl = this._createFloatingWidget(parentId, widgetConfig.title);
                }
                widgetConfig.parentWidget = pnl;
            }

            // 2 ways to use require to accommodate widgets that may have an optional separate configuration file
            if (typeof(widgetConfig.options) === 'string') {
                require([widgetConfig.options, widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig));
            } else {
                require([widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig, widgetConfig.options));
            }
        },
        createWidget: function(widgetConfig, options, WidgetClass) {
            // set any additional options
            options.id = widgetConfig.id + '_widget';
            options.parentWidget = widgetConfig.parentWidget;

            if (options.map) {
                options.map = this.map;
            }
            if (options.mapClickMode) {
                options.mapClickMode = this.mapClickMode;
            }
            if (options.legendLayerInfos) {
                options.layerInfos = this.legendLayerInfos;
            }
            if (options.tocLayerInfos) {
                options.layerInfos = this.tocLayerInfos;
            }
            if (options.editorLayerInfos) {
                options.layerInfos = this.editorLayerInfos;
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
        }
    };
});
define([
    'dojo/_base/declare',
    'esri/map',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/on',
    'dojo/_base/array',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'gis/dijit/FloatingTitlePane',
    'dojo/_base/window',
    'dojo/_base/lang',
    'dojo/text!./templates/mapOverlay.html',
    'esri/IdentityManager',
    'gis/dijit/FloatingWidgetDialog'
], function(declare, Map, dom, domConstruct, domStyle, domClass, on, array, BorderContainer, ContentPane, FloatingTitlePane, win, lang, mapOverlay, IdentityManager, FloatingWidgetDialog) {

    return {
        legendLayerInfos: [],
        editorLayerInfos: [],
        tocLayerInfos: [],
        panes: {
            sidebar: {
                id: 'sidebar',
                placeAt: 'outer',
                className: 'sidebar',
                region: 'left'
            },
            map: {
                id: 'map',
                placeAt: 'outer',
                region: 'center',
                content: mapOverlay
            }
        },
        startup: function(config) {
            this.config = config;
            this.mapClickMode = {
                current: this.config.defaultMapClickMode,
                defaultMode: this.config.defaultMapClickMode
            };
            this.initPanes();
            this.initMap();
        },
        initPanes: function() {
            var panes = lang.mixin({}, this.panes, this.config.panes);
            this.panes.outer = new BorderContainer({
                id: 'borderContainer',
                design: 'sidebar',
                gutters: false
            }).placeAt(win.body());
            var options, placeAt, type;
            for (var key in panes) {
                if (panes.hasOwnProperty(key)) {
                    options = lang.clone(panes[key]);
                    placeAt = this.panes[options.placeAt] || this.panes.outer;
                    options.id = options.id || key;
                    type = options.type;
                    delete options.placeAt;
                    delete options.type;
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
            this.sideBarToggle = dom.byId('sidebarCollapseButton');
            if (this.panes.sidebar && !this.panes.sidebar.splitter) {
                this.positionSideBarToggle();
                on(this.sideBarToggle, 'click', lang.hitch(this, 'togglePane', 'sidebar'));
                domStyle.set(this.sideBarToggle, 'display', 'block');
            }
        },
        initMap: function() {
            this.map = new Map('map', this.config.mapOptions);

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
        togglePane: function(id) {
            if (!this.panes[id]) {
                return;
            }
            var domNode = this.panes[id].domNode;
            if (domNode) {
                var disp = (domStyle.get(domNode, 'display') === 'none') ? 'block' : 'none';
                domStyle.set(domNode, 'display', disp);
                if (id === 'sidebar') {
                    this.positionSideBarToggle();
                }
                if (this.panes.outer) {
                    this.panes.outer.resize();
                }
            }
        },
        positionSideBarToggle: function() {
            var disp = domStyle.get(this.panes.sidebar.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(this.sideBarToggle, rCls);
            domClass.add(this.sideBarToggle, aCls);
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
                placeAt = this.panes.sidebar;
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
                this[widgetConfig.id] = new WidgetClass(options, domConstruct.create('div')).placeAt(pnl.containerNode);
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
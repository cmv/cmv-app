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
    'config/viewer',
    'esri/IdentityManager',
    'gis/dijit/FloatingWidgetDialog'
], function(declare, Map, dom, domConstruct, domStyle, domClass, on, array, BorderContainer, ContentPane, FloatingTitlePane, win, lang, mapOverlay, config, IdentityManager, FloatingWidgetDialog) {

    return {
        config: config,
        legendLayerInfos: [],
        editorLayerInfos: [],
        tocLayerInfos: [],
        mapClickMode: {
            current: config.defaultMapClickMode,
            defaultMode: config.defaultMapClickMode
        },
        startup: function() {
            this.initView();
        },
        initView: function() {
            this.outer = new BorderContainer({
                id: 'borderContainer',
                design: 'headline',
                gutters: false
            }).placeAt(win.body());

            this.sidebar = new ContentPane({
                id: 'sidebar',
                region: 'left'
            }).placeAt(this.outer);

            new ContentPane({
                region: 'center',
                id: 'map',
                content: mapOverlay
            }).placeAt(this.outer);

            this.outer.startup();
            this.initMap();

            this.sideBarToggle = dom.byId('sidebarCollapseButton');
            this.positionSideBarToggle();
            on(this.sideBarToggle, 'click', lang.hitch(this, 'togglePane', 'sidebar'));
            domStyle.set(this.sideBarToggle, 'display', 'block');
        },
        initMap: function() {
            this.map = new Map('map', config.mapOptions);

            if (config.mapOptions.basemap) {
                this.map.on('load', lang.hitch(this, 'initLayers'));
            } else {
                this.initLayers();
            }
            if (config.operationalLayers && config.operationalLayers.length > 0) {
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
                csv: 'CSV', // untested
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
            array.forEach(config.operationalLayers, function(layer) {
                var type = layerTypes[layer.type];
                if (type) {
                    modules.push('esri/layers/' + type + 'Layer');
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
            }, this);
            require(modules, lang.hitch(this, function() {
                array.forEach(config.operationalLayers, function(layer) {
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
                slider: layer.slider || true,
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

            for (var key in config.widgets) {
                if (config.widgets.hasOwnProperty(key)) {
                    var widget = lang.clone(config.widgets[key]);
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
            if (!this[id]) {
                return;
            }
            var domNode = this[id].domNode;
            if (domNode) {
                var disp = (domStyle.get(domNode, 'display') === 'none') ? 'block' : 'none';
                domStyle.set(domNode, 'display', disp);
                this.positionSideBarToggle();
                this.outer.resize();
            }
        },
        positionSideBarToggle: function() {
            var disp = domStyle.get(this.sidebar.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(this.sideBarToggle, rCls);
            domClass.add(this.sideBarToggle, aCls);
        },
        _createTitlePaneWidget: function(title, position, open, canFloat, parentId) {
            var options = {
                title: title || 'Widget',
                open: open || false,
                canFloat: canFloat || false,
                sidebar: this.sidebar
            };
            if (parentId) {
                options.id = parentId;
            }
            var tp = new FloatingTitlePane(options).placeAt(this.sidebar, position);
            tp.startup();
            return tp;
        },
        _createFloatingWidget: function(title, parentId) {
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
        widgetLoader: function(widgetConfig, position) {
            var parentId, pnl;

            // only proceed for valid widget types
            var widgetTypes = ['titlePane', 'floating', 'domNode', 'invisible', 'map'];
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                console.log('Widget type ' + widgetConfig.type + ' (' + widgetConfig.title + ') at position ' + position + ' is not supported.');
                return;
            }

            // build a titlePane or floating widget as the parent
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'floating') && (widgetConfig.id && widgetConfig.id.length > 0)) {
                parentId = widgetConfig.id + '_parent';
                if (widgetConfig.type === 'titlePane') {
                    pnl = this._createTitlePaneWidget(widgetConfig.title, position, widgetConfig.open, widgetConfig.canFloat, parentId);
                } else if (widgetConfig.type === 'floating') {
                    pnl = this._createFloatingWidget(widgetConfig.title, parentId);
                }
                widgetConfig.parentWidget = pnl;
            }

            // 2 ways to use require to accomodate widgets that may have an optional separate configuration file
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
            if (widgetConfig.type === 'titlePane') {
                this[widgetConfig.id] = new WidgetClass(options, domConstruct.create('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'floating') {
                this[widgetConfig.id] = new WidgetClass(options, domConstruct.create('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'domNode') {
                this[widgetConfig.id] = new WidgetClass(options, widgetConfig.srcNodeRef);
            } else {
                this[widgetConfig.id] = new WidgetClass(options);
            }

            // start up the widget
            if (this[widgetConfig.id] && this[widgetConfig.id].startup) {
                this[widgetConfig.id].startup();
            }
        }
    };
});
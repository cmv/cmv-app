define([
    'esri/map',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/on',
    'dojo/_base/array',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'dijit/TitlePane',
    'dojo/_base/window',
    'dojo/_base/lang',
    'gis/dijit/Help',
    'dojo/text!./templates/mapOverlay.html',
    'viewer/config',
    'esri/IdentityManager',
    'gis/dijit/FloatingWidget'
], function(Map, dom, domConstruct, domStyle, domClass, on, array, BorderContainer, ContentPane, TitlePane, win, lang, Help, mapOverlay, config, IdentityManager, FloatingWidget) {

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

            on(dom.byId('helpA'), 'click', lang.hitch(this, 'showHelp'));
            this.sideBarToggle = dom.byId('sidebarCollapseButton');
            on(this.sideBarToggle, 'click', lang.hitch(this, 'toggleSidebar'));
            domStyle.set(this.sideBarToggle, 'display', 'block');
            this.domStore = dom.byId('sidebarStorage');
        },
        initMap: function() {
            this.map = new Map('map', config.mapOptions);

            this.map.on('load', lang.hitch(this, 'initLayers'));
            this.map.on('layers-add-result', lang.hitch(this, 'initWidgets'));

            // issue to fix: if using custom basemap, you need to load the basemap widget now or map::load will never fire

            // this.basemaps = new Basemaps({
            //     map: this.map,
            //     mode: config.basemapMode,
            //     title: 'Basemaps',
            //     mapStartBasemap: config.mapStartBasemap,
            //     basemapsToShow: config.basemapsToShow
            // }, 'basemapsDijit');
            // this.basemaps.startup();
        },
        initLayers: function(evt) {
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
                collapsed: layer.collapsed || false
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
        toggleSidebar: function() {
            if (this.outer.getIndexOfChild(this.sidebar) !== -1) {
                this.outer.removeChild(this.sidebar);
                this.domStore.appendChild(this.sidebar.domNode);
                domClass.remove(this.sideBarToggle, 'close');
                domClass.add(this.sideBarToggle, 'open');
            } else {
                this.domStore.removeChild(this.sidebar.domNode);
                this.outer.addChild(this.sidebar);
                domClass.remove(this.sideBarToggle, 'open');
                domClass.add(this.sideBarToggle, 'close');
            }
        },
        _createTitlePaneWidget: function(title, position, open, parentId) {
            var options = {
                title: title,
                open: open
            };
            if (parentId) {
                options.id = parentId;
            }
            var tp = new TitlePane(options).placeAt(this.sidebar, position);
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
            var fw = new FloatingWidget(options);
            fw.startup();
            return fw;
        },
        showHelp: function() {
            if (this.help) {
                this.help.show();
            } else {
                this.help = new Help();
                this.help.show();
            }
        },
        widgetLoader: function(widgetConfig, position) {
            var parentId;
            if (widgetConfig.options.map) {
                widgetConfig.options.map = this.map;
            }
            if (widgetConfig.options.mapClickMode) {
                widgetConfig.options.mapClickMode = this.mapClickMode;
            }
            if (widgetConfig.options.legendLayerInfos) {
                widgetConfig.options.layerInfos = this.legendLayerInfos;
            }
            if (widgetConfig.options.tocLayerInfos) {
                widgetConfig.options.layerInfos = this.tocLayerInfos;
            }
            if (widgetConfig.options.editorLayerInfos) {
                widgetConfig.options.layerInfos = this.editorLayerInfos;
            }
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'floating') && (widgetConfig.id && widgetConfig.id.length > 0)) {
                widgetConfig.options.id = widgetConfig.id + '_widget';
                parentId = widgetConfig.id + '_parent';
            }
            if (widgetConfig.type === 'titlePane') {
                var tp = this._createTitlePaneWidget(widgetConfig.title, position, widgetConfig.open, parentId);
                widgetConfig.options.parentWidget = tp;
                require([widgetConfig.path], lang.hitch(this, function(WidgetClass) {
                    this[widgetConfig.id] = new WidgetClass(widgetConfig.options, domConstruct.create('div')).placeAt(tp.containerNode);
                    this[widgetConfig.id].startup();
                }));
            } else if (widgetConfig.type === 'floating') {
                var fw = this._createFloatingWidget(widgetConfig.title, parentId);
                widgetConfig.options.parentWidget = fw;
                require([widgetConfig.path], lang.hitch(this, function(WidgetClass) {
                    this[widgetConfig.id] = new WidgetClass(widgetConfig.options, domConstruct.create('div')).placeAt(fw.containerNode);
                    this[widgetConfig.id].startup();
                }));
            } else if (widgetConfig.type === 'domNode') {
                require([widgetConfig.path], lang.hitch(this, function(WidgetClass) {
                    this[widgetConfig.id] = new WidgetClass(widgetConfig.options, widgetConfig.srcNodeRef);
                    this[widgetConfig.id].startup();
                }));
            } else if (widgetConfig.type === 'invisible') {
                require([widgetConfig.path], lang.hitch(this, function(WidgetClass) {
                    this[widgetConfig.id] = new WidgetClass(widgetConfig.options);
                    this[widgetConfig.id].startup();
                }));
            } else if (widgetConfig.type === 'map') {
                require([widgetConfig.path], lang.hitch(this, function(WidgetClass) {
                    this[widgetConfig.id] = new WidgetClass(widgetConfig.options);
                    if (this[widgetConfig.id].startup) {
                        this[widgetConfig.id].startup();
                    }
                }));
            } else {
                console.log('Widget type: ' + widgetConfig.widgetType + ' not supported');
            }
        }
    };
});
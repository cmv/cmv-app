define([
        'esri/map',
        'esri/dijit/Geocoder',
        'esri/layers/FeatureLayer',
        'esri/layers/osm',
        'dojo/dom',
        'dojo/dom-construct',
        'dojo/dom-style',
        'dojo/dom-class',
        'dojo/on',
        'dojo/parser',
        'dojo/_base/array',
        'dijit/layout/BorderContainer',
        'dijit/layout/ContentPane',
        'dijit/TitlePane',
        'dojo/_base/window',
        'dojo/_base/lang',
        'gis/dijit/Growler',
        'gis/dijit/GeoLocation',
        'gis/dijit/Help',
        'gis/dijit/Basemaps',
        'dojo/text!./templates/mapOverlay.html',
        'viewer/config',
        'dojo/domReady!',
        'esri/IdentityManager',
        'esri/tasks/GeometryService'
], function(Map, Geocoder, FeatureLayer, osm, dom, domConstruct, Style, domClass, on, parser, array, BorderContainer, ContentPane, TitlePane, win, lang, Growler, GeoLocation, Help, Basemaps, mapOverlay, config, ready, IdentityManager, GeometryService) {
    return {
        config: config,
        legendLayerInfos: [],
        editorLayerInfos: [],
        startup: function() {
            this.initConfig();
            this.initView();
            app=this;
        },
        initConfig: function() {
            esri.config.defaults.io.proxyUrl = config.proxy.url;
            esri.config.defaults.io.alwaysUseProxy = config.proxy.alwaysUseProxy;
            esri.config.defaults.geometryService = new GeometryService(config.geometryService.url);
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
            Style.set(this.sideBarToggle, 'display', 'block');
        },
        initMap: function() {
            this.map = new esri.Map("map", {
                extent: new esri.geometry.Extent(config.initialExtent)
            });

            this.map.on('load', lang.hitch(this, 'initWidgets'));

            this.basemaps = new Basemaps({
                map: this.map,
                mode: config.basemapMode,
                title: "Basemaps",
                mapStartBasemap: config.mapStartBasemap,
                basemapsToShow: config.basemapsToShow
            }, "basemapsDijit");
            this.basemaps.startup();
        },
        initWidgets: function(evt) {
            array.forEach(config.operationalLayers, function(layer) {
                var l;
                if (layer.type == 'dynamic') {
                    l = new esri.layers.ArcGISDynamicMapServiceLayer(layer.url, layer.options);
                } else if (layer.type == 'tiled') {
                    l = new esri.layers.ArcGISTiledMapServiceLayer(layer.url, layer.options);
                } else if (layer.type == 'feature') {
                    l = new esri.layers.FeatureLayer(layer.url, layer.options);
                    var options = {
                        featureLayer: l
                    };
                    if (layer.editorLayerInfos) {
                        lang.mixin(options, layer.editorLayerInfos);
                    }
                    this.editorLayerInfos.push(options);
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
                this.map.addLayer(l);
                this.legendLayerInfos.push({
                    layer: l,
                    title: layer.title || null
                });
            }, this);

            this.growler = new Growler({}, "growlerDijit");
            this.growler.startup();

            this.geoLocation = new GeoLocation({
                map: this.map,
                growler: this.growler
            }, "geoLocationDijit");
            this.geoLocation.startup();

            this.geocoder = new esri.dijit.Geocoder({
                map: this.map,
                autoComplete: true
            }, "geocodeDijit");
            this.geocoder.startup();

            if (config.widgets.scalebar && config.widgets.scalebar.include) {
                require(['esri/dijit/Scalebar'], lang.hitch(this, function(Scalebar) {
                    new Scalebar({
                        map: this.map,
                        attachTo: config.widgets.scalebar.options.attachTo,
                        scalebarStyle: config.widgets.scalebar.options.scalebarStyle,
                        scalebarUnit: config.widgets.scalebar.options.scalebarUnit
                    });
                }));
            }

            if (config.widgets.bookmarks && config.widgets.bookmarks.include) {
                var bookmarksTP = this._createTitlePane(config.widgets.bookmarks.title, config.widgets.bookmarks.position, config.widgets.bookmarks.open);
                require(['gis/dijit/Bookmarks'], lang.hitch(this, function(Bookmarks) {
                    this.bookmarks = new Bookmarks({
                        map: this.map,
                        editable: true
                    }, domConstruct.create("div")).placeAt(bookmarksTP.containerNode);
                }));
            }

            if (config.widgets.draw && config.widgets.draw.include) {
                var drawTP = this._createTitlePane(config.widgets.draw.title, config.widgets.draw.position, config.widgets.draw.open);
                require(['gis/dijit/Draw'], lang.hitch(this, function(Draw) {
                    this.drawWidget = new Draw({
                        map: this.map
                    }, domConstruct.create("div")).placeAt(drawTP.containerNode);
                }));
            }

            if (config.widgets.measure && config.widgets.measure.include) {
                var measureTP = this._createTitlePane(config.widgets.measure.title, config.widgets.measure.position, config.widgets.measure.open);
                require(['esri/dijit/Measurement'], lang.hitch(this, function(Measurement) {
                    this.measure = new Measurement({
                        map: this.map,
                        defaultAreaUnit: config.widgets.measure.defaultAreaUnit,
                        defaultLengthUnit: config.widgets.measure.defaultLengthUnit
                    }, domConstruct.create("div")).placeAt(measureTP.containerNode);
                }));
            }

            if (config.widgets.print && config.widgets.print.include) {
                var printTP = this._createTitlePane(config.widgets.print.title, config.widgets.print.position, config.widgets.print.open);
                require(['gis/dijit/Print'], lang.hitch(this, function(Print) {
                    this.printWidget = new Print({
                        map: this.map,
                        printTaskURL: config.widgets.print.serviceURL,
                        authorText: config.widgets.print.authorText,
                        copyrightText: config.widgets.print.copyrightText,
                        defaultTitle: config.widgets.print.defaultTitle,
                        defaultFormat: config.widgets.print.defaultFormat,
                        defaultLayout: config.widgets.print.defaultLayout
                    }, domConstruct.create("div")).placeAt(printTP.containerNode);
                }));
            }

            if (config.widgets.directions && config.widgets.directions.include) {
                var directionsTP = this._createTitlePane(config.widgets.directions.title, config.widgets.directions.position, config.widgets.directions.open);
                require(['gis/dijit/Directions'], lang.hitch(this, function(Directions) {
                    this.directionsWidget = new Directions({
                        map: this.map,
                        options: config.widgets.directions.options,
                        titlePane: directionsTP
                    }, domConstruct.create("div")).placeAt(directionsTP.containerNode);
                }));
            }

            if (config.widgets.legend && config.widgets.legend.include) {
                var legendTP = this._createTitlePane(config.widgets.legend.title, config.widgets.legend.position, config.widgets.legend.open);
                require(['esri/dijit/Legend'], lang.hitch(this, function(Legend) {
                    this.legend = new Legend({
                        map: this.map,
                        layerInfos: this.legendLayerInfos
                    }, domConstruct.create("div")).placeAt(legendTP.containerNode);
                }));
            }

            if (config.widgets.editor && config.widgets.editor.include) {
                var editorTP = this._createTitlePane(config.widgets.editor.title, config.widgets.editor.position, config.widgets.editor.open);
                require(['gis/dijit/Editor'], lang.hitch(this, function(Editor) {
                    this.editor = new Editor({
                        map: this.map,
                        layerInfos: this.editorLayerInfos,
                        settings: config.widgets.editor.settings,
                        titlePane: editorTP
                    }, domConstruct.create("div")).placeAt(editorTP.containerNode);
                }));
            }

            if (config.widgets.toc && config.widgets.toc.include) {
                var tocTP = this._createTitlePane(config.widgets.toc.title, config.widgets.toc.position, config.widgets.toc.open);
                require(['gis/dijit/TOC'], lang.hitch(this, function(TOC) {
                    this.toc = new TOC({
                        map: this.map,
                        layerInfos: this.legendLayerInfos
                    }, domConstruct.create("div")).placeAt(tocTP.containerNode);
                }));
            }
        },
        toggleSidebar: function() {
            if (this.outer.getIndexOfChild(this.sidebar) !== -1) {
                this.outer.removeChild(this.sidebar);
                domClass.remove(this.sideBarToggle, 'close');
                domClass.add(this.sideBarToggle, 'open');
            } else {
                this.outer.addChild(this.sidebar);
                domClass.remove(this.sideBarToggle, 'open');
                domClass.add(this.sideBarToggle, 'close');
            }
        },
        _createTitlePane: function(title, position, open) {
            var tp = new TitlePane({
                title: title,
                open: open
            }).placeAt(this.sidebar, position);
            //domClass.add(tp.domNode, 'titlePaneBottomFix titlePaneRightFix');
            tp.startup();
            return tp;
        },
        showHelp: function() {
            if (this.help) {
                this.help.show();
            } else {
                this.help = new Help();
                this.help.show();
            }
        }
    };
});
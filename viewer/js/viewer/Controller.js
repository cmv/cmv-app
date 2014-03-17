define([
    'esri/map',
    'esri/dijit/Geocoder',
    'esri/graphic',  //lcs - MapTips
    'esri/lang',  //lcs - MapTips
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
    'dijit/popup',  //lcs - MapTips
    'dijit/TooltipDialog',  //lcs - MapTips
    'dojo/_base/window',
    'dojo/_base/lang',
    'gis/dijit/Growler',
    'gis/dijit/GeoLocation',
    'gis/dijit/Help',
    'gis/dijit/Basemaps',
    'dojo/text!./templates/mapOverlay.html',
    'viewer/config',
    'esri/IdentityManager',
    'esri/tasks/GeometryService'
], function(Map, Geocoder, Graphic, esriLang, FeatureLayer, osm, dom, domConstruct, Style, domClass, on, parser, array, BorderContainer, ContentPane, TitlePane, dijitPopup, TooltipDialog, win, lang, Growler, GeoLocation, Help, Basemaps, mapOverlay, config, IdentityManager, GeometryService) {
    return {
        config: config,
        legendLayerInfos: [],
        tocLayerInfos: [],  //lcs - to make the legend agree with the TOC
        editorLayerInfos: [],
        startup: function() {
            this.initConfig();
            this.initView();
            app = this; //dev only
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

            this.map.on('load', lang.hitch(this, 'initLayers'));
            this.map.on('layers-add-result', lang.hitch(this, 'initWidgets'));

            this.basemaps = new Basemaps({
                map: this.map,
                mode: config.basemapMode,
                title: "Basemaps",
                mapStartBasemap: config.mapStartBasemap,
                basemapsToShow: config.basemapsToShow
            }, "basemapsDijit");
            this.basemaps.startup();
        },
        initLayers: function(evt) {
            //lcs - MapTips BEGIN
            var dialog = new TooltipDialog({
                id: "tooltipDialog",
                style: "position: absolute; max-width: 300px; font: normal normal normal 10pt 'Comic Sans MS'; z-index: 100"
            });
            dialog.startup();
            //lcs - MapTips END
            this.layers = [];
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
                    //lcs - MapTips BEGIN
                    gl = new esri.layers.GraphicsLayer({ id: layer.options.id + '-graphics' });
                    this.layers.unshift(gl);  //lcs - Put the graphic layer below the feature layer
                    gl.on("mouse-out", function (mouseOutEvent){
                        gl.clear();
                        dijitPopup.close(dialog);
                    });
                    l.on("mouse-over", function(mouseOverEvent){
                        var showMapTips = dom.byId('chkMapTips').checked;
                        if (showMapTips) {
                            var content = esriLang.substitute(mouseOverEvent.graphic.attributes, layer.mapTip);
                            content = content.replace(/\<b\>\<\/b\>/g,"<b>" + layer.mapTipNoValue + "<\/b>"); 
                            var highlightGraphic = new Graphic(mouseOverEvent.graphic.geometry, layer.highlightSymbol);
                            gl.add(highlightGraphic);

                            dialog.setContent(content);

                            Style.set(dialog.domNode, "opacity", 0.85);
                            dijitPopup.open({
                                popup: dialog, 
                                x: mouseOverEvent.pageX + 10,
                                y: mouseOverEvent.pageY + 10
                            });
                        }
                    });
                    //lcs - MapTips END
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
                //lcs this.layers.push(l);
                this.layers.unshift(l);  //lcs - Changed from push() to unshift() so the layers can be listed from top to bottom in config.js
                this.legendLayerInfos.unshift({  //lcs - Changed from push() to unshift() so the Legend and TOC agree
                    layer: l,
                    title: layer.title || null,
                    slider: true,
                    noLegend: false,
                    collapsed: false
                });
                this.tocLayerInfos.push({  //lcs - Added this because Legend and TOC need the layers in the opposite order
                    layer: l,
                    title: layer.title || null,
                    slider: true,
                    noLegend: false,
                    collapsed: false
                });
            }, this);
            this.map.addLayers(this.layers);

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
        },
        initWidgets: function(evt) {

            if (config.widgets.scalebar && config.widgets.scalebar.include) {
                require(['esri/dijit/Scalebar'], lang.hitch(this, function(Scalebar) {
                    this.scalebar = new Scalebar({
                        map: this.map,
                        attachTo: config.widgets.scalebar.options.attachTo,
                        scalebarStyle: config.widgets.scalebar.options.scalebarStyle,
                        scalebarUnit: config.widgets.scalebar.options.scalebarUnit
                    });
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

            if (config.widgets.TOC && config.widgets.TOC.include) {
                var TOCTP = this._createTitlePane(config.widgets.TOC.title, config.widgets.TOC.position, config.widgets.TOC.open);
                require(['gis/dijit/TOC'], lang.hitch(this, function(TOC) {
                    this.toc = new TOC({
                        map: this.map,
                        layerInfos: this.tocLayerInfos  //lcs - to make the legend agree with the TOC
                    }, domConstruct.create("div")).placeAt(TOCTP.containerNode);
                    this.toc.startup();
                }));
            }

            if (config.widgets.bookmarks && config.widgets.bookmarks.include) {
                var bookmarksTP = this._createTitlePane(config.widgets.bookmarks.title, config.widgets.bookmarks.position, config.widgets.bookmarks.open);
                require(['gis/dijit/Bookmarks'], lang.hitch(this, function(Bookmarks) {
                    this.bookmarks = new Bookmarks({
                        map: this.map,
                        editable: true
                    }, domConstruct.create("div")).placeAt(bookmarksTP.containerNode);
                    this.bookmarks.startup();
                }));
            }

            if (config.widgets.draw && config.widgets.draw.include) {
                var drawTP = this._createTitlePane(config.widgets.draw.title, config.widgets.draw.position, config.widgets.draw.open);
                require(['gis/dijit/Draw'], lang.hitch(this, function(Draw) {
                    this.drawWidget = new Draw({
                        map: this.map
                    }, domConstruct.create("div")).placeAt(drawTP.containerNode);
                    this.drawWidget.startup();
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
                    this.measure.startup();
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
                    this.printWidget.startup();
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
                    this.directionsWidget.startup();
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
                    this.editor.startup();
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
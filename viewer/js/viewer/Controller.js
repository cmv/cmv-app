define([
    'esri/map',
    'esri/dijit/Popup',
    'esri/dijit/Geocoder',
    'esri/dijit/Attribution',
    'esri/layers/FeatureLayer',
    "esri/dijit/Legend",
    "esri/layers/osm",
    "esri/dijit/Measurement",
    'dojo/dom',
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-class",
    'dojo/on',
    'dojo/parser',
    "dojo/_base/array",
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    "dijit/TitlePane",
    "dojo/_base/window",
    "dojo/_base/lang",
    "gis/dijit/Print",
    "gis/dijit/Growler",
    "gis/dijit/GeoLocation",
    "gis/dijit/Draw",
    "gis/dijit/Help",
    "gis/dijit/Basemaps",
    "dojo/text!./templates/leftContent.html",
    "dojo/text!./templates/mapOverlay.html",
    "viewer/config",
    "dojo/domReady!"], function(Map, Popup, Geocoder, Attribution, FeatureLayer, Legend, osm, Measurement, dom, domConstruct, Style, domClass, on, parser, array, BorderContainer, ContentPane, TitlePane, win, lang, Print, Growler, GeoLocation, Draw, Help, Basemaps, leftContent, mapOverlay, config) {
    return {
        config: config,
        layerInfos: [],
        startup: function() {
            this.initConfig();
            this.initView();
        },
        initConfig: function() {
            esriConfig.defaults.io.proxyUrl = config.proxy.url;
            esriConfig.defaults.io.alwaysUseProxy = config.proxy.alwaysUseProxy;
        },
        initView: function() {
            this.outer = new BorderContainer({
                id: 'borderContainer',
                design: 'headline',
                gutters: false
            }).placeAt(win.body());

            this.sidebar = new ContentPane({
                id: 'sidebar',
                region: 'left',
                content: leftContent
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
            var popup = new esri.dijit.Popup(null, domConstruct.create("div"));

            this.map = new esri.Map("map", {
                basemap: config.defaultBasemap,
                extent: new esri.geometry.Extent(config.initialExtent),
                infoWindow: popup
            });

            this.map.on('load', lang.hitch(this, 'initWidgets'));

            array.forEach(config.operationalLayers, function(layer) {
                var l;
                if (layer.type == 'dynamic') {
                    l = new esri.layers.ArcGISDynamicMapServiceLayer(layer.url, layer.options);
                    this.map.addLayer(l);
                } else if (layer.type == 'tiled') {
                    l = new esri.layers.ArcGISTiledMapServiceLayer(layer.url, layer.options);
                    this.map.addLayer(l);
                } else if (layer.type == 'feature') {
                    l = new esri.layers.FeatureLayer(layer.url, layer.options);
                    this.map.addLayer(l);
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
                this.layerInfos.push({
                    layer: l,
                    title: layer.options.title || null
                });
            }, this);
        },
        initWidgets: function(evt) {
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

            this.basemaps = new Basemaps({
                map: this.map,
                title: "Basemaps",
                mapStartBasemap: config.defaultBasemap,
                basemaps: config.basemaps
            }, "basemapsDijit");
            this.basemaps.startup();

            this.printWidget = new Print({
                map: this.map,
                printTaskURL: config.printTask.url,
                authorText: config.printTask.authorText,
                copyrightText: config.printTask.copyrightText,
                defaultTitle: config.printTask.defaultTitle,
                defaultFormat: config.printTask.defaultFormat,
                defaultLayout: config.printTask.defaultLayout
            }, 'printDijit');
            this.printWidget.startup();

            this.drawWidget = new Draw({
                map: this.map
            }, 'drawDijit');
            this.drawWidget.startup();

            this.legend = new esri.dijit.Legend({
                map: this.map,
                layerInfos: this.layerInfos
            }, "legendDijit");
            this.legend.startup();

            this.measure = new esri.dijit.Measurement({
                map: this.map,
                defaultAreaUnit: config.measurement.defaultAreaUnit,
                defaultLengthUnit: config.measurement.defaultLengthUnit
            }, "measuremnetDijit");
            this.measure.startup();
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
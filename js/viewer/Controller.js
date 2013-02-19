define([
    'esri/map',
    'esri/dijit/Popup',
    'esri/dijit/Geocoder',
    'esri/dijit/Attribution',
    'esri/layers/FeatureLayer',
    "esri/dijit/Legend",
    'dojo/dom',
    "dojo/dom-construct",
    'dojo/on',
    'dojo/parser',
    "dojo/_base/array",
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    "dijit/TitlePane",
    'dojo/_base/window',
    'dojo/_base/lang',
    "dojo/_base/Deferred",
    'gis/dijit/Print',
    'gis/dijit/Growler',
    'gis/dijit/GeoLocation',
    'gis/dijit/Draw',
    "dojo/text!./templates/leftContent.html",
    "dojo/text!./templates/mapOverlay.html",
    "viewer/config",
    'dojo/domReady!'
    ], function(Map, Popup, Geocoder, Attribution, FeatureLayer, Legend, dom, domConstruct, on, parser, array, BorderContainer, ContentPane, TitlePane, win, lang, Deferred, Print, Growler, GeoLocation, Draw, leftContent, mapOverlay, config) {
    return {
        config: config,
        startup: function() {
            this.initConfig();
            this.initView();
        },
        initConfig: function() {
            esriConfig.defaults.io.proxyUrl = config.proxy.url;
            esriConfig.defaults.io.alwaysUseProxy = config.proxy.alwaysUseProxy;
        },
        initView: function() {
            outer = new BorderContainer({
                id: 'borderContainer',
                design: 'headline',
                gutters: false
            }).placeAt(win.body());

            left = new ContentPane({
                id: 'leftPane',
                region: 'left',
                content: leftContent
            }).placeAt(outer);

            new ContentPane({
                region: 'center',
                id: 'map',
                content: mapOverlay
            }).placeAt(outer);

            outer.startup();
            this.initMap();
        },
        initMap: function() {
            var popup = new esri.dijit.Popup(null, domConstruct.create("div"));

            this.map = new esri.Map("map", {
                basemap: config.basemap,
                extent: new esri.geometry.Extent(config.initialExtent),
                infoWindow: popup
            });

            this.map.on('load', lang.hitch(this, 'initWidgets'));

            array.forEach(config.operationalLayers, function(layer) {
                if(layer.type == 'dynamic') {
                    l = new esri.layers.ArcGISDynamicMapServiceLayer(layer.url, layer.options);
                    this.map.addLayer(l);
                } else if(layer.type == 'tiled') {
                    l = new esri.layers.ArcGISTiledMapServiceLayer(layer.url, layer.options);
                    this.map.addLayer(l);
                } else if(layer.type == 'feature') {
                    l = new esri.layers.FeatureLayer(layer.url, layer.options);
                    this.map.addLayer(l);
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
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
            }, "search");
            this.geocoder.startup();

            this.printWidget = new Print({
                map: this.map,
                printTaskURL: config.printTask.url,
                authorText: config.printTask.authorText,
                copyrightText: config.printTask.copyrightText
            }, 'printDijit');
            this.printWidget.startup();

            this.drawWidget = new Draw({
                map: this.map
            }, 'drawDijit');
            this.drawWidget.startup();

            this.legend = new esri.dijit.Legend({
                map: this.map
            }, "legendDijit");
            this.legend.startup();
        }
    };
});
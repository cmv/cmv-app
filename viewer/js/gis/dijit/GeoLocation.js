define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dojo/_base/lang",
    "dojo/string",
    "dojo/text!./GeoLocation/templates/GeoLocation.html",
    "dojo/text!./GeoLocation/templates/stats.html"
    ], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, lang, string, geoLocationTemplate, statsTemplate) {

    //anonymous function to load CSS files required for this module
    (function() {
        var css = [require.toUrl("gis/dijit/GeoLocation/css/GeoLocation.css")];
        var head = document.getElementsByTagName("head").item(0),
            link;
        for(var i = 0, il = css.length; i < il; i++) {
            link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = css[i].toString();
            head.appendChild(link);
        }
    }());

    // main geolocation widget
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: geoLocationTemplate,
        widgetsInTemplate: true,
        baseClass: 'gis_GeoLocation_Dijit',
        buttonClass: 'geoLocationButton',
        postCreate: function() {
            this.inherited(arguments);
            this.symbol = new esri.symbol.PictureMarkerSymbol(require.toUrl("gis/dijit/GeoLocation/images/bluedot.png"), 38, 38);
            this.graphics = new esri.layers.GraphicsLayer({
                id: 'GeoLocationGraphics',
                title: "GPS Location"
            });
            this.map.addLayer(this.graphics);
        },
        geoLocate: function() {
            if(navigator && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(lang.hitch(this, 'locationSuccess'), lang.hitch(this, 'locationError'));
            } else {
                if(this.growler) {
                    this.growler.growl({
                        title: "Error",
                        message: "Geolocation not supported by your browser."
                    });
                } else {
                    alert("Geolocation not supported by your browser.");
                }
            }
        },
        locationSuccess: function(event) {
            this.graphics.clear();
            var point = esri.geometry.Point(event.coords.longitude, event.coords.latitude, new esri.SpatialReference({
                wkid: 4326
            }));
            var wmPoint = esri.geometry.geographicToWebMercator(point);
            this.map.centerAndZoom(wmPoint, 14);
            this.addGraphic(wmPoint);
            if(this.growler) {
                var stats = {
                    accuracy: (event.coords.accuracy) ? event.coords.accuracy : '',
                    altitude: (event.coords.altitude) ? event.coords.altitude : '',
                    altitudeAccuracy: (event.coords.altitudeAccuracy) ? event.coords.altitudeAccuracy : '',
                    heading: (event.coords.heading) ? event.coords.heading : '',
                    latitude: (event.coords.latitude) ? event.coords.latitude : '',
                    longitude: (event.coords.longitude) ? event.coords.longitude : '',
                    speed: (event.coords.speed) ? event.coords.speed : ''
                };
                this.growler.growl({
                    title: "Position Information",
                    message: string.substitute(statsTemplate, stats)
                });
            }
        },
        locationError: function(error) {
            if(this.growler) {
                this.growler.growl({
                    title: "Error",
                    message: "There was a problem with getting your location: " + error.message
                });
            } else {
                alert("There was a problem with getting your location: " + error.message);
            }
        },
        addGraphic: function(geometry) {
            var graphic = new esri.Graphic(geometry, this.symbol);
            this.graphics.add(graphic);
        }
    });
});
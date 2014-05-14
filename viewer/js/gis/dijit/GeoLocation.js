define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Button',
    'dojo/_base/lang',
    'dojo/string',
    'dojo/text!./GeoLocation/templates/GeoLocation.html',
    'dojo/text!./GeoLocation/templates/stats.html',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/PictureMarkerSymbol',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/SpatialReference',
    'esri/geometry/webMercatorUtils',
    'esri/tasks/ProjectParameters',
    'esri/geometry/Point',
    'esri/config',
    'xstyle/css!./GeoLocation/css/GeoLocation.css'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, lang, string, geoLocationTemplate, statsTemplate, SimpleRenderer, PictureMarkerSymbol, GraphicsLayer, Graphic, SpatialReference, webMercatorUtils, ProjectParameters, Point, esriConfig, css) {

    // main geolocation widget
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: geoLocationTemplate,
        widgetsInTemplate: true,
        baseClass: 'gis_GeoLocation_Dijit',
        buttonClass: 'geoLocationButton',
        postCreate: function() {
            this.inherited(arguments);
            // converted image to base64 encoding with : http://www.base64-image.de
            var symbol = new PictureMarkerSymbol('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAmCAYAAACoPemuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABJhJREFUeNrcmN9PW2UYx7/n9ATKj7QMMUCxmSxlCRI3BzF6MRO9WOyVN5sJFxqvNCa7MmbphTG78Iprwx+weEMiF8bdLNFojBhNDEwu3ObWjo2uLUXKaIFSCqdnz7e8hx1WdOcUij+e5ElLOe3zyfd93ud9nlezLAte7LOv0S4vZ8VPi0eU72dx5bPiU+Jr9j8+fevpcTS3YALUIy/viUdRn10TvyK+cChgTwL5dOCZNqA7CARbgIB//+8VSkB+A8jmgdw6YFb2AgrcQt1gAsUli4m3E6gnAAx0A61N3qQqloE7WZGqsAvIZR0TuCnPYAJ1UV4u8H2oAzhZB9B+gLcFML2y+9GkwI27BhOomL10g71AfxcO1eaWgJuZx0srcGNPBbOV4tK9emInjxphzL9f7u4ubY1y+j45VV2+RkLR+NuMoeyCil0LpnZfzF6+RkI54RhLWUwx1CjGktDORD/snPo7YyzGZGzF8BhMkUaZV9x9R22M6duRKGqrpjvUqtapg5aEeowxGdvJoquzr6rWgEe1uJ8rFrSy+EYFOp3v+ZnlEW5gr2rthjqQq8eMF7UYvGRBL5jwFbZhFCs76rfqqAQMbAd8MP0aKroGy61qZFhcrf551lBdQvXs8wK1VoFvoYym+5vwT6ceBrMrq36YW+gOtJRGng/ljzej1NOEcrsO0y0cGRTYacNuW9yWB0agUoSaLpiBianfw5l7ydbBvle0Yi6Dn+IT1s8n+ouj588nR441F55rxmaLBlNzWT6URXbB/qpLqAETtbh8VGrih9nwYHi47e33TyErx3Lhfhc6Zl7Ufrs62TaxfiXc9eEHCS4rl1RzoZqDIaJ73UHbbGkkp64/WAqm/7jROvAacGtTzj5Zgrvii5YJq/N1pH/8tvX6rTtBPrtdx071DGaKYkz0zFLOf/LZF7TMn0BqXlqaJJBZLCOVzwEbq7CWwlpmPunns/yO1zhG3cVHEn0rn8bq3DBK0s4UimsoPlzZaboyImFB1tY06/55z4r5JFdYEno7g6W5+HfW9vwGyullbKSkl7knaiXyVdcqv1q9faESn/W53JUHAqPETOgz/eF8KDJYnPnmC6wncrASotRN6aFnRKnclwi9ca545tRQns8adSoWt3t0N8bdxeLJOjX6zrvJQMfq+vJXFy1c/Rz4fhz68kdW3zn/+ugnl5N8hs9qLhVzMMQNBRZh4+amZDCLuf1ZPEc6/YWuSx8npt+MBrMPUn5UKugOXSqNDL+0W2CrpcJD8+gE49wX5TQTPuZSZlGAFZ3Fk0t1/OWhUnFk6EBHEo0MymYNNYzGOGJxWHB7XjIgKzqDdxrYsksCE91QS+6lRjA2GZRN6dJrc5S6xt6bI5YX0xRgEyFFKTrf6x6haIyt+n8OJ2v2ruSEXC1BJD9qY0zGdrLo6i5hwVbtdvbowW6k96i18GQdI+kah1HOfUdljKVaHabUeE2BVaTVwZPDqGPrNswYwzH4jql8r6386i5hku85jDYSzh54HVcFU//NK4JGX6ow0VVOeb9U+VdfQzX44m7cmej/r6vOf+py+JEAAwDRMD/uB0XQuQAAAABJRU5ErkJggg==', 38, 38);
            this.graphics = new GraphicsLayer({
                id: 'GeoLocationGraphics'
            });
            var renderer = new SimpleRenderer(symbol);
            renderer.label = 'GPS Position';
            renderer.description = 'GPS Position';
            this.graphics.setRenderer(renderer);
            this.map.addLayer(this.graphics);
        },
        geoLocate: function() {
            if (navigator && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(lang.hitch(this, 'locationSuccess'), lang.hitch(this, 'locationError'));
            } else {
                if (this.growler) {
                    this.growler.growl({
                        title: 'Error',
                        message: 'Geolocation not supported by your browser.'
                    });
                } else {
                    alert('Geolocation not supported by your browser.');
                }
            }
        },
        locationSuccess: function(event) {
            this.graphics.clear();
            var geoPoint = new Point(event.coords.longitude, event.coords.latitude, new SpatialReference({
                wkid: 4326
            }));
            if (this.map.spatialReference.wkid === 102100) {
                var wmPoint = webMercatorUtils.geographicToWebMercator(geoPoint);
                this.setMap(wmPoint, event);
            } else {
                var p = new ProjectParameters();
                p.geometries = [geoPoint];
                p.outSR = this.map.spatialReference;
                esriConfig.defaults.geometryService.project(p, lang.hitch(this, function(geoms) {
                    this.onProjectComplete(geoms, event);
                }));
            }
        },
        onProjectComplete: function(geoms, event) {
            console.log(geoms);
            if (geoms.length > 0) {
                this.setMap(geoms[0], event);
            } else {
                if (this.growler) {
                    this.growler.growl({
                        title: 'Position Information',
                        message: 'Projecting your position failed. Try again.'
                    });
                }
            }
        },
        setMap: function(geom, event) {
            this.map.centerAndZoom(geom, 14);
            this.addGraphic(geom);
            if (this.growler) {
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
                    title: 'Position Information',
                    message: string.substitute(statsTemplate, stats)
                });
            }
        },
        locationError: function(error) {
            if (this.growler) {
                this.growler.growl({
                    title: 'Error',
                    message: 'There was a problem with getting your location: ' + error.message
                });
            } else {
                alert('There was a problem with getting your location: ' + error.message);
            }
        },
        addGraphic: function(geometry) {
            var graphic = new Graphic(geometry);
            this.graphics.add(graphic);
        }
    });
});
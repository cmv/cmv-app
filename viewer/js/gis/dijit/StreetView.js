/*global google */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Button',
    'dojo/_base/lang',
    'dojo/aspect',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/renderers/SimpleRenderer',
    'dojo/text!./StreetView/templates/StreetView.html',
    'esri/renderers/UniqueValueRenderer',
    'esri/symbols/PictureMarkerSymbol',
    'dojo/on',
    'dojo/dom-style',
    'esri/geometry/webMercatorUtils',
    'esri/geometry/Point',
    'esri/SpatialReference',
    'gis/dijit/_FloatingWidgetMixin',
    'xstyle/css!./StreetView/css/StreetView.css',
    'gis/plugins/async!//maps.google.com/maps/api/js?v=3&sensor=false'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, lang, aspect, GraphicsLayer, Graphic, SimpleRenderer, template, UniqueValueRenderer, PictureMarkerSymbol, on, domStyle, webMercatorUtils, Point, SpatialReference, _FloatingWidgetMixin, css, gmaps) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _FloatingWidgetMixin], {
        widgetsInTemplate: true,
        templateString: template,

        panoOptions: {
            addressControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            linksControl: false,
            panControl: false,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL
            },
            enableCloseButton: false
        },

        postCreate: function() {
            this.inherited(arguments);
            this.pointSymbol = new PictureMarkerSymbol(require.toUrl('gis/dijit/StreetView/images/blueArrow.png'), 30, 30);
            this.pointGraphics = new GraphicsLayer({
                id: 'streetview_graphics',
                title: 'Street View'
            });
            this.pointRenderer = new SimpleRenderer(this.pointSymbol);
            this.pointRenderer.label = 'Street View';
            this.pointRenderer.description = 'Street View';
            this.pointGraphics.setRenderer(this.pointRenderer);
            this.map.addLayer(this.pointGraphics);
            this.map.on('click', lang.hitch(this, 'getStreetView'));

            if (this.parentWidget.toggleable) {
                // domStyle.set(this.buttonActionBar, 'display', 'none');
                this.own(aspect.after(this.parentWidget, 'toggle', lang.hitch(this, function() {
                    this.onLayoutChange(this.parentWidget.open);
                })));
            }

        },
        onOpen: function() {
            this.pointGraphics.show();
            if (!this.panorama || !this.panoramaService) {
                this.panorama = new google.maps.StreetViewPanorama(this.panoNode, this.panoOptions);
                this.panoramaService = new google.maps.StreetViewService();
            }
            // if (this.parentWidget.toggleable) {
            //     this.disconnectMapClick();
            // }
        },
        onClose: function() {
            this.pointGraphics.hide();
            if (this.parentWidget.toggleable) {
                this.connectMapClick();
            }
        },
        onLayoutChange: function(open) {
            if (open) {
                this.onOpen();
            } else {
                this.onClose();
            }
        },
        placePoint: function() {
            this.disconnectMapClick();
            //get map click, set up listener in post create
        },
        disconnectMapClick: function() {
            this.map.setMapCursor('crosshair');
            this.mapClickMode.current = 'streetview';
        },
        connectMapClick: function() {
            this.map.setMapCursor('auto');
            this.mapClickMode.current = this.mapClickMode.defaultMode;
        },
        clearGraphics: function() {
            this.pointGraphics.clear();
            domStyle.set(this.noStreetViewResults, 'display', 'block');
            if (!this.parentWidget.toggleable) {
                this.disableStreetViewClick();
            }
        },
        enableStreetViewClick: function() {
            this.disconnectMapClick();
        },
        disableStreetViewClick: function() {
            this.connectMapClick();
        },
        getStreetView: function(evt) {
            if (this.mapClickMode.current === 'streetview') {
                // if (!this.parentWidget.toggleable) {
                    // this.disableStreetViewClick();
                // }
                var mapPoint = evt.mapPoint;
                domStyle.set(this.noStreetViewResults, 'display', 'none');
                domStyle.set(this.loadingStreetView, 'display', 'inline-block');
                var geometry = webMercatorUtils.webMercatorToGeographic(mapPoint);
                this.getPanoramaLocation(geometry);
            }

        },
        getPanoramaLocation: function(geoPoint) {
            var place = new google.maps.LatLng(geoPoint.y, geoPoint.x);
            this.panoramaService.getPanoramaByLocation(place, 50, lang.hitch(this, 'getPanoramaByLocationComplete', geoPoint));
            // Panorama Events -- Changed location
            google.maps.event.addListener(this.panorama, 'position_changed', lang.hitch(this, 'setPlaceMarkerPosition'));
            // Panorama Events -- Changed Rotation
            google.maps.event.addListener(this.panorama, 'pov_changed', lang.hitch(this, 'setPlaceMarkerRotation'));
        },
        getPanoramaByLocationComplete: function(geoPoint, StreetViewPanoramaData, StreetViewStatus) {
            domStyle.set(this.loadingStreetView, 'display', 'none');
            if (StreetViewStatus === 'OK') {
                this.disableStreetViewClick();
                var place = new google.maps.LatLng(geoPoint.y, geoPoint.x);
                this.setPanoPlace = place;
                this.firstSet = true;
                this.panorama.setPosition(place);
            } else if (StreetViewStatus === 'ZERO_RESULTS') {
                this.setPanoPlace = null;
                this.clearGraphics();
                domStyle.set(this.noStreetViewResults, 'display', 'block');
            } else {
                this.setPanoPlace = null;
                this.clearGraphics();
                console.log('StreetView error unknown.');
            }
        },
        setPlaceMarkerPosition: function() {
            if (!this.placeMarker || this.pointGraphics.graphics.length === 0) {
                this.placeMarker = new Graphic();
                // Add graphic to the map
                this.pointGraphics.add(this.placeMarker);
            }
            // get the new lat/long from streetview
            var panoPosition = this.panorama.getPosition();
            var positionLat = panoPosition.lat();
            var positionLong = panoPosition.lng();
            // Make sure they are numbers
            if (!isNaN(positionLat) && !isNaN(positionLong)) {
                // convert from 4326 to 26852
                // var fromProjection = this.wkt_4326;
                // var toProjection = this.wkt_26852;
                // var coordinatesToProject = {
                //   x: positionLong,
                //   y: positionLat,
                // };

                // var pcsPointCoords = proj4(fromProjection, toProjection, coordinatesToProject);
                // var pcsPoint = new esri.geometry.Point(pcsPointCoords.x, pcsPointCoords.y, new esri.SpatialReference({
                //   wkid: 26852
                // }));
                var xy = webMercatorUtils.lngLatToXY(positionLong, positionLat);
                var point = new Point(xy, new SpatialReference({
                    wkid: 102100
                }));

                // change point position on the map
                this.placeMarker.setGeometry(point);
                if (this.setPanoPlace && !this.firstSet) {
                    var heading = google.maps.geometry.spherical.computeHeading(panoPosition, this.setPanoPlace);
                    this.panorama.setPov({
                        heading: heading,
                        pitch: 0
                    });
                    setTimeout(lang.hitch(this, function() {
                        this.setPanoPlace = null;
                    }), 1000);
                } else {
                    this.firstSet = false;
                }
            }
        },
        setPlaceMarkerRotation: function() {
            if (this.placeMarker) {
                var pov = this.panorama.getPov();
                this.pointSymbol.setAngle(pov.heading);
                this.pointGraphics.refresh();
            }
        }
    });
});
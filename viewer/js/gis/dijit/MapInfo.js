/*
 * show mouse coords, scale and zoom
 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/_base/lang',
    'dojo/html',
    'dojo/dom-style',
    'dojo/number',
    'xstyle/css!./MapInfo/css/MapInfo.css'
], function(
    declare,
    WidgetBase,
    TemplatedMixin,
    lang,
    html,
    style,
    number
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin], {
        map: null,
        coordFormat: 'dec', //'dec' or 'dms'
        showScale: false,
        showZoom: false,
        zoomLabel: 'Z',
        minWidth: 0,
        constructor: function(options) {
            declare.safeMixin(this, options || {});
            //template
            var ts = '<div class="gis-dijit-MapInfo">';
            if (this.showScale) {
                ts += '1:<span data-dojo-attach-point="scaleNode"></span>&nbsp;&nbsp;';
            }
            if (this.showZoom) {
                ts += '${zoomLabel}:<span data-dojo-attach-point="zoomNode"></span>&nbsp;&nbsp;';
            }
            ts += '<span data-dojo-attach-point="latNode"></span>&nbsp;&nbsp;<span data-dojo-attach-point="lngNode"></span></div>';
            this.templateString = ts;
        },
        postCreate: function() {
            var map = this.map;
            if (!map) {
                console.log('MapInfo error::a map reference is required');
                this.destroy();
                return;
            }
            //initialize when map loaded
            if (map.loaded) {
                this.initialize(map);
            } else {
                map.on('load', lang.hitch(this, 'initialize', map));
            }
        },
        initialize: function (map) {
            if (this.minWidth) {
                style.set(this.domNode, 'minWidth', this.minWidth + 'px');
            }
            if (this.showScale) {
                html.set(this.scaleNode, number.format(number.round(map.getScale(), 0)));
                map.on('zoom-end', lang.hitch(this, 'setScale'));
            }
            if (this.showZoom) {
                html.set(this.zoomNode, String(map.getLevel()));
                map.on('zoom-end', lang.hitch(this, 'setZoom'));
            }
            map.on('mouse-move, mouse-drag', lang.hitch(this, 'setCoords'));
        },
        setCoords: function(evt) {
            var point = evt.mapPoint;
            if (this.coordFormat === 'dec') {
                html.set(this.latNode, String(number.round(point.getLatitude(), 6)));
                html.set(this.lngNode, String(number.round(point.getLongitude(), 6)));
            } else {
                html.set(this.latNode, this.decToDMS(point.getLatitude(), 'y'));
                html.set(this.lngNode, this.decToDMS(point.getLongitude(), 'x'));
            }
        },
        setScale: function() {
            html.set(this.scaleNode, number.format(number.round(this.map.getScale(), 0)));
        },
        setZoom: function() {
            html.set(this.zoomNode, String(this.map.getLevel()));
        },
        decToDMS: function(l, type) {
            var dir = '?',
                abs = Math.abs(l),
                deg = parseInt(abs, 10),
                min = (abs - deg) * 60,
                minInt = parseInt(min, 10),
                sec = number.round((min - minInt) * 60, 3),
                minIntTxt = (minInt < 10) ? '0' + minInt : minInt,
                secTxt = (sec < 10) ? '0' + sec : sec;
            if (type === 'lat' || type === 'y') {
                dir = (l > 0) ? 'N' : 'S';
            }
            if (type === 'lng' || type === 'x') {
                dir = (l > 0) ? 'E' : 'W';
            }
            return deg + '&deg;' + minIntTxt + '\'' + secTxt + '"&nbsp;' + dir;
        }
    });
});

define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dojo/_base/lang",
    "dojo/_base/Color",
    "esri/toolbars/draw",
    "dojo/text!./Draw/templates/Draw.html"
    ], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button, lang, Color, draw, drawTemplate) {

    //anonymous function to load CSS files required for this module
    (function() {
        var css = [require.toUrl("gis/dijit/Draw/css/Draw.css")];
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

    // main draw dijit
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: drawTemplate,
        drawToolbar: null,
        graphics: null,
        postCreate: function() {
            this.inherited(arguments);
            this.drawToolbar = new esri.toolbars.Draw(this.map);
            this.graphics = new esri.layers.GraphicsLayer({
                id: "drawGraphics",
                title:"Draw Graphics"
            });
            this.map.addLayer(this.graphics);
            dojo.connect(this.drawToolbar, "onDrawEnd", this, 'onDrawToolbarDrawEnd');
        },
        drawPoint: function() {
            //this.disconnectMapClick();
            this.drawToolbar.activate(esri.toolbars.Draw.POINT);
        },
        drawLine: function() {
            //this.disconnectMapClick();
            this.drawToolbar.activate(esri.toolbars.Draw.POLYLINE);
        },
        drawPolygon: function() {
            //this.disconnectMapClick();
            this.drawToolbar.activate(esri.toolbars.Draw.POLYGON);
        },
        disconnectMapClick: function() {
            dojo.disconnect(this.mapClickEventHandle);
            this.mapClickEventHandle = null;
        },
        connectMapClick: function() {
            if(this.mapClickEventHandle === null) {
                this.mapClickEventHandle = dojo.connect(this.map, "onClick", this.mapClickEventListener);
            }
        },
        onDrawToolbarDrawEnd: function(geometry) {
            this.drawToolbar.deactivate();
            //this.connectMapClick();
            var symbol;
            switch(geometry.type) {
            case "point":
                symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1), new Color([255, 0, 0, 1.0]));
                break;
            case "polyline":
                symbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 1);
                break;
            case "polygon":
                symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.0]));
                break;
            default:
            }
            var graphic = new esri.Graphic(geometry, symbol);
            this.graphics.add(graphic);
        },
        clearGraphics: function() {
            this.graphics.clear();
            this.drawToolbar.deactivate();
            //this.connectMapClick();
        }
    });
});
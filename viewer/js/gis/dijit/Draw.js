define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/lang',
    'dojo/_base/Color',
    'esri/toolbars/draw',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/renderers/SimpleRenderer',
    'dojo/text!./Draw/templates/Draw.html',
    'esri/renderers/UniqueValueRenderer',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/layers/FeatureLayer',
    'dojo/topic',
    'dojo/aspect',
    'dijit/form/Button',
    'xstyle/css!./Draw/css/Draw.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, lang, Color, Draw, GraphicsLayer, Graphic, SimpleRenderer, drawTemplate, UniqueValueRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, FeatureLayer, topic, aspect) {

    // main draw dijit
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: drawTemplate,
        drawToolbar: null,
        graphics: null,
        mapClickMode: null,
        postCreate: function () {
            this.inherited(arguments);
            this.drawToolbar = new Draw(this.map);
            this.drawToolbar.on('draw-end', lang.hitch(this, 'onDrawToolbarDrawEnd'));

            this.createGraphicLayers();

            this.own(topic.subscribe('mapClickMode/currentSet', lang.hitch(this, 'setMapClickMode')));
            if (this.parentWidget && this.parentWidget.toggleable) {
                this.own(aspect.after(this.parentWidget, 'toggle', lang.hitch(this, function () {
                    this.onLayoutChange(this.parentWidget.open);
                })));
            }
        },
        createGraphicLayers: function () {
            this.pointSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1), new Color([255, 0, 0, 1.0]));
            this.polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 1);
            this.polygonSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.0]));

            this.pointGraphics = new GraphicsLayer({
                id: 'drawGraphics_point',
                title: 'Draw Graphics'
            });
            this.pointRenderer = new SimpleRenderer(this.pointSymbol);
            this.pointRenderer.label = 'User drawn points';
            this.pointRenderer.description = 'User drawn points';
            this.pointGraphics.setRenderer(this.pointRenderer);
            this.map.addLayer(this.pointGraphics);

            this.polylineGraphics = new GraphicsLayer({
                id: 'drawGraphics_line',
                title: 'Draw Graphics'
            });
            this.polylineRenderer = new SimpleRenderer(this.polylineSymbol);
            this.polylineRenderer.label = 'User drawn lines';
            this.polylineRenderer.description = 'User drawn lines';
            this.polylineGraphics.setRenderer(this.polylineRenderer);
            this.map.addLayer(this.polylineGraphics);

            this.polygonGraphics = new FeatureLayer({
                layerDefinition: {
                    geometryType: 'esriGeometryPolygon',
                    fields: [{
                        name: 'OBJECTID',
                        type: 'esriFieldTypeOID',
                        alias: 'OBJECTID',
                        domain: null,
                        editable: false,
                        nullable: false
                    }, {
                        name: 'ren',
                        type: 'esriFieldTypeInteger',
                        alias: 'ren',
                        domain: null,
                        editable: true,
                        nullable: false
                    }]
                },
                featureSet: null
            }, {
                id: 'drawGraphics_poly',
                title: 'Draw Graphics',
                mode: FeatureLayer.MODE_SNAPSHOT
            });
            //this.polygonRenderer = new SimpleRenderer(this.polygonSymbol);
            this.polygonRenderer = new UniqueValueRenderer(new SimpleFillSymbol(), 'ren', null, null, ', ');
            this.polygonRenderer.addValue({
                value: 1,
                symbol: new SimpleFillSymbol({
                    color: [
                        255,
                        170,
                        0,
                        255
                    ],
                    outline: {
                        color: [
                            255,
                            170,
                            0,
                            255
                        ],
                        width: 1,
                        type: 'esriSLS',
                        style: 'esriSLSSolid'
                    },
                    type: 'esriSFS',
                    style: 'esriSFSForwardDiagonal'
                }),
                label: 'User drawn polygons',
                description: 'User drawn polygons'
            });
            //this.polygonRenderer.label = 'User drawn polygons';
            //this.polygonRenderer.description = 'User drawn polygons';
            this.polygonGraphics.setRenderer(this.polygonRenderer);
            this.map.addLayer(this.polygonGraphics);
        },
        drawPoint: function () {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.POINT);
        },
        drawCircle: function () {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.CIRCLE);
        },
        drawLine: function () {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.POLYLINE);
        },
        drawFreehandLine: function () {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.FREEHAND_POLYLINE);
        },
        drawPolygon: function () {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.POLYGON);
        },
        drawFreehandPolygon: function () {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.FREEHAND_POLYGON);
        },
        disconnectMapClick: function () {
            topic.publish('mapClickMode/setCurrent', 'draw');
            // dojo.disconnect(this.mapClickEventHandle);
            // this.mapClickEventHandle = null;
        },
        connectMapClick: function () {
            topic.publish('mapClickMode/setDefault');
            // if (this.mapClickEventHandle === null) {
            //     this.mapClickEventHandle = dojo.connect(this.map, 'onClick', this.mapClickEventListener);
            // }
        },
        onDrawToolbarDrawEnd: function (evt) {
            this.drawToolbar.deactivate();
            this.connectMapClick();
            var graphic;
            switch (evt.geometry.type) {
            case 'point':
                graphic = new Graphic(evt.geometry);
                this.pointGraphics.add(graphic);
                break;
            case 'polyline':
                graphic = new Graphic(evt.geometry);
                this.polylineGraphics.add(graphic);
                break;
            case 'polygon':
                graphic = new Graphic(evt.geometry, null, {
                    ren: 1
                });
                this.polygonGraphics.add(graphic);
                break;
            default:
            }
        },
        clearGraphics: function () {
            this.endDrawing();
            this.connectMapClick();
        },
        endDrawing: function () {
            this.pointGraphics.clear();
            this.polylineGraphics.clear();
            this.polygonGraphics.clear();
            this.drawToolbar.deactivate();
        },
        onLayoutChange: function (open) {
            // end drawing on close of title pane
            if (!open) {
                this.endDrawing();
                if (this.mapClickMode === 'draw') {
                    topic.publish('mapClickMode/setDefault');
                }
            }
        },
        setMapClickMode: function (mode) {
            this.mapClickMode = mode;
        }
    });
});
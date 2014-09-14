define([
    'dojo/_base/declare',
    'esri/map',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/dom-geometry',
    'dojo/dom-class',
    'dojo/on',
    'dojo/_base/array',
    'dojo/router',
    'dojo/hash',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'gis/dijit/FloatingTitlePane',
    'dojo/_base/lang',
    'dojo/text!./templates/mapOverlay.html',
    'esri/IdentityManager',
    'esri/geometry/webMercatorUtils',
    'gis/dijit/FloatingWidgetDialog',
    'put-selector',
    'dojo/aspect',
    'dojo/has',
    'esri/dijit/PopupMobile',
    'dijit/Menu'
], function(declare, Map, dom, domStyle, domGeom, domClass, on, array, router, hash, BorderContainer, ContentPane, FloatingTitlePane, lang, mapOverlay, IdentityManager, webMercatorUtils, FloatingWidgetDialog, put, aspect, has, PopupMobile, Menu) {

    return {
        legendLayerInfos: [],
        editorLayerInfos: [],
        identifyLayerInfos: [],
        tocLayerInfos: [],
        layerControlLayerInfos: [], //LayerControl custom LayerInfos array
        panes: {
            left: {
                id: 'sidebarLeft',
                placeAt: 'outer',
                collapsible: true,
                region: 'left'
            },
            center: {
                id: 'mapCenter',
                placeAt: 'outer',
                region: 'center',
                content: mapOverlay
            }
        },
        collapseButtons: {},
        currentConfig: null,
        mapUpdating: false,
        hashUpdating: false,

        startup: function(){

            router.register( '/:config/:lng/:lat/:zoom', lang.hitch( this, this.onHashChange ) );
            router.register( '/:config/:lng/:lat', lang.hitch( this, this.onHashChange ) );
            router.register( '/:config', lang.hitch( this, this.onHashChange ) );
            router.startup();

            if ( hash() !== '' ) {
                router.go( hash() );
            } else {
                this.loadConfigFromUrl();
            }

        },
        onHashChange: function ( event ) {

            var config = this.getConfig( event );

            if ( this.currentConfig && this.currentConfig !== config ) {
                location.reload();
            } else if ( this.currentConfig && this.currentConfig === config ) {
                this.setCenterAndZoom( event );
            } else {
                this.loadConfigFromRoute( event );

            }

        },
        getConfig: function ( routeEvent ) {

            var config;

            if ( routeEvent ) {

                config = 'viewer';
                config = routeEvent.params.config || config;
                config  = 'config/' + config;

            } else {

                config = 'config/viewer', s = window.location.search, q = s.match(/config=([^&]*)/i);
                if (q && q.length > 0) {
                    config = q[1];
                    if(file.indexOf('/') < 0) {
                        config = 'config/' + config;
                    }
                }

            }

            return config;
        },
        loadConfigFromRoute: function ( routeEvent ) {

            var config = this.getConfig( routeEvent );
            this.currentConfig = config;

            var lng = routeEvent.params.lng || null;
            var lat = routeEvent.params.lat || null;
            var zoom = routeEvent.params.zoom || null;

            require( [ config ], lang.hitch( this, function( lng, lat, zoom, config ) {

                var center = config.mapOptions.center || [ lng,lat ];
                var newLng = lng || center[0];
                var newLat = lat || center[1];
                config.mapOptions.center = [ newLng, newLat ];

                var newZoom = zoom || config.mapOptions.zoom;
                config.mapOptions.zoom = newZoom;

                this.initialize( config );

            }, lng, lat, zoom ) );

        },
        loadConfigFromUrl: function () {

            var config = this.getConfig( null );
            this.currentConfig = config;

            require( [ config ], lang.hitch( this, function( config ) {
                this.initialize( config );
            } ) );

        },
        setCenterAndZoom: function ( routeEvent ) {

            if ( !this.hashUpdating ) {

                this.mapUpdating = true;
                var zoom = routeEvent.params.zoom || this.map.getLevel();

                this.map.centerAndZoom([routeEvent.params.lng, routeEvent.params.lat], zoom).then( lang.hitch( this, function () {
                    this.mapUpdating = false;
                }));

            }
        },
        initialize: function(config) {

            this.config = config;
            this.mapClickMode = {
                current: config.defaultMapClickMode,
                defaultMode: config.defaultMapClickMode
            };

            // simple feature detection. kinda like dojox/mobile without the overhead
            if (has('touch') && (has('ios') || has('android') || has('bb'))) {
                has.add('mobile', true);
                if (screen.availWidth < 500 || screen.availHeight < 500) {
                    has.add('phone', true);
                } else {
                    has.add('tablet', true);
                }
            }

            this.initTitles();
            this.initPanes();

        },
        initTitles: function() {
          var titles = lang.mixin( {
                                      headerTitle: 'Configurable Viewer',
                                      subHeaderTitle: 'make it your own',
                                      pageTitle: 'Configurable Viewer CMV'
                                   }, this.config.titles );

            var headerTitleNode = dom.byId( 'headerTitleSpan' );
            if ( headerTitleNode ) {
                headerTitleNode.innerText = titles.headerTitle;
            }

            var subHeaderTitle = dom.byId( 'subHeaderTitleSpan' );
            if ( subHeaderTitle ) {
                subHeaderTitle.innerText = titles.subHeaderTitle;
            }

            document.title = titles.pageTitle;
        },
        initPanes: function() {
            var key, panes = this.config.panes || {};
            for (key in this.panes) {
                if (this.panes.hasOwnProperty(key)) {
                    panes[key] = lang.mixin(this.panes[key], panes[key]);
                }
            }

            this.panes.outer = new BorderContainer({
                id: 'borderContainerOuter',
                design: 'sidebar',
                gutters: false
            }).placeAt(document.body);

            var options, placeAt, type;
            for (key in panes) {
                if (panes.hasOwnProperty(key)) {
                    options = lang.clone(panes[key]);
                    placeAt = this.panes[options.placeAt] || this.panes.outer;
                    options.id = options.id || key;
                    type = options.type;
                    delete options.placeAt;
                    delete options.type;
                    delete options.collapsible;
                    if (placeAt) {
                        if (type === 'border') {
                            this.panes[key] = new BorderContainer(options).placeAt(placeAt);
                        } else if (options.region) {
                            this.panes[key] = new ContentPane(options).placeAt(placeAt);
                        }
                    }
                }
            }
            this.panes.outer.startup();
            this.initMap();

            // where to place the buttons
            // either the center map pane or the outer pane?
            this.collapseButtonsPane = this.config.collapseButtonsPane || 'outer';

            for (key in panes) {
                if (panes.hasOwnProperty(key)) {
                    if (panes[key].collapsible) {
                        this.collapseButtons[key] = put(this.panes[this.collapseButtonsPane].domNode, 'div.sidebarCollapseButton.sidebar' + key + 'CollapseButton.sidebarCollapseButton' + ((key === 'bottom' || key === 'top') ? 'Vert' : 'Horz') + ' div.dijitIcon.button.close').parentNode;
                        on(this.collapseButtons[key], 'click', lang.hitch(this, 'togglePane', key));
                        this.positionSideBarToggle(key);
                        if (this.collapseButtonsPane === 'outer') {
                            var splitter = this.panes[key]._splitterWidget;
                            if (splitter) {
                                aspect.after(splitter, '_startDrag', lang.hitch(this, 'splitterStartDrag', key));
                                aspect.after(splitter, '_stopDrag', lang.hitch(this, 'splitterStopDrag', key));
                            }
                        }
                    }
                    if (key !== 'center' && this.panes[key]._splitterWidget) {
                        domClass.add(this.map.root.parentNode, 'pane' + key);
                        if (key === 'right' && this.panes.top) {
                            domClass.add(this.panes.top.domNode, 'pane' + key);
                        }
                        if (key === 'right' && this.panes.bottom) {
                            domClass.add(this.panes.bottom.domNode, 'pane' + key);
                        }
                        if (key === 'left' && this.panes.top) {
                            domClass.add(this.panes.top.domNode, 'pane' + key);
                        }
                        if (key === 'left' && this.panes.bottom) {
                            domClass.add(this.panes.bottom.domNode, 'pane' + key);
                        }
                    }
                }
            }
            this.panes.outer.resize();
        },
        initMap: function() {

            if (has('phone') && !this.config.mapOptionsinfoWindow) {
                this.config.mapOptions.infoWindow = new PopupMobile(null, put('div'));
            }
            this.map = new Map('mapCenter', this.config.mapOptions);

            on( this.map, 'extent-change', lang.hitch( this, this.updateLocationHash ) );

            // create right-click menu
            this.mapRightClickMenu = new Menu({
                targetNodeIds: [this.map.root],
                selector: '.layersDiv' // restrict to map only
            });
            this.mapRightClickMenu.startup();



            if (this.config.mapOptions.basemap) {
                this.map.on('load', lang.hitch(this, 'initLayers'));
            } else {
                this.initLayers();
            }

            if (this.config.operationalLayers && this.config.operationalLayers.length > 0) {
                on.once(this.map, 'layers-add-result', lang.hitch(this, 'initWidgets'));
            } else {
                this.initWidgets();
            }

        },
        updateLocationHash: function( event ) {

            if ( !this.mapUpdating ) {

                this.hashUpdating = true;

                var x = (event.extent.xmax + event.extent.xmin) / 2,
                    y = (event.extent.ymax + event.extent.ymin) / 2;
                var geographicLocation = webMercatorUtils.xyToLngLat( x, y );

                var currentHash = hash().split( '/' );
                currentHash[ 1 ] = this.currentConfig.replace( 'config/', '' );
                currentHash[ 2 ] = geographicLocation[0];
                currentHash[ 3 ] = geographicLocation[1];
                currentHash[ 4 ] = this.map.getLevel();

                hash( currentHash.join('/') );
                this.hashUpdating = false;
            }

        },
        initLayers: function(evt) {
            this.map.on('resize', function(evt) {
                var pnt = evt.target.extent.getCenter();
                setTimeout(function() {
                    evt.target.centerAt(pnt);
                }, 100);
            });

            this.layers = [];
            var layerTypes = {
                csv: 'CSV',
                dynamic: 'ArcGISDynamicMapService',
                feature: 'Feature',
                georss: 'GeoRSS',
                image: 'ArcGISImageService',
                kml: 'KML',
                label: 'Label', //untested
                mapimage: 'MapImage', //untested
                osm: 'OpenStreetMap',
                tiled: 'ArcGISTiledMapService',
                wms: 'WMS',
                wmts: 'WMTS' //untested
            };
            // loading all the required modules first ensures the layer order is maintained
            var modules = [];
            array.forEach(this.config.operationalLayers, function(layer) {
                var type = layerTypes[layer.type];
                if (type) {
                    modules.push('esri/layers/' + type + 'Layer');
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
            }, this);
            require(modules, lang.hitch(this, function() {
                array.forEach(this.config.operationalLayers, function(layer) {
                    var type = layerTypes[layer.type];
                    if (type) {
                        require(['esri/layers/' + type + 'Layer'], lang.hitch(this, 'initLayer', layer));
                    }
                }, this);
                this.map.addLayers(this.layers);
            }));
        },
        initLayer: function(layer, Layer) {
            var l = new Layer(layer.url, layer.options);
            this.layers.unshift(l); // unshift instead of oush to keep layer ordering on map intact
            this.legendLayerInfos.unshift({
                layer: l,
                title: layer.title || null
            });
            this.tocLayerInfos.push({ //push because Legend and TOC need the layers in the opposite order
                layer: l,
                title: layer.title || null,
                slider: (layer.slider === false) ? false : true,
                noLegend: layer.noLegend || false,
                collapsed: layer.collapsed || false,
                sublayerToggle: layer.sublayerToggle || false,
                type: layer.type,
                url: layer.url
            });
            if (layer.type === 'feature') {
                var options = {
                    featureLayer: l
                };
                if (layer.editorLayerInfos) {
                    lang.mixin(options, layer.editorLayerInfos);
                }
                this.editorLayerInfos.push(options);
            }
            //LayerControl custom LayerInfos array
            this.layerControlLayerInfos.unshift({
                layer: l,
                type: layer.type,
                title: layer.title,
                controlOptions: lang.mixin({
                    sublayers: true
                }, layer.controlOptions)
            });
            if (layer.type === 'dynamic' || layer.type === 'feature') {
                var identifyLayerInfo = {
                    layer: l
                };
                if (layer.identifyLayerInfos) {
                    lang.mixin(identifyLayerInfo, layer.identifyLayerInfos);
                }
                if (identifyLayerInfo.include !== false) {
                    this.identifyLayerInfos.push(identifyLayerInfo);
                }
            }
        },
        initWidgets: function(evt) {
            var widgets = [],
                paneWidgets;

            for (var key in this.config.widgets) {
                if (this.config.widgets.hasOwnProperty(key)) {
                    var widget = lang.clone(this.config.widgets[key]);
                    if (widget.include) {
                        widget.position = ('undefined' !== typeof(widget.position)) ? widget.position : 10000;
                        widgets.push(widget);
                    }
                }
            }
            for (var pane in this.panes) {
                if (this.panes.hasOwnProperty(pane) && (pane !== 'outer' || pane !== 'center')) {
                    paneWidgets = array.filter(widgets, function(widget) {
                        return (widget.placeAt && widget.placeAt === pane);
                    });
                    paneWidgets.sort(function(a, b) {
                        return a.position - b.position;
                    });
                    array.forEach(paneWidgets, function(widget, i) {
                        this.widgetLoader(widget, i);
                    }, this);
                }
            }
            paneWidgets = array.filter(widgets, function(widget) {
                return !widget.placeAt;
            });
            paneWidgets.sort(function(a, b) {
                return a.position - b.position;
            });

            array.forEach(paneWidgets, function(widget, i) {
                this.widgetLoader(widget, i);
            }, this);
        },
        togglePane: function(id, show) {
            if (!this.panes[id]) {
                return;
            }
            var domNode = this.panes[id].domNode;
            if (domNode) {
                var disp = (show && typeof(show) === 'string') ? show : (domStyle.get(domNode, 'display') === 'none') ? 'block' : 'none';
                domStyle.set(domNode, 'display', disp);
                if (this.panes[id]._splitterWidget) { // show/hide the splitter, if found
                    domStyle.set(this.panes[id]._splitterWidget.domNode, 'display', disp);
                }
                this.positionSideBarToggle(id);
                if (this.panes.outer) {
                    this.panes.outer.resize();
                }
            }
        },
        positionSideBarToggle: function(id) {
            var pane = this.panes[id];
            var btn = this.collapseButtons[id];
            if (!pane || !btn) {
                return;
            }
            var disp = domStyle.get(pane.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(btn.children[0], rCls);
            domClass.add(btn.children[0], aCls);

            // extra management required when the buttons
            // are not in the center map pane
            if (this.collapseButtonsPane === 'outer') {
                var pos = (pane._splitterWidget) ? 0 : -1;
                var orie = (id === 'bottom' || id === 'top') ? 'h' : 'w';
                if (disp === 'block') { // pane is open
                    pos += domGeom.getMarginBox(pane.domNode)[orie];
                }
                if (pane._splitterWidget) { // account for a splitter
                    pos += domGeom.getMarginBox(pane._splitterWidget.domNode)[orie];
                }
                domStyle.set(btn, id, pos.toString() + 'px');
                domStyle.set(btn, 'display', 'block');
            }
        },

        // extra management of splitter required when the buttons
        // are not in the center map pane
        splitterStartDrag: function(id) {
            var btn = this.collapseButtons[id];
            domStyle.set(btn, 'display', 'none');
        },
        splitterStopDrag: function(id) {
            this.positionSideBarToggle(id);
        },

        _createTitlePaneWidget: function(parentId, title, position, open, canFloat, placeAt) {
            var tp, options = {
                title: title || 'Widget',
                open: open || false,
                canFloat: canFloat || false
            };
            if (parentId) {
                options.id = parentId;
            }
            if (typeof(placeAt) === 'string') {
                placeAt = this.panes[placeAt];
            }
            if (!placeAt) {
                placeAt = this.panes.left;
            }
            if (placeAt) {
                options.sidebar = placeAt;
                tp = new FloatingTitlePane(options).placeAt(placeAt, position);
                tp.startup();
            }
            return tp;
        },
        _createFloatingWidget: function(parentId, title) {
            var options = {
                title: title
            };
            if (parentId) {
                options.id = parentId;
            }
            var fw = new FloatingWidgetDialog(options);
            fw.startup();
            return fw;
        },
        _createContentPaneWidget: function(parentId, title, className, region, placeAt) {
            var cp, options = {
                title: title,
                region: region || 'center'
            };
            if (className) {
                options.className = className;
            }
            if (parentId) {
                options.id = parentId;
            }
            if (!placeAt) {
                placeAt = this.panes.sidebar;
            } else if (typeof(placeAt) === 'string') {
                placeAt = this.panes[placeAt];
            }
            if (placeAt) {
                cp = new ContentPane(options).placeAt(placeAt);
                cp.startup();
            }
            return cp;
        },
        widgetLoader: function(widgetConfig, position) {
            var parentId, pnl;

            // only proceed for valid widget types
            var widgetTypes = ['titlePane', 'contentPane', 'floating', 'domNode', 'invisible', 'map'];
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                //console.log('Widget type ' + widgetConfig.type + ' (' + widgetConfig.title + ') at position ' + position + ' is not supported.');
                return;
            }

            // build a titlePane or floating widget as the parent
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating') && (widgetConfig.id && widgetConfig.id.length > 0)) {
                parentId = widgetConfig.id + '_parent';
                if (widgetConfig.type === 'titlePane') {
                    pnl = this._createTitlePaneWidget(parentId, widgetConfig.title, position, widgetConfig.open, widgetConfig.canFloat, widgetConfig.placeAt);
                } else if (widgetConfig.type === 'contentPane') {
                    pnl = this._createContentPaneWidget(parentId, widgetConfig.title, widgetConfig.className, widgetConfig.region, widgetConfig.placeAt);
                } else if (widgetConfig.type === 'floating') {
                    pnl = this._createFloatingWidget(parentId, widgetConfig.title);
                }
                widgetConfig.parentWidget = pnl;
            }

            // 2 ways to use require to accommodate widgets that may have an optional separate configuration file
            if (typeof(widgetConfig.options) === 'string') {
                require([widgetConfig.options, widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig));
            } else {
                require([widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig, widgetConfig.options));
            }
        },
        createWidget: function(widgetConfig, options, WidgetClass) {
            // set any additional options
            options.id = widgetConfig.id + '_widget';
            options.parentWidget = widgetConfig.parentWidget;

            if (options.map) {
                options.map = this.map;
            }
            if (options.mapRightClickMenu) {
                options.mapRightClickMenu = this.mapRightClickMenu;
            }
            if (options.mapClickMode) {
                options.mapClickMode = this.mapClickMode;
            }
            if (options.legendLayerInfos) {
                options.layerInfos = this.legendLayerInfos;
            }
            if (options.tocLayerInfos) {
                options.layerInfos = this.tocLayerInfos;
            }
            if (options.editorLayerInfos) {
                options.layerInfos = this.editorLayerInfos;
            }
            if (options.identifyLayerInfos) {
                options.layerInfos = this.identifyLayerInfos;
            }
            //pass LayerControl LayerInfos array
            if (options.layerControlLayerInfos) {
                options.layerInfos = this.layerControlLayerInfos;
            }
            // create the widget
            var pnl = options.parentWidget;
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating')) {
                this[widgetConfig.id] = new WidgetClass(options, put('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'domNode') {
                this[widgetConfig.id] = new WidgetClass(options, widgetConfig.srcNodeRef);
            } else {
                this[widgetConfig.id] = new WidgetClass(options);
            }

            // start up the widget
            if (this[widgetConfig.id] && this[widgetConfig.id].startup && !this[widgetConfig.id]._started) {
                this[widgetConfig.id].startup();
            }
        }
    };
});

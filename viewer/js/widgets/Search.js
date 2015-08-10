define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    'esri/toolbars/draw',
    'esri/tasks/query',
    'esri/tasks/GeometryService',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-style',
    'dojo/aspect',
    'dojo/topic',
    'dojo/keys',

    // template
    'dojo/text!./Search/templates/Search.html',

    //i18n
    'dojo/i18n!./Search/nls/Search',

    //template widgets
    'dijit/layout/LayoutContainer',
    'dijit/layout/ContentPane',
    'dijit/layout/TabContainer',
    'dijit/form/Select',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'dijit/form/Button',
    'dijit/form/CheckBox',

    // css
    'xstyle/css!./Search/css/Search.css',
    'xstyle/css!./Search/css/Draw.css'

], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,

    Draw,
    Query,
    GeometryService,
    lang,
    on,
    domStyle,
    aspect,
    topic,
    keys,

    template,

    i18n
) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        name: 'Search',
        baseClass: 'cmvSearchWidget',
        widgetsInTemplate: true,
        templateString: template,
        mapClickMode: null,

        // i18n
        i18n: i18n,

        title: 'Search Results',
        topicID: 'searchResults',
        attributesContainerID: 'attributesContainer',

        shapeLayer: 0,
        attributeLayer: 0,
        drawToolbar: null,

        drawingOptions: {
            rectangle: true,
            circle: true,
            point: true,
            polyline: true,
            freehandPolyline: true,
            polygon: true,
            freehandPolygon: true,
            identifiedFeature: true,
            selectedFeatures: false
        },

        bufferUnits: [
            {
                value: GeometryService.UNIT_FOOT,
                label: 'Feet',
                selected: true
            },
            {
                value: GeometryService.UNIT_STATUTE_MILE,
                label: 'Miles'
            },
            {
                value: GeometryService.UNIT_METER,
                label: 'Meters'
            },
            {
                value: GeometryService.UNIT_KILOMETER,
                label: 'Kilometers'
            },
            {
                value: GeometryService.UNIT_NAUTICAL_MILE,
                label: 'Nautical Miles'
            },
            {
                value: GeometryService.UNIT_US_NAUTICAL_MILE,
                label: 'US Nautical Miles'
            }
        ],


        postCreate: function () {
            this.inherited(arguments);
            this.initLayerSelect();
            this.selectBufferUnits.set('options', this.bufferUnits);
            this.drawToolbar = new Draw(this.map);
            this.enableDrawingButtons();

            if (this.map.infoWindow) {
                on(this.map.infoWindow, 'show', lang.hitch(this, 'enableIdentifyButton'));
                on(this.map.infoWindow, 'hide', lang.hitch(this, 'disableIdentifyButton'));
            }
            this.own(on(this.drawToolbar, 'draw-end', lang.hitch(this, 'endDrawing')));

            for (var k = 0; k < 5; k++) {
                this.own(on(this['inputSearchTerm' + k], 'keyup', lang.hitch(this, 'executeSearchWithReturn')));
            }
            this.addTopics();
        },

        startup: function () {
            this.inherited(arguments);
            var parent = this.getParent();
            if (parent) {
                this.own(on(parent, 'show', lang.hitch(this, function () {
                  this.tabContainer.resize();
                })));
            }
            aspect.after(this, 'resize', lang.hitch(this, function () {
                this.tabContainer.resize();
            }));
        },

        addTopics: function () {
            this.own(topic.subscribe('mapClickMode/currentSet', lang.hitch(this, 'setMapClickMode')));
            this.own(topic.subscribe('searchWidget/search', lang.hitch(this, 'executeSearch')));
        },

        /*******************************
        *  Search Functions
        *******************************/

        executeSearchWithReturn: function (evt) {
            if (evt.keyCode === keys.ENTER) {
                this.onSearch();
            }
        },

        search: function (geometry, layerIndex) {
            if (!this.layers) {
                return;
            }
            if (this.layers.length === 0) {
                return;
            }

            var distance, unit, showOnly = false;
            var layer = this.layers[layerIndex];
            var where = layer.expression || '';
            var search = layer.attributeSearches[this.searchIndex] || {};
            if (geometry) {
                distance = this.inputBufferDistance.get('value');
                if (isNaN(distance)) {
                    topic.publish('growler/growl', {
                        title: 'Search',
                        message: 'Invalid distance',
                        level: 'error',
                        timeout: 3000
                    });
                    return;
                }
                unit = this.selectBufferUnits.get('value');
                showOnly = this.checkBufferOnly.get('checked');

            } else {
                var fields = search.searchFields;
                var len = fields.length;
                for (var k = 0; k < len; k++) {
                    var field = fields[k];
                    var searchTerm = this.getSearchTerm(k, field);
                    if (searchTerm === null) {
                        return;
                    } else if (searchTerm.length > 0 && field.expression) {
                        var attrWhere = field.expression;
                        attrWhere = attrWhere.replace(/\[value\]/g, searchTerm);
                        if (!attrWhere) {
                            break;
                        }
                        if (where !== '') {
                            where += ' AND ';
                        }
                        where += attrWhere;
                    }
                }
            }

            var queryOptions = {
                idProperty: search.idProperty || layer.idProperty || 'FID',
                linkField: search.linkField || layer.linkField || null,
                linkedQuery: lang.clone(search.linkedQuery || layer.linkedQuery || null)
            };

            var queryParameters = lang.clone(search.queryParameters || layer.queryParameters || {});
            queryOptions.queryParameters = lang.mixin(queryParameters, {
                //type: search.type || layer.type || 'spatial',
                geometry: geometry,
                where: where,
                outSpatialReference: search.outSpatialReference || this.map.spatialReference,
                spatialRelationship: search.spatialRelationship || layer.spatialRelationship || Query.SPATIAL_REL_INTERSECTS
            });

            var bufferParameters = lang.clone(search.bufferParameters || layer.bufferParameters || {});
            queryOptions.bufferParameters = lang.mixin(bufferParameters, {
                distance: distance,
                unit: unit,
                showOnly: showOnly
            });

            // publish to an accompanying attributed table
            topic.publish(this.attributesContainerID + '/addTable', {
                title: search.title || layer.title || this.title,
                topicID: search.topicID || layer.topicID || this.topicID,
                queryOptions: queryOptions,
                gridOptions: lang.clone(search.gridOptions || layer.gridOptions || {}),
                featureOptions: lang.clone(search.featureOptions || layer.featureOptions || {}),
                symbolOptions: lang.clone(search.symbolOptions || layer.symbolOptions || {}),
                toolbarOptions: lang.clone(search.toolbarOptions || layer.toolbarOptions || {}),
                infoTemplate: search.infoTemplate || layer.infoTemplate
            });
        },

        getSearchTerm: function (idx, field) {
            var searchTerm = this['inputSearchTerm' + idx].get('value');
            if (!searchTerm && field.required) {
                this['inputSearchTerm' + idx].domNode.focus();

                topic.publish('growler/growl', {
                    title: 'Search',
                    message: 'You must provide a search term for ' + field.name + '.',
                    level: 'error',
                    timeout: 3000
                });
                return null;
            }
            if (field.minChars && field.required) {
                if (searchTerm.length < field.minChars) {
                    topic.publish('growler/growl', {
                        title: 'Search',
                        message: 'Search term for ' + field.name + ' must be at least ' + field.minChars + ' characters.',
                        level: 'error',
                        timeout: 3000
                    });
                    return null;
                }
            }
            return searchTerm;
        },

        // a topic subscription to listen for published topics
        executeSearch: function (options) {
            if (options.searchTerm) {
                this.inputSearchTerm0.set('value', options.searchTerm);
            }
            if (options.bufferDistance) {
                this.inputBufferDistance.set('value', options.bufferDistance);
                if (options.bufferUnits) {
                    this.selectBufferUnits.set('value', options.bufferUnits);
                }
            }
            this.search(options.geometry, options.layerIndex);
        },


        /*******************************
        *  Form/Field Functions
        *******************************/

        initLayerSelect: function () {
            var attrOptions = [],
                shapeOptions = [];
            var len = this.layers.length,
                option;
            for (var i = 0; i < len; i++) {
                option = {
                    value: i,
                    label: this.layers[i].name
                };
                attrOptions.push(lang.clone(option));
                if (this.layers[i].queryParameters && this.layers[i].queryParameters.type === 'spatial') {
                    option.value = (shapeOptions.length);
                    shapeOptions.push(option);
                }
            }

            if (attrOptions.length > 0) {
                this.selectLayerByAttribute.set('options', attrOptions);
                this.onAttributeLayerChange(this.attributeLayer);
            } else {
                this.selectLayerByAttribute.set('disabled', true);
            }
            if (shapeOptions.length > 0) {
                this.selectLayerByShape.set('options', shapeOptions);
                this.onShapeLayerChange(this.shapeLayer);
            } else {
                this.selectLayerByShape.set('disabled', true);
            }
        },

        onShapeLayerChange: function (newValue) {
            this.shapeLayer = newValue;
        },

        onAttributeLayerChange: function (newValue) {
            this.attributeLayer = newValue;
            this.selectAttributeQuery.set('disabled', true);
            var layer = this.layers[this.attributeLayer];
            if (layer) {
                this.selectAttributeQuery.set('value', null);
                this.selectAttributeQuery.set('options', null);
                var searches = layer.attributeSearches;
                var options = [];
                var len = searches.length;
                for (var i = 0; i < len; i++) {
                    var option = {
                        value: i,
                        label: searches[i].name
                    };
                    options.push(option);
                    if (i === 0) {
                        options[i].selected = true;
                    }
                }
                if (len) {
                    this.selectAttributeQuery.set('options', options);
                    this.selectAttributeQuery.set('disabled', false);
                    this.selectAttributeQuery.set('value', 0);
                    this.onAttributeQueryChange(0);

                    domStyle.set(this.divAttributeQuerySelect, 'display', (len > 1) ? 'block' : 'none');
                }
            }
        },

        onAttributeQueryChange: function (newValue) {
            this.searchIndex = newValue;
            var layer = this.layers[this.attributeLayer];
            if (layer) {
                var searches = layer.attributeSearches;
                if (searches) {
                    var search = searches[newValue];
                    if (search) {
                        // initialize all the search field inputs
                        var fields = search.searchFields;
                        for (var k = 0; k < 10; k++) {
                            var display = 'block', disabled = false;
                            var formLabel = this['labelSearchTerm' + k];
                            var formInput = this['inputSearchTerm' + k];
                            if (formInput) {
                                var field = fields[k];
                                if (field) {
                                    var txt = field.label + ':';
                                    if (field.minChars) {
                                        txt += ' (at least ' + field.minChars + ' chars)';
                                    }

                                    formLabel.textContent = txt;
                                    formInput.set('value', '');
                                    formInput.set('placeHolder', field.placeholder);
                                } else {
                                    display = 'none';
                                    disabled = true;
                                }

                                formInput.set('disabled', disabled);
                                domStyle.set(formInput.domNode, 'display', display);
                                domStyle.set(formLabel, 'display', display);
                            }

                        }

                        // put focus on the first input field
                        this.inputSearchTerm0.domNode.focus();
                        this.btnSearch.set('disabled', false);
                    }
                }
            }
        },

        onSearch: function () {
            this.search(null, this.attributeLayer);
        },


        /*******************************
        *  Drawing Functions
        *******************************/

        enableDrawingButtons: function () {
            var opts = this.drawingOptions;
            var disp = (opts.rectangle !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchRectangleButtonDijit.domNode, 'display', disp);
            disp = (opts.circle !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchCircleButtonDijit.domNode, 'display', disp);
            disp = (opts.point !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchPointButtonDijit.domNode, 'display', disp);
            disp = (opts.polyline !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchPolylineButtonDijit.domNode, 'display', disp);
            disp = (opts.freehandPolyline !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchFreehandPolylineButtonDijit.domNode, 'display', disp);
            disp = (opts.polygon !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchPolygonButtonDijit.domNode, 'display', disp);
            disp = (opts.freehandPolygon !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchFreehandPolygonButtonDijit.domNode, 'display', disp);
            disp = (opts.identifiedFeatures !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchIdentifyButtonDijit.domNode, 'display', disp);
            disp = (opts.selectedFeatures !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchSelectedButtonDijit.domNode, 'display', disp);
        },

        prepareForDrawing: function (btn) {
            // is btn checked?
            var chk = btn.get('checked');
            this.cancelDrawing();
            if (chk) {
                // toggle btn to checked state
                btn.set('checked', true);
            }
            return chk;
        },

        drawRectangle: function () {
            var btn = this.searchRectangleButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.EXTENT);
            }
        },

        drawCircle: function () {
            var btn = this.searchCircleButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.CIRCLE);
            }
        },

        drawPoint: function () {
            var btn = this.searchPointButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.POINT);
            }
        },

        drawPolyline: function () {
            var btn = this.searchPolylineButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.POLYLINE);
            }
        },

        drawFreehandPolyline: function () {
            var btn = this.searchFreehandPolylineButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.FREEHAND_POLYLINE);
            }
        },

        drawPolygon: function () {
            var btn = this.searchPolygonButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.POLYGON);
            }
        },

        drawFreehandPolygon: function () {
            var btn = this.searchFreehandPolygonButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.FREEHAND_POLYGON);
            }
        },

        uncheckDrawingTools: function () {
            this.searchRectangleButtonDijit.set('checked', false);
            this.searchCircleButtonDijit.set('checked', false);
            this.searchPointButtonDijit.set('checked', false);
            this.searchPolylineButtonDijit.set('checked', false);
            this.searchFreehandPolylineButtonDijit.set('checked', false);
            this.searchPolygonButtonDijit.set('checked', false);
            this.searchFreehandPolygonButtonDijit.set('checked', false);
        },

        endDrawing: function(evt) {
            var clickMode = this.mapClickMode;
            this.uncheckDrawingTools();
            this.map.enableMapNavigation();
            this.drawToolbar.deactivate();
            this.connectMapClick();

            if (clickMode === 'search') {
                var geometry = evt.geometry;
                if (geometry) {
                    this.search(geometry, this.shapeLayer);
                }
            }
        },

        cancelDrawing: function () {
            this.hideInfoWindow();
            this.disconnectMapClick();
            this.uncheckDrawingTools();
        },

        onDrawToolbarDrawEnd: function (graphic) {
            this.map.enableMapNavigation();
            this.drawToolbar.deactivate();
            this.connectMapClick();

            this.search(graphic.geometry, this.shapeLayer);
        },

        /*******************************
        *  Using Identify Functions
        *******************************/

        useIdentifiedFeatures: function () {
            var popup = this.map.infoWindow;
            if (popup && popup.isShowing) {
                var feature = popup.getSelectedFeature();
                if (feature) {
                    popup.hide();
                    this.search(feature.geometry, this.shapeLayer);
                    return;
                }
            }
            topic.publish('growler/growl', {
                title: 'Search',
                message: 'You must have identified a feature',
                level: 'error',
                timeout: 3000
            });
        },

        enableIdentifyButton: function () {
            this.searchIdentifyButtonDijit.set('disabled', false);
        },

        disableIdentifyButton: function () {
            this.searchIdentifyButtonDijit.set('disabled', true);
        },

        /*******************************
        *  Using Selected Functions
        *******************************/
        // not yet implemented - need a selection widget
        useSelectedFeatures: function () {
            /*
            var selected = false;
            if (selected) {
                var feature = this.getSelectedFeatures();
                if (feature) {
                    this.search(feature.geometry, this.shapeLayer);
                    return;
                }
            }
            */
            topic.publish('growler/growl', {
                title: 'Search',
                message: 'You must have selected feature(s)',
                level: 'error',
                timeout: 3000
            });
        },

        enableSelectedButton: function () {
            this.searchSelectedButtonDijit.set('disabled', false);
        },

        disableSelectedButton: function () {
            this.searchSelectedButtonDijit.set('disabled', true);
        },

        /*******************************
        *  Miscellaneous Functions
        *******************************/
        hideInfoWindow: function () {
            if (this.map && this.map.infoWindow) {
                this.map.infoWindow.hide();
            }
        },

        disconnectMapClick: function () {
            topic.publish('mapClickMode/setCurrent', 'search');
        },

        connectMapClick: function () {
            topic.publish('mapClickMode/setDefault');
        },

        setMapClickMode: function (mode) {
            this.mapClickMode = mode;
        },

        onLayoutChange: function (open) {
            if (!open && this.mapClickMode === 'search') {
                this.connectMapClick();
                this.drawToolbar.deactivate();
                this.inherited(arguments);
            }
        }
    });
});

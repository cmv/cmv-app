define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/MenuItem',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/promise/all',
    'dojo/topic',
    'dojo/query',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dnd/Moveable',
    'dojo/store/Memory',
    'esri/tasks/IdentifyTask',
    'esri/tasks/IdentifyParameters',
    'esri/dijit/PopupTemplate',
    'esri/layers/FeatureLayer',
    'esri/TimeExtent',
    'dojo/Deferred',
    'dojo/text!./Identify/templates/Identify.html',
    'dojo/i18n!./Identify/nls/resource',
    './Identify/Formatters',

    'dijit/form/Form',
    'dijit/form/FilteringSelect',
    'xstyle/css!./Identify/css/Identify.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, MenuItem, lang, array, all, topic, query, domStyle, domClass, Moveable, Memory, IdentifyTask, IdentifyParameters, PopupTemplate, FeatureLayer, TimeExtent, Deferred, IdentifyTemplate, i18n, Formatters) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: IdentifyTemplate,
        baseClass: 'gis_IdentifyDijit',
        i18n: i18n,

        mapClickMode: null,
        identifies: {},
        infoTemplates: {},
        featureLayers: {},
        ignoreOtherGraphics: true,
        createDefaultInfoTemplates: true,
        draggable: false,
        layerSeparator: '||',
        allLayersId: '***',
        excludedFields: [
            'objectid', 'esri_oid', 'shape',
            'shape.len', 'shape_length',
            'shape_len', 'shape.stlength()',
            'shape.area', 'shape_area', 'shape.starea()'
        ],
        /**
         * field type mappings to their default formatter functions
         * overriding this object will globally replace the default
         * formatter function for the field type
         * @type {Object<Function>}
         */
        defaultFormatters: {
            'esriFieldTypeSmallInteger': Formatters.formatInt,
            'esriFieldTypeInteger': Formatters.formatInt,
            'esriFieldTypeSingle': Formatters.formatFloat,
            'esriFieldTypeDouble': Formatters.formatFloat,
            'esriFieldTypeDate': Formatters.formatDate
        },

        postCreate: function () {
            this.inherited(arguments);
            if (!this.identifies) {
                this.identifies = {};
            }
            this.layers = [];
            this.addLayerInfos(this.layerInfos);

            this.own(topic.subscribe('mapClickMode/currentSet', lang.hitch(this, 'setMapClickMode')));
            this.own(topic.subscribe('identify/addLayerInfos', lang.hitch(this, 'addLayerInfos')));

            this.map.on('click', lang.hitch(this, function (evt) {
                if (this.mapClickMode === 'identify') {
                    this.executeIdentifyTask(evt);
                }
            }));
            if (this.mapRightClickMenu) {
                this.addRightClickMenu();
            }

            // rebuild the layer selection list when the map is updated
            // but only if we have a UI
            if (this.parentWidget) {
                this.createIdentifyLayerList();
                this.map.on('update-end', lang.hitch(this, function () {
                    this.createIdentifyLayerList();
                }));
            }

            if (this.draggable) {
                this.setupDraggable();
            }
        },
        /**
         * handles an array of layerInfos to call addLayerInfo for each layerInfo
         * @param {Array<layerInfo>} layerInfos The array of layer infos
         * @returns {undefined}
         */
        addLayerInfos: function (layerInfos) {
            array.forEach(layerInfos, lang.hitch(this, 'addLayerInfo'));
        },
        /**
         * Initializes an infoTemplate on a layerInfo.layer object if it doesn't
         * exist already.
         * @param {object} layerInfo A cmv layerInfo object that contains a layer property
         * @return {undefined}
         */
        addLayerInfo: function (layerInfo) {
            var lyrId = layerInfo.layer.id, layer = this.map.getLayer(lyrId),
                infoTemplate = null;
            if (layer) {
                var url = layer.url;

                // handle feature layers
                if (layer.declaredClass === 'esri.layers.FeatureLayer') {

                    // If is a feature layer that does not support
                    // Identify (Feature Service), create an
                    // infoTemplate for the graphic features. Create
                    // it only if one does not already exist.
                    if (layer.capabilities && array.indexOf(layer.capabilities.toLowerCase(), 'data') < 0) {
                        if (!layer.infoTemplate) {
                            infoTemplate = this.getInfoTemplate(layer, layer.layerId);
                            if (infoTemplate) {
                                layer.setInfoTemplate(infoTemplate);
                                var fieldInfos = infoTemplate.info.fieldInfos;
                                var formatters = array.filter(fieldInfos, function (info) {
                                    return (info.formatter);
                                });
                                if (formatters.length > 0) {
                                    layer.on('graphic-draw', lang.hitch(this, 'getFormattedFeature', layer.infoTemplate));
                                }
                            }
                        }
                    }

                    // If it is a feature Layer, we get the base url
                    // for the map service by removing the layerId.
                    var lastSL = url.lastIndexOf('/' + layer.layerId);
                    if (lastSL > 0) {
                        url = url.substring(0, lastSL);
                    }
                } else if (layer.layerInfos) {
                    array.forEach(layer.layerInfos, lang.hitch(this, function (subLayerInfo) {
                        var subLayerId = subLayerInfo.id;
                        if ((layerInfo.layerIds === null) || (array.indexOf(layerInfo.layerIds, subLayerId) >= 0)) {
                            this.getFeatureLayerForDynamicSublayer(layer, subLayerId);
                        }
                    }));
                }

                this.layers.push({
                    ref: layer,
                    layerInfo: layerInfo,
                    identifyTask: new IdentifyTask(url)
                });

                // rebuild the layer selection list when any layer is hidden
                // but only if we have a UI
                if (this.parentWidget) {
                    layer.on('visibility-change', lang.hitch(this, function (evt) {
                        if (evt.visible === false) {
                            this.createIdentifyLayerList();
                        }
                    }));
                }
            }
        },
        addRightClickMenu: function () {
            this.map.on('MouseDown', lang.hitch(this, function (evt) {
                this.mapRightClick = evt;
            }));
            this.mapRightClickMenu.addChild(new MenuItem({
                label: this.i18n.rightClickMenuItem.label,
                onClick: lang.hitch(this, 'handleRightClick')
            }));
        },
        setupDraggable: function () {
            var popups = null,
                handles = null,
                pointers = null,
                movable = null;
            // the popup, handle (title) and pointers (arrows)
            popups = query('div.esriPopup');
            handles = query('div.esriPopup div.titlePane div.title');
            pointers = query('div.esriPopup div.outerPointer, div.esriPopup div.pointer');

            if (popups.length > 0 && handles.length > 0) {
                domStyle.set(handles[0], 'cursor', 'move');
                movable = new Moveable(popups[0], {
                    handle: handles[0]
                });

                if (pointers.length > 0) {
                    // hide the pointer arrow when you move the popup
                    movable.onMoveStart = function () {
                        array.forEach(pointers, function (pointer) {
                            domClass.remove(pointer, 'left right top bottom topLeft topRight bottomLeft bottomRight');
                        });
                    };
                }
            }
        },
        executeIdentifyTask: function (evt) {
            var mapPoint = evt.mapPoint;
            var identifyParams = this.createIdentifyParams(mapPoint);
            var identifies = [];
            var identifiedlayers = [];
            var selectedLayer = this.getSelectedLayer();

            if (!this.checkForGraphicInfoTemplate(evt)) {
                // return;
                var layer = array.filter(this.layers, function (l) {
                    return l.ref.id === evt.graphic._layer.id;
                })[0];
                if (!layer) {
                    return;
                }
                identifiedlayers.push(layer);
                var d = new Deferred();
                identifies.push(d.promise);
                d.resolve([{feature: evt.graphic}]);
            }

            this.map.infoWindow.hide();
            this.map.infoWindow.clearFeatures();

            // don't identify on shift-click, ctrl-click or alt-click
            if (evt.shiftKey || evt.ctrlKey || evt.altKey) {
                return;
            }

            array.forEach(this.layers, lang.hitch(this, function (lyr) {
                var layerIds = this.getLayerIds(lyr, selectedLayer);
                if (layerIds.length > 0) {
                    var params = lang.clone(identifyParams);
                    params.layerDefinitions = lyr.ref.layerDefinitions;
                    params.layerIds = layerIds;
                    if (lyr.ref.timeInfo && lyr.ref.timeInfo.timeExtent && this.map.timeExtent) {
                        params.timeExtent = new TimeExtent(this.map.timeExtent.startTime, this.map.timeExtent.endTime);
                    }
                    identifies.push(lyr.identifyTask.execute(params));
                    identifiedlayers.push(lyr);
                }
            }));

            if (identifies.length > 0) {
                this.map.infoWindow.setTitle(this.i18n.mapInfoWindow.identifyingTitle);
                this.map.infoWindow.setContent('<div class="loading"></div>');
                this.map.infoWindow.show(mapPoint);
                all(identifies).then(lang.hitch(this, 'identifyCallback', identifiedlayers), lang.hitch(this, 'identifyError'));
            }
        },

        checkForGraphicInfoTemplate: function (evt) {
            if (evt.graphic) {
                // handle feature layers that come from a feature service
                // and may already have an info template
                var layer = evt.graphic._layer;
                if (layer.infoTemplate || (layer.capabilities && array.indexOf(layer.capabilities.toLowerCase(), 'data') < 0)) {
                    return false;
                }

                if (!this.ignoreOtherGraphics) {
                    // handles graphic from another type of graphics layer
                    // added to the map and so the identify is not found
                    if (!this.identifies.hasOwnProperty(layer.id)) {
                        return false;
                    }
                    // no layerId (graphics) or sublayer not defined
                    if (isNaN(layer.layerId) || !this.identifies[layer.id].hasOwnProperty(layer.layerId)) {
                        return false;
                    }
                }

            }

            return true;
        },

        createIdentifyParams: function (point) {
            var identifyParams = new IdentifyParameters();
            identifyParams.tolerance = this.identifyTolerance;
            identifyParams.returnGeometry = true;
            identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
            identifyParams.geometry = point;
            identifyParams.mapExtent = this.map.extent;
            identifyParams.width = this.map.width;
            identifyParams.height = this.map.height;
            identifyParams.spatialReference = this.map.spatialReference;

            return identifyParams;
        },

        getSelectedLayer: function () {
            var selectedLayer = this.allLayersId; // default is all layers
            // if we have a UI, then get the selected layer
            if (this.parentWidget) {
                var form = this.identifyFormDijit.get('value');
                if (!form.identifyLayer || form.identifyLayer === '') {
                    this.identifyLayerDijit.set('value', selectedLayer);
                } else {
                    selectedLayer = form.identifyLayer;
                }
            }
            return selectedLayer;
        },

        getLayerIds: function (layer, selectedLayer) {
            var arrIds = selectedLayer.split(this.layerSeparator);
            var allLayersId = this.allLayersId;
            var ref = layer.ref,
                selectedIds = layer.layerInfo.layerIds;
            var layerIds = [];
            if (ref.visible) {
                if (arrIds[0] === allLayersId || ref.id === arrIds[0]) {
                    if (arrIds.length > 1 && arrIds[1]) { // layer explicity requested
                        layerIds = [arrIds[1]];
                    } else if ((ref.declaredClass === 'esri.layers.FeatureLayer') && !isNaN(ref.layerId)) { // feature layer
                        // do not allow feature layer that does not support
                        // Identify (Feature Service)
                        if (ref.capabilities && array.indexOf(ref.capabilities.toLowerCase(), 'data') >= 0) {
                            layerIds = [ref.layerId];
                        }
                    } else if (ref.layerInfos) {
                        layerIds = this.getLayerInfos(ref, selectedIds);
                    }
                }
            }
            return layerIds;
        },

        getLayerInfos: function (ref, selectedIds) {
            var layerIds = [];
            array.forEach(ref.layerInfos, lang.hitch(this, function (layerInfo) {
                if (!this.includeSubLayer(layerInfo, ref, selectedIds)) {
                    return;
                }
                layerIds.push(layerInfo.id);
            }));
            return layerIds;

        },

        identifyCallback: function (identifiedlayers, responseArray) {
            var fSet = [];
            array.forEach(responseArray, function (response, i) {
                var ref = identifiedlayers[i].ref;
                array.forEach(response, function (result) {
                    result.feature.geometry.spatialReference = this.map.spatialReference; //temp workaround for ags identify bug. remove when fixed.
                    var feature = result.feature;
                    if (typeof feature.infoTemplate === 'undefined') {
                        var infoTemplate = this.getInfoTemplate(ref, null, result);
                        if (infoTemplate) {
                            if (result.layerId && ref.layerInfos && infoTemplate.info.showAttachments) {
                                result.feature._layer = this.getFeatureLayerForDynamicSublayer(ref, result.layerId);
                            }
                            var featureInfoTemplate = this.buildExpressionInfos(lang.clone(infoTemplate), feature);
                            feature.setInfoTemplate(featureInfoTemplate);
                        } else {
                            return;
                        }
                    }
                    if (feature && feature.infoTemplate && feature.infoTemplate.info) {
                        feature = this.getFormattedFeature(feature);
                    }
                    fSet.push(feature);
                }, this);
            }, this);
            this.map.infoWindow.setFeatures(fSet);
        },
        getFormattedFeature: function (feature) {
            var infoTemplate = feature.infoTemplate;
            if (feature.graphic) {
                feature = feature.graphic;
            }
            array.forEach(infoTemplate.info.fieldInfos, function (info) {
                if (typeof info.formatter === 'function') {
                    feature.attributes[info.fieldName] = info.formatter(feature.attributes[info.fieldName], feature.attributes, lang.clone(feature.geometry));
                }
            });
            return feature;
        },
        buildExpressionInfos: function (infoTemplate, feature) {
            if (feature.graphic) {
                feature = feature.graphic;
            }
            if (feature && infoTemplate && infoTemplate.info && (typeof infoTemplate.getExpressionInfo === 'function')) {
                var info = infoTemplate.info;
                var expressionInfos = info.expressionInfos || [];
                array.forEach(info.fieldInfos, function (fieldInfo) {
                    if (typeof fieldInfo.formatter === 'function' && fieldInfo.useExpression !== false) {
                        var name = fieldInfo.fieldName.toLowerCase() + '-formatted';
                        var expression = 'return \'' + fieldInfo.formatter(feature.attributes[fieldInfo.fieldName], feature.attributes, lang.clone(feature.geometry)) + '\'';
                        fieldInfo.fieldName = 'expression/' + name;
                        expressionInfos = array.filter(expressionInfos, function (expressionInfo) {
                            return (expressionInfo.name !== name);
                        });
                        expressionInfos.push({
                            name: name,
                            title: fieldInfo.label || ' ',
                            expression: expression
                        });
                        fieldInfo.formatter = null;
                    }
                });
                info.expressionInfos = expressionInfos;
                infoTemplate = new PopupTemplate(info);
            }
            return infoTemplate;
        },
        identifyError: function (err) {
            this.map.infoWindow.hide();
            topic.publish('viewer/handleError', {
                source: 'Identify',
                error: err
            });
        },
        handleRightClick: function () {
            this.executeIdentifyTask(this.mapRightClick);
        },

        getInfoTemplate: function (layer, layerId, result) {
            var popup = null,
                config = null;
            if (result) {
                layerId = typeof result.layerId === 'number' ? result.layerId : layer.layerId;
            } else if (layerId === null) {
                layerId = layer.layerId;
            }

            var ids = this.identifies;
            if (ids.hasOwnProperty(layer.id)) {
                if (ids[layer.id].hasOwnProperty(layerId)) {
                    popup = ids[layer.id][layerId];
                    if (popup instanceof PopupTemplate) {
                        return popup;
                    }
                }
            } else {
                ids[layer.id] = {};
            }

            // by mixin in the users config with the default props we can
            // generate a config object that provides the basics automatically
            // while letting the user override only the parts they want...like mediaInfos
            config = lang.mixin(this.createDefaultInfoTemplate(layer, layerId, result), ids[layer.id][layerId] || {});

            popup = ids[layer.id][layerId] = new PopupTemplate(config);
            if (config.content) {
                popup.setContent(config.content);
            }

            return ids[layer.id][layerId];
        },

        createDefaultInfoTemplate: function (layer, layerId, result) {
            var popup = null,
                fieldInfos = [];

            var layerName = this.getLayerName(layer);
            if (result) {
                layerName = result.layerName;
            }

            // from the results
            if (result && result.feature) {
                var attributes = result.feature.attributes;
                if (attributes) {
                    for (var prop in attributes) {
                        if (attributes.hasOwnProperty(prop)) {
                            this.addDefaultFieldInfo(fieldInfos, {
                                fieldName: prop,
                                label: this.makeSentenceCase(prop),
                                visible: true
                            });
                        }
                    }
                }

                // from the outFields of the layer
            } else if (layer._outFields && (layer._outFields.length) && (layer._outFields[0] !== '*')) {

                var fields = layer.fields;
                array.forEach(layer._outFields, lang.hitch(this, function (fieldName) {
                    var foundField = array.filter(fields, function (field) {
                        return (field.name === fieldName);
                    });
                    if (foundField.length > 0) {
                        this.addDefaultFieldInfo(fieldInfos, {
                            fieldName: foundField[0].name,
                            label: foundField[0].alias,
                            visible: true
                        });
                    }
                }));

                // from the fields layer
            } else if (layer.fields) {

                array.forEach(layer.fields, lang.hitch(this, function (field) {
                    this.addDefaultFieldInfo(fieldInfos, {
                        fieldName: field.name,
                        label: field.alias === field.name ? this.makeSentenceCase(field.name) : field.alias,
                        visible: true
                    });
                }));
            }

            if (fieldInfos.length > 0) {
                popup = {
                    title: layerName,
                    fieldInfos: fieldInfos,
                    showAttachments: (layer.hasAttachments)
                };
            }

            return popup;
        },
        /**
         * converts a string to a nice sentence case format
         * @url http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
         * @param  {string} str The string to convert
         * @return {string}     The converted string
         */
        makeSentenceCase: function (str) {
            if (!str.length) {
                return '';
            }
            str = str.toLowerCase().replace(/_/g, ' ').split(' ');
            for (var i = 0; i < str.length; i++) {
                str[i] = str[i].charAt(0).toUpperCase() + (str[i].substr(1).length ? str[i].substr(1) : '');
            }
            return (str.length ? str.join(' ') : str);
        },

        addDefaultFieldInfo: function (fieldInfos, field) {
            var nameLC = field.fieldName.toLowerCase();
            if (array.indexOf(this.excludedFields, nameLC) < 0) {
                fieldInfos.push(field);
            }
        },

        createIdentifyLayerList: function () {
            var id = null;
            var identifyItems = [];
            var selectedId = this.identifyLayerDijit.get('value');
            var sep = this.layerSeparator;

            array.forEach(this.layers, lang.hitch(this, function (layer) {
                var ref = layer.ref,
                    selectedIds = layer.layerInfo.layerIds;
                // only include layers that are currently visible
                if (ref.visible) {
                    var name = this.getLayerName(layer);
                    if ((ref.declaredClass === 'esri.layers.FeatureLayer') && !isNaN(ref.layerId)) { // feature layer
                        identifyItems.push({
                            name: name,
                            id: ref.id + sep + ref.layerId
                        });
                        // previously selected layer is still visible so keep it selected
                        if (ref.id + sep + ref.layerId === selectedId) {
                            id = selectedId;
                        }
                    } else { // dynamic layer
                        array.forEach(ref.layerInfos, lang.hitch(this, function (layerInfo) {
                            if (!this.includeSubLayer(layerInfo, ref, selectedIds)) {
                                return;
                            }
                            identifyItems.push({
                                name: name + ' \\ ' + layerInfo.name,
                                id: ref.id + sep + layerInfo.id
                            });
                            // previously selected sublayer is still visible so keep it selected
                            if (ref.id + sep + layerInfo.id === selectedId) {
                                id = selectedId;
                            }
                        }));
                    }
                }
            }));

            identifyItems.sort(function (a, b) {
                return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
            });

            this.identifyLayerDijit.set('disabled', (identifyItems.length < 1));
            if (identifyItems.length > 0) {
                identifyItems.unshift({
                    name: this.i18n.labels.allVisibleLayers,
                    id: '***'
                });
                if (!id) {
                    id = identifyItems[0].id;
                }
            }
            var identify = new Memory({
                data: identifyItems
            });
            this.identifyLayerDijit.set('store', identify);
            this.identifyLayerDijit.set('value', id);
        },

        includeSubLayer: function (layerInfo, ref, selectedIds) {
            // exclude group layers
            if (layerInfo.subLayerIds !== null) {
                return false;
            }

            if (this.isDefaultLayerVisibility(ref) && !this.checkVisibilityRecursive(ref, layerInfo.id)) {
                return false;
            } else if (array.indexOf(ref.visibleLayers, layerInfo.id) < 0) {
                return false;
            }
            // only include sublayers that are within the current map scale
            if (!this.layerVisibleAtCurrentScale(layerInfo)) {
                return false;
            }

            // restrict which layers are included
            if (selectedIds) {
                if (array.indexOf(selectedIds, layerInfo.id) < 0) {
                    return false;
                }
            }

            // don't allow the layer if we don't have an  infoTemplate
            // already and creating a default one is not desired
            if (!this.createDefaultInfoTemplates) {
                var infoTemplate = this.getInfoTemplate(ref, layerInfo.id);
                if (!infoTemplate) {
                    return false;
                }
            }

            // all tests pass so include this sublayer
            return true;
        },

        /**
         * recursively check all a layer's parent(s) layers for visibility
         * this only needs to be done if the layers visibleLayers array is
         * set to the default visibleLayers. After setVisibleLayers
         * is called the first time group layers are NOT included.
         * @param  {esri/layers/DynamicMapServiceLayer} layer The layer reference
         * @param  {Integer} id   The sublayer id to check for visibility
         * @return {Boolean}      Whether or not the sublayer is visible based on its parent(s) visibility
         */
        checkVisibilityRecursive: function (layer, id) {
            var layerInfos = array.filter(layer.layerInfos, function (layerInfo) {
                return (layerInfo.id === id);
            });
            if (layerInfos.length > 0) {
                var info = layerInfos[0];
                if (layer.visibleLayers.indexOf(id) !== -1 &&
                    (info.parentLayerId === -1 || this.checkVisibilityRecursive(layer, info.parentLayerId))) {
                    return true;
                }
            }
            return false;
        },
        /**
         * check each defaultVisibility and if its not in the visibleLayers
         * array, then the layer has non-default layer visibility
         * @param  {esri/layers/DynamicMapServiceLayer} layer The layer reference
         * @return {Boolean}       Whether or not we're operating with the default visibleLayers array or not
         */
        isDefaultLayerVisibility: function (layer) {
            for (var i = 0; i < layer.layerInfos.length; i++) {
                var item = layer.layerInfos[i];
                if (item.defaultVisibility && layer.visibleLayers.indexOf(item.id) === -1) {
                    return false;
                }
            }
            return true;
        },

        getLayerName: function (layer) {
            var name = null;
            if (layer.layerInfo) {
                name = layer.layerInfo.title;
            }
            if (!name) {
                array.forEach(this.layers, function (lyr) {
                    if (lyr.ref.id === layer.id) {
                        name = lyr.layerInfo.title;
                        return;
                    }
                });
            }
            if (!name) {
                name = layer.name;
                if (!name && layer.ref) {
                    name = layer.ref._titleForLegend; // fall back to old method using title from legend
                }
            }
            return name;
        },

        getFeatureLayerForDynamicSublayer: function (layer, layerId) {
            if (!layer.layerInfos) {
                return false;
            }
            var key = layer.url + '/' + layerId;
            if (!this.featureLayers.hasOwnProperty(key)) {
                this.featureLayers[key] = new FeatureLayer(key);
            }
            return this.featureLayers[key];
        },

        layerVisibleAtCurrentScale: function (layer) {
            var mapScale = this.map.getScale();
            return !(((layer.maxScale !== 0 && mapScale < layer.maxScale) || (layer.minScale !== 0 && mapScale > layer.minScale)));
        },

        setMapClickMode: function (mode) {
            this.mapClickMode = mode;
            var map = this.map;
            array.forEach(map.graphicsLayerIds, function (layerID) {
                var layer = map.getLayer(layerID);
                if (layer) {
                    // add back any infoTemplates that
                    // had been previously removed
                    if (mode === 'identify') {
                        if (this.infoTemplates[layer.id]) {
                            layer.infoTemplate = lang.clone(this.infoTemplates[layer.id]);
                        }
                    // remove any infoTemplates that might
                    // interfere with clicking on a feature
                    } else if (layer.infoTemplate) {
                        this.infoTemplates[layer.id] = lang.clone(layer.infoTemplate);
                        layer.infoTemplate = null;
                    }
                }
            }, this);
        }
    });
});

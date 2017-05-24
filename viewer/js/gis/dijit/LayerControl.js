define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/dom-attr',
    'dojo/dom-construct',
    'dijit/_WidgetBase',
    'dijit/_Container',
    'dijit/layout/ContentPane',
    'dijit/form/Button',
    'esri/tasks/ProjectParameters',
    'esri/config',
    'require',
    'xstyle/css!./LayerControl/css/LayerControl.css'
], function (
    declare,
    array,
    lang,
    topic,
    domAttr,
    domConst,
    WidgetBase,
    Container,
    ContentPane,
    Button,
    ProjectParameters,
    esriConfig,
    require
) {

    var LayerControl = declare([WidgetBase, Container], {
        map: null,
        layerInfos: [],
        icons: {
            expand: 'fa-caret-right fa-fw layerControlIcon-Expand',
            collapse: 'fa-caret-down fa-fw layerControlIcon-Collapse',
            checked: 'fa-check fa-fw fa-border layerControlIcon-Checked',
            unchecked: 'fa-square fa-fw fa-border layerControlIcon-Unchecked',
            indeterminate: 'fa-minus fa-fw fa-border layerControlIcon-Indeterminate',
            update: 'fa-refresh layerControlIcon-Update',
            menu: 'fa-bars layerControlIcon-Menu',
            folder: 'fa-folder-o fa-fw layerControlIcon-Folder',
            folderOpen: 'fa-folder-open-o fa-fw layerControlIcon-Folder layerControlIcon-FolderOpen'
        },
        separated: false,
        overlayReorder: false,
        overlayLabel: false,
        vectorReorder: false,
        vectorLabel: false,
        noMenu: null,
        noLegend: null,
        noZoom: null,
        noTransparency: null,
        menu: {},
        subLayerMenu: {},
        swipe: null,
        swiperButtonStyle: 'position:absolute;top:20px;left:120px;z-index:50;',
        // ^args
        baseClass: 'layerControlDijit',
        _vectorContainer: null,
        _overlayContainer: null,
        _swiper: null,
        _swipeLayerToggleHandle: null,
        _groupedLayerInfos: {},
        _controls: {
            dynamic: './LayerControl/controls/Dynamic',
            feature: './LayerControl/controls/Feature',
            image: './LayerControl/controls/Image',
            tiled: './LayerControl/controls/Tiled',
            csv: './LayerControl/controls/CSV',
            georss: './LayerControl/controls/GeoRSS',
            wms: './LayerControl/controls/WMS',
            wfs: './LayerControl/controls/WFS',
            kml: './LayerControl/controls/KML',
            vectortile: './LayerControl/controls/VectorTile',
            webtiled: './LayerControl/controls/WebTiled',
            imagevector: './LayerControl/controls/ImageVector',
            raster: './LayerControl/controls/Raster',
            stream: './LayerControl/controls/Stream',
            grouped: './LayerControl/controls/Grouped',
            graphics: './LayerControl/controls/Graphics',
            osm: './LayerControl/controls/OpenStreetMap'
        },
        constructor: function (options) {
            options = options || {};
            if (!options.map) {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl',
                    error: 'map option is required'
                });
                return;
            }
            // add any user-defined controls - possibly for user-defined layers
            this._controls = lang.mixin(this._controls, options.controls || {});
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.separated) {
                var ControlContainer = declare([WidgetBase, Container]);
                // vector layer label
                if (this.vectorLabel !== false) {
                    this.addChild(new ContentPane({
                        className: 'vectorLabelContainer',
                        content: this.vectorLabel
                    }, domConst.create('div')), 'first');
                }
                // vector layer control container
                this._vectorContainer = new ControlContainer({
                    className: 'vectorLayerContainer'
                }, domConst.create('div'));
                this.addChild(this._vectorContainer, 'last');
                // overlay layer label
                if (this.overlayLabel !== false) {
                    this.addChild(new ContentPane({
                        className: 'overlayLabelContainer',
                        content: this.overlayLabel
                    }, domConst.create('div')), 'last');
                }
                // overlay layer control container
                this._overlayContainer = new ControlContainer({
                    className: 'overlayLayerContainer'
                }, domConst.create('div'));
                this.addChild(this._overlayContainer, 'last');
            } else {
                this.overlayReorder = false;
                this.vectorReorder = false;
            }
            this._addLayerControls(this.layerInfos);
            this._subscribeToTopics();
        },
        _subscribeToTopics: function () {
            this._removeLayerControlsHandler = topic.subscribe('layerControl/removeLayerControls', lang.hitch(this, function (layers) {
                this._removeLayerControls(layers);
            }));
            this._addLayerControlsHandler = topic.subscribe('layerControl/addLayerControls', lang.hitch(this, function (layerInfos) {
                this._addLayerControls(layerInfos);
            }));
        },
        _addLayerControls: function (layerInfos) {
            // load only the modules we need
            var modules = [];
            // push layer control mods
            array.forEach(layerInfos, function (layerInfo) {
                layerInfo.controlOptions = layerInfo.controlOptions || {};
                // check if control is excluded
                var controlOptions = layerInfo.controlOptions;
                if (controlOptions.exclude === true) {
                    return;
                }
                // if layerGroups are used, disallow re-ordering
                if (controlOptions.layerGroup) {
                    this.overlayReorder = false;
                    this.vectorReorder = false;
                }
                var mod = this._controls[layerInfo.type];
                if (mod) {
                    modules.push(mod);
                } else {
                    topic.publish('viewer/handleError', {
                        source: 'LayerControl',
                        error: 'the layer type "' + layerInfo.type + '" is not supported'
                    });
                }
            }, this);
            // load and go
            require(modules, lang.hitch(this, function () {
                array.forEach(layerInfos, function (layerInfo) {
                    // exclude from widget
                    var controlOptions = layerInfo.controlOptions;
                    if (controlOptions.exclude === true) {
                        return;
                    }
                    var control = this._controls[layerInfo.type];
                    if (control) {
                        require([control], lang.hitch(this, '_addControl', layerInfo));
                    }
                }, this);

                for (var key in this._groupedLayerInfos) {
                    if (this._groupedLayerInfos.hasOwnProperty(key)) {
                        var layerDetails = this._groupedLayerInfos[key];
                        if (layerDetails && layerDetails.length > 1) {
                            var control = this._controls.grouped;
                            var layerInfo = {
                                title: key,
                                type: 'grouped',
                                controlOptions: {},
                                layer: {
                                    id: key.replace(/\s/g, ''),
                                    loaded: true,
                                    getMap: lang.hitch(this, function () {
                                        return this.map;
                                    }),
                                    minScale: 0,
                                    maxScale: 0,
                                    _params: {}
                                },
                                layerDetails: layerDetails
                            };
                            require([control], lang.hitch(this, '_addControl', layerInfo));
                        }
                    }
                }

                this._checkReorder();
            }));
        },
        // remove the control given an array of layers
        _removeLayerControls: function (layers) {
            // helper function to determine which children's layer have a match in the layers parameter
            function _filterList (entry) {
                return layers.reduce(function (prior, curr) {
                    return (curr === entry.layer) || prior;
                }, false);
            }
            // get a list of ALL the layers that meet the criteria
            var layerControlList = this._overlayContainer.getChildren().filter(function (c) {
                return _filterList(c);
            }).concat(
            this._vectorContainer.getChildren().filter(function (c) {
                return _filterList(c);
            })).concat(
            this.getChildren().filter(function (c) {
                return _filterList(c);
            }));
            // follow the same logic as when the layers were added
            array.forEach(layerControlList, lang.hitch(this, function (layerControl) {
                if (this.separated) {
                    if (layerControl._layerType === 'overlay') {
                        this._overlayContainer.removeChild(layerControl);
                    } else {
                        this._vectorContainer.removeChild(layerControl);
                    }
                } else {
                    this.removeChild(layerControl);
                }
                layerControl.destroy();
            }));
        },
        // create layer control and add to appropriate _container
        _addControl: function (layerInfo, Control) {
            var layer = (typeof layerInfo.layer === 'string') ? this.map.getLayer(layerInfo.layer) : layerInfo.layer;
            if (layerInfo.type === 'dynamic' || layerInfo.type === 'feature') {
                if (layer.loaded) {
                    this._applyLayerControlOptions(layerInfo.controlOptions, layer);
                } else {
                    layer.on('load', lang.hitch(this, '_applyLayerControlOptions', layerInfo.controlOptions));
                }
            }
            var layerControl = new Control({
                controller: this,
                layer: layer,
                layerTitle: layerInfo.title,
                layerDetails: layerInfo.layerDetails,
                controlOptions: lang.mixin({
                    noLegend: null,
                    noZoom: null,
                    noTransparency: null,
                    swipe: null,
                    expanded: false,
                    sublayers: true,
                    layerGroup: null,
                    menu: this.menu[layerInfo.type],
                    subLayerMenu: this.subLayerMenu[layerInfo.type]
                }, layerInfo.controlOptions)
            });
            layerControl.startup();
            var position = layerInfo.position || 0;
            var layerType = layerControl._layerType;
            if (layerType === 'grouped') {
                if (layerControl.layerDetails && layerControl.layerDetails.length > 0) {
                    layerControl._layerType = layerControl.layerDetails[0].layerControl._layerType;
                }
            }
            if (this.separated) {
                if (layerType === 'overlay') {
                    this._overlayContainer.addChild(layerControl, position);
                } else {
                    this._vectorContainer.addChild(layerControl, position);
                }
            } else {
                this.addChild(layerControl, position);
            }
            this._storeGroupedLayerInfo(layerInfo, layerControl);
        },
        _storeGroupedLayerInfo: function (layerInfo, layerControl) {
            if (!layerInfo.controlOptions.layerGroup) {
                // Not a grouped layer
                return;
            }
            var layerGroup = layerInfo.controlOptions.layerGroup;
            if (!this._groupedLayerInfos.hasOwnProperty(layerGroup)) {
                this._groupedLayerInfos[layerGroup] = [];
            }

            this._groupedLayerInfos[layerGroup].push({
                layerInfo: layerInfo,
                layerControl: layerControl
            });
        },
        _applyLayerControlOptions: function (controlOptions, layer) {
            if (typeof controlOptions.includeUnspecifiedLayers === 'undefined' && typeof controlOptions.subLayerInfos === 'undefined' && typeof controlOptions.excludedLayers === 'undefined') {
                return;
            }
            var esriLayerInfos = [];
            // Case 1: only show the layers that are explicitly listed
            if (!controlOptions.includeUnspecifiedLayers && controlOptions.subLayerInfos && controlOptions.subLayerInfos.length !== 0) {
                var subLayerInfos = array.map(controlOptions.subLayerInfos, function (sli) {
                    return sli.id;
                });
                array.forEach(layer.layerInfos, function (li) {
                    if (array.indexOf(subLayerInfos, li.id) !== -1) {
                        esriLayerInfos.push(li);
                    }
                });
            // Case 2: show ALL layers except those in the excluded list
            } else if (controlOptions.excludedLayers) {
                array.forEach(layer.layerInfos, function (li) {
                    if (array.indexOf(controlOptions.excludedLayers, li.id) === -1) {
                        esriLayerInfos.push(li);
                    }
                });
			// Case 3: just override the values found in the subLayerInfos
            } else if (controlOptions.subLayerInfos) {
                // show ALL layers that are in the map service's layerInfos, but take care to override the properties of each subLayerInfo as configured
                this._mixinLayerInfos(layer.layerInfos, controlOptions.subLayerInfos);
                this._setSublayerVisibilities(layer);
                return;
            }
            // Finally, if we made use of the esriLayerInfos, make sure to apply all the subLayerInfos that were defined to our new array of esri layer infos
            if (controlOptions.subLayerInfos) {
                this._mixinLayerInfos(esriLayerInfos, controlOptions.subLayerInfos);
            }
            layer.layerInfos = esriLayerInfos;
            this._setSublayerVisibilities(layer);
        },
        _setSublayerVisibilities: function (layer) {
            var visibleIds = array.map(array.filter(layer.layerInfos, function (li) {
                return li.defaultVisibility;
            }), function (l) {
                return l.id;
            });
            layer.setVisibleLayers(visibleIds);
        },
        _mixinLayerInfos: function (esriLayerInfos, subLayerInfos) {
            // for each of the sublayers, go through the subLayerInfos from the controlOptions and see if defaultVisiblity is set to true or false
            // then set each of the layer.layerInfos defaultVisibility appropriately
			// assume defaultVisibility is true if it's not defined
            if (subLayerInfos && subLayerInfos.length !== 0) {
                array.forEach(subLayerInfos, function (sli) {
                    if (typeof sli.defaultVisibility === 'undefined') {
                        sli.defaultVisibility = true;
                    }
                });
                array.forEach(esriLayerInfos, function (li) {
                    var sli = array.filter(subLayerInfos, function (s) {
                        return s.id === li.id;
                    }).shift();
                    if (sli) {
                        lang.mixin(li, sli);
                    }
                });
            }
        },
        // move control up in controller and layer up in map
        _moveUp: function (control) {
            var id = control.layer.id,
                node = control.domNode,
                index;
            if (control._layerType === 'overlay') {
                if (control.getPreviousSibling()) {
                    index = array.indexOf(this.map.layerIds, id);
                    this.map.reorderLayer(id, index + 1);
                    this._overlayContainer.containerNode.insertBefore(node, node.previousSibling);
                    this._checkReorder();
                }
            } else if (control._layerType === 'vector') {
                if (control.getPreviousSibling()) {
                    index = array.indexOf(this.map.graphicsLayerIds, id);
                    this.map.reorderLayer(id, index + 1);
                    this._vectorContainer.containerNode.insertBefore(node, node.previousSibling);
                    this._checkReorder();
                }
            }
        },
        // move control down in controller and layer down in map
        _moveDown: function (control) {
            var id = control.layer.id,
                node = control.domNode,
                index;
            if (control._layerType === 'overlay') {
                if (control.getNextSibling()) {
                    index = array.indexOf(this.map.layerIds, id);
                    this.map.reorderLayer(id, index - 1);
                    this._overlayContainer.containerNode.insertBefore(node, node.nextSibling.nextSibling);
                    this._checkReorder();
                }
            } else if (control._layerType === 'vector') {
                if (control.getNextSibling()) {
                    index = array.indexOf(this.map.graphicsLayerIds, id);
                    this.map.reorderLayer(id, index - 1);
                    this._vectorContainer.containerNode.insertBefore(node, node.nextSibling.nextSibling);
                    this._checkReorder();
                }
            }
        },
        // enable/disable move up/down menu items when the last or first child respectively
        _checkReorder: function () {
            if (this.separated) {
                if (this.vectorReorder) {
                    array.forEach(this._vectorContainer.getChildren(), function (child) {
                        if (child._reorderUp) {
                            if (!child.getPreviousSibling()) {
                                child._reorderUp.set('disabled', true);
                            } else {
                                child._reorderUp.set('disabled', false);
                            }
                        }
                        if (child._reorderDown) {
                            if (!child.getNextSibling()) {
                                child._reorderDown.set('disabled', true);
                            } else {
                                child._reorderDown.set('disabled', false);
                            }
                        }
                    }, this);
                }
                if (this.overlayReorder) {
                    array.forEach(this._overlayContainer.getChildren(), function (child) {
                        if (child._reorderUp) {
                            if (!child.getPreviousSibling()) {
                                child._reorderUp.set('disabled', true);
                            } else {
                                child._reorderUp.set('disabled', false);
                            }
                        }
                        if (child._reorderDown) {
                            if (!child.getNextSibling()) {
                                child._reorderDown.set('disabled', true);
                            } else {
                                child._reorderDown.set('disabled', false);
                            }
                        }
                    }, this);
                }
            }
        },
        // zoom to layer
        _zoomToLayer: function (layer) {
            if (layer.declaredClass === 'esri.layers.KMLLayer') {
                return;
            }

            // need to "merge" each kml layers fullExtent for project geometries

            var map = this.map;
            if (layer.spatialReference === map.spatialReference) {
                map.setExtent(layer.fullExtent, true);
            } else if (esriConfig.defaults.geometryService) {
                esriConfig.defaults.geometryService.project(lang.mixin(new ProjectParameters(), {
                    geometries: [layer.fullExtent],
                    outSR: map.spatialReference
                }), function (r) {
                    map.setExtent(r[0], true);
                }, function (e) {
                    topic.publish('viewer/handleError', {
                        source: 'LayerControl._zoomToLayer',
                        error: e
                    });
                });
            } else {
                topic.publish('viewer/handleError', {
                    source: 'LayerControl._zoomToLayer',
                    error: 'esriConfig.defaults.geometryService is not set'
                });
            }
        },
        // layer swiper
        _swipeLayer: function (layer, type) {
            if (!layer || !layer.visible) {
                return;
            }
            if (!this._swiper) {
                require(['esri/dijit/LayerSwipe'], lang.hitch(this, function (LayerSwipe) {
                    this._swiper = new LayerSwipe({
                        type: type || 'vertical',
                        map: this.map,
                        layers: [layer]
                    }, domConst.create('div', {}, this.map.id, 'first'));
                    this._swiper.startup();
                    this._swiper.disableBtn = new Button({
                        label: 'Exit Layer Swipe',
                        onClick: lang.hitch(this, '_swipeDisable')
                    }, domConst.create('div', {}, this.map.id));
                    domAttr.set(this._swiper.disableBtn.domNode, 'style', this.swiperButtonStyle);
                }));
            } else {
                this._swiper.disable();
                if (this._swipeLayerToggleHandle) {
                    this._swipeLayerToggleHandle.remove();
                }
                this._swiper.set('layers', [layer]);
                this._swiper.set('type', type);
                this._swiper.enable();
                domAttr.set(this._swiper.disableBtn.domNode, 'style', this.swiperButtonStyle);
            }
            this._swipeLayerToggleHandle = topic.subscribe('layerControl/layerToggle', lang.hitch(this, function (d) {
                if (d.id === layer.id && !d.visible) {
                    this._swipeDisable();
                }
            }));
        },
        _swipeDisable: function () {
            this._swiper.disable();
            if (this._swipeLayerToggleHandle) {
                this._swipeLayerToggleHandle.remove();
            }
            domAttr.set(this._swiper.disableBtn.domNode, 'style', 'display:none;');
        },
        // turn all layers on/off
        //   no arguments
        //   b/c controls are self aware of layer visibility change simply show/hide layers
        showAllLayers: function () {
            if (this.separated) {
                array.forEach(this._vectorContainer.getChildren(), function (child) {
                    child.layer.show();
                });
                array.forEach(this._overlayContainer.getChildren(), function (child) {
                    child.layer.show();
                });
            } else {
                array.forEach(this.getChildren(), function (child) {
                    child.layer.show();
                });
            }
        },
        hideAllLayers: function () {
            if (this.separated) {
                array.forEach(this._vectorContainer.getChildren(), function (child) {
                    child.layer.hide();
                });
                array.forEach(this._overlayContainer.getChildren(), function (child) {
                    child.layer.hide();
                });
            } else {
                array.forEach(this.getChildren(), function (child) {
                    child.layer.hide();
                });
            }
        }
    });
    return LayerControl;
});

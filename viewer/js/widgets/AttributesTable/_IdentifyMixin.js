define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',

    'esri/config',
    'esri/units',
    'dojo/number',
    'esri/tasks/IdentifyParameters',
    'esri/tasks/RelationshipQuery',
    'esri/tasks/IdentifyTask',
    'esri/tasks/BufferParameters'

], function (
    declare,
    lang,
    array,
    topic,

    esriConfig,
    units,
    num,
    IdentifyParameters,
    RelationshipQuery,
    IdentifyTask,
    BufferParameters
) {

    return declare(null, {

        results: null,

        identifyOptions: {},

        // for all the standard parameters, see for https://developers.arcgis.com/javascript/jsapi/identifyparameters-amd.html
        defaultIdentifyOptions: {
            identifyParameters: {
                type: 'spatial',
                url: null,
                layerID: null,
                objectIDs: null,
                outFields: ['*'],
                where: '1=1',
                distance: null,
                start: null,
                num: null,
                text: null,
                timeExtent: null,
                units: 'feet',

                identifyTolerance: 10,
                returnGeometry: true,
                layerOption: IdentifyParameters.LAYER_OPTION_VISIBLE,
                geometry: null,
                mapExtent: null,
                width: null,
                height: null,
                spatialReference: null,
                layerIds: null,
                layerDefinitions: null

            },

            // provide the parameters if there is a spatial query linked from a table/database query
            linkedQuery: {
                url: null,
                layerID: null,
                sublayerID: null,
                linkField: null,
                idProperty: null,
                linkIDs: [] // if linkedQuery, then store the linkedIDs for use in linked query
            },

            // allow a buffer to be performed before a spatial
            // query and then use the buffer geometry in the query
            // if showOnly = true, the buffer is displayed  but
            // the query is not run
            bufferParameters: {
                distance: null,
                unit: null,
                geodesic: true,
                showOnly: false
            },

            // executing a linked query?
            isLinkedQuery: false,

            // used for linkedQueries
            linkField: null,

            // default Unique ID
            // if null, will attempt to get a field of
            // type 'esriFieldTypeOID' from the results
            idProperty: null

        },

        isLinkedQuery: false,

        getIdentifyConfiguration: function (options) {
            options = this.mixinDeep(lang.clone(this.defaultIdentifyOptions), options);

            this.identifyParameters = options.identifyParameters;
            this.bufferParameters = options.bufferParameters;
            this.idProperty = options.idProperty;

            this.linkField = options.linkField;
            this.linkedQuery = options.linkedQuery;
            this.isLinkedQuery = false;
        },

        getLayer: function () {
            var layer = null;
            var ip = this.identifyParameters;

            if (ip.layerID) {
                layer = this.map.getLayer(ip.layerID);
            }

            return layer;
        },

        // Filter sublayers of the layer given, which is visible, included and not excluded
        filterSubLayers: function (layer, selectedIds) {
            var subLayerIds = [];

            array.forEach(layer.layerInfos, lang.hitch(this, function (layerInfo) {
                if (!this.includeSubLayer(layerInfo, layer, selectedIds)) {
                    return;
                }
                subLayerIds.push(layerInfo.id);
            }));

            return subLayerIds;
        },

        includeSubLayer: function (layerInfo, layer, selectedIds) {
            // exclude group layers
            if (layerInfo.subLayerIds !== null) {
                return false;
            }
            // only include sublayers that are currently visible
            if (array.indexOf(layer.visibleLayers, layerInfo.id) < 0) {
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

            // all tests pass so include this sublayer
            return true;
        },

        layerVisibleAtCurrentScale: function (layer) {
            var mapScale = this.map.getScale();
            return !(((layer.maxScale !== 0 && mapScale < layer.maxScale) || (layer.minScale !== 0 && mapScale > layer.minScale)));
        },

        createIdentifyParams: function () {
            var identifyParams = new IdentifyParameters();
            var ip = this.identifyParameters;
            var layer = this.getLayer();
            var subLayerIds,
                layerDefinitions = {};

            if (layer && layer.visible) {
                subLayerIds = this.filterSubLayers(layer);

                array.forEach(subLayerIds, function (subLayerId) {
                    layerDefinitions[subLayerId] = ip.where;
                }, this);
                layerDefinitions = lang.mixin(layer.layerDefinitions, layerDefinitions);
            }

            identifyParams.tolerance = ip.identifyTolerance;
            identifyParams.returnGeometry = this.featureOptions.features;
            identifyParams.layerOption = ip.layerOption;
            identifyParams.geometry = ip.bufferGeometry || ip.geometry;
            identifyParams.mapExtent = ip.mapExtent || this.map.extent;
            identifyParams.width = ip.width || this.map.width;
            identifyParams.height = ip.height || this.map.height;
            identifyParams.spatialReference = ip.spatialReference || this.map.spatialReference;

            identifyParams.layerDefinitions = layerDefinitions;
            identifyParams.layerIds = subLayerIds;

            return identifyParams;
        },

        executeIdentify: function (options) {
            if (this.executingIdentify === true) {
                return;
            }
            this.getConfiguration(options);

            this.clearFeatures();
            this.clearSelectedFeatures();

            if ((this.isLinkedQuery !== true || this.type === 'table') && (this.bufferParameters && !this.bufferParameters.showOnly)) {
                this.clearGrid();
            }

            if (this.featureOptions.buffer && this.bufferParameters && this.bufferParameters.distance) {
                this.executeBuffer();
                return;
            } else {
                this.featureOptions.buffer = false;
            }

            var url = this.getURL();
            if (!url) {
                return;
            }

            this.executingIdentify = true;

            if (this.growlOptions.loading && !this.isLinkedQuery) {
                this.growlID = this.topicID + 'Growl-StartSearch';
                var msg = lang.mixin(this.i18n.messages.searching, {
                    id: this.growlID,
                    timeout: (esriConfig.defaults.io.timeout + 5000),
                    showProgressBar: true
                });
                topic.publish('growler/growl', msg);
            }

            var it = new IdentifyTask(url);
            var identifyParams = null;
            if (this.identifyParameters === 'relationship') {

            } else {
                identifyParams = this.createIdentifyParams();
                it.execute(identifyParams, lang.hitch(this, 'processIdentifyResults'), lang.hitch(this, 'processIdentifyError'));
            }
        },

        executeLinkedQuery: function (lq) {
            var qp = this.identifyParameters;
            var linkField = lq.linkField || this.linkField;
            var type = lq.type || 'spatial';
            lq.type = type;

            if (!lq.linkIDs) {
                return;
            }
            lq.where = linkField + ' IN (' + lq.linkIDs.splice(',') + ')';
            delete lq.linkedIDs;

            if (!lq.outFields) {
                lq.outFields = [];
            }
            if (lq.returnGeometry !== false && (type === 'spatial')) {
                lq.returnGeometry = true;
            }
            if (!lq.distance && qp.distance) {
                lq.distance = qp.distance;
            }
            if (!lq.units && qp.units) {
                lq.units = qp.units;
            }
            if (!lq.geometry && qp.geometry) {
                lq.geometry = qp.geometry;
            }
            if (!lq.spatialRelationship && qp.spatialRelationship) {
                lq.spatialRelationship = qp.spatialRelationship;
            }

            this.executeIdentify({
                identifyOptions: {
                    identifyParameters: lq,
                    isLinkedQuery: true
                }
            });
        },

        executeBuffer: function () {
            this.clearBufferGraphics();

            var buffParams = new BufferParameters();
            buffParams.geometries = [this.identifyParameters.geometry];
            buffParams.distances = [this.bufferParameters.distance];
            buffParams.unit = this.bufferParameters.unit || units.FEET;
            buffParams.geodesic = this.bufferParameters.geodesic || true;
            buffParams.bufferSpatialReference = this.map.spatialReference;
            buffParams.outSpatialReference = this.map.spatialReference;

            esriConfig.defaults.geometryService.buffer(buffParams, lang.hitch(this, 'processBufferQueryResults'));
        },

        processIdentifyError: function (error) {
            this.clearGrowl();
            this.executingIdentify = false;

            var msg = lang.mixin(this.i18n.messages.searchError, {
                level: 'error',
                timeout: 5000
            });
            topic.publish('growler/growl', msg);
            topic.publish('viewer/handleError', {
                error: error
            });
        },

        processIdentifyResults: function (results) {
            this.clearGrowl();
            this.executingIdentify = false;

            if (!results) {
                return;
            }

            this.results = results;
            this.getFeaturesFromIdentifyResults();

            var recCount = this.getFeatureCount();
            var msgNls = this.i18n.messages.searchResults;
            var msg = msgNls.message;
            if (!msg) {
                if (recCount > 0) {
                    msg = num.format(recCount) + ' ';
                    msg += (recCount > 1) ? msgNls.features : msgNls.feature;
                    msg += ' ' + msgNls.found + '.';
                } else {
                    msg = msgNls.noFeatures;
                }
            }

            if (recCount > 0) {
                if (this.featureOptions.source && this.identifyParameters.geometry) {
                    this.addSourceGraphic(this.identifyParameters.geometry);
                }
                this.populateGrid();
            }

            if (this.growlOptions.results && !this.isLinkedQuery) {
                this.openPane();

                topic.publish('growler/growl', {
                    title: this.title + ' ' + msgNls.title,
                    message: msg,
                    level: 'default',
                    timeout: 5000
                });
            }

            topic.publish(this.topicID + '/queryResults', this.results);

            if (this.linkedQuery && (this.linkedQuery.url || this.linkedQuery.layerID)) {
                var lq = lang.clone(this.linkedQuery);
                this.executeLinkedQuery(lq);
            } else {
                this.isLinkedQuery = false;
            }

            this.linkedQuery = {
                url: null,
                linkIDs: []
            };
        },

        processBufferQueryResults: function (geometries) {
            var showOnly = this.bufferParameters.showOnly;

            // reset the buffer
            this.bufferParameters = lang.clone(this.defaultIdentifyOptions.bufferParameters);

            if (geometries && geometries.length > 0) {
                this.addBufferGraphic(geometries[0]);

                if (showOnly !== true) {
                    var qParams = lang.clone(this.identifyParameters);
                    qParams.bufferGeometry = geometries[0];

                    this.executeIdentify({
                        identifyOptions: {
                            identifyParameters: qParams,
                            bufferParameters: this.bufferParameters,
                            linkedQuery: this.linkedQuery,
                            linkField: this.linkField,
                            isLinkedQuery: this.isLinkedQuery
                        }
                    });

                } else {
                    if (this.featureOptions.source) {
                        this.addSourceGraphic(this.identifyParameters.geometry);
                        this.zoomToBufferGraphics();
                    }

                }
            }
        },

        getQueryResults: function () {
            return this.results;
        },

        hasLinkedQuery: function () {
            var lq = this.linkedQuery;
            if (this.linkField && lq && lq.linkField) {
                if (!lq.linkIDs) {
                    lq.linkIDs = [];
                }
                return true;
            }
            return false;
        },

        getURL: function () {
            var layer = this.getLayer();
            var url = layer.url;

            // handle feature layers
            if (layer.declaredClass === 'esri.layers.FeatureLayer') {
                // If it is a feature Layer, we get the base url
                // for the map service by removing the layerId.
                var lastSL = url.lastIndexOf('/' + layer.layerId);
                if (lastSL > 0) {
                    url = url.substring(0, lastSL);
                }
            }

            return url;
        }
    });
});

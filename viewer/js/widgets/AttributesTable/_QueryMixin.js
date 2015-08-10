define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',

    'esri/config',
    'esri/units',
    'dojo/number',
    'esri/tasks/query',
    'esri/tasks/RelationshipQuery',
    'esri/tasks/QueryTask',
    'esri/tasks/BufferParameters'

], function (
    declare,
    lang,
    array,
    topic,

    esriConfig,
    units,
    num,
    Query,
    RelationshipQuery,
    QueryTask,
    BufferParameters
) {

    return declare(null, {

        results: null,

        queryOptions: {},

        // for all the standard parameters, see for https://developers.arcgis.com/javascript/jsapi/query-amd.html
        defaultQueryOptions: {
            queryParameters: {
                type: 'spatial',
                outputSpatialReference: 4326,
                url: null,
                layerID: null,
                sublayerID: null,
                objectIDs: null,
                outFields: ['*'],
                where: '1=1',
                geometry: null,
                distance: null,
                start: null,
                num: null,
                text: null,
                timeExtent: null,
                units: 'feet',
                geometryPrecision: null,
                groupByFieldsForStatistics: null,
                orderByFields: null,
                outStatistics: null,
                pixelSize: null,
                relationParam: null,
                spatialRelationship: Query.SPATIAL_REL_INTERSECTS

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

        getQueryConfiguration: function (options) {
            options = this.mixinDeep(lang.clone(this.defaultQueryOptions), options);

            this.queryParameters = options.queryParameters;
            this.bufferParameters = options.bufferParameters;
            this.idProperty = options.idProperty;

            this.linkField = options.linkField;
            this.linkedQuery = options.linkedQuery;
            this.isLinkedQuery = false;
        },

        executeQuery: function (options) {
            if (this.executingQuery === true) {
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

            this.executingQuery = true;
            var qp = this.queryParameters;
            var qt = new QueryTask(url);
            var q = null;
            if (qp.type === 'relationship') {
                q = new RelationshipQuery();
            } else {
                q = new Query();
            }

            q.geometryPrecision = qp.geometryPrecision;
            q.maxAllowableOffset = qp.maxAllowableOffset;
            q.objectIds = qp.objectIDs;
            q.outFields = qp.outFields;
            q.outSpatialReference = qp.outSpatialReference || this.map.spatialReference;
            q.returnGeometry = this.featureOptions.features;
            q.where = qp.where;

            if (qp.type === 'spatial') {
                q.distance = qp.distance;
                q.geometry = qp.bufferGeometry || qp.geometry;
                q.groupByFieldsForStatistics = qp.groupByFieldsForStatistics;
                q.num = qp.num;
                q.orderByFields = qp.orderByFields;
                q.outStatistics = qp.outStatistics;
                q.pixelSize = qp.pixelSize;
                q.relationParam = qp.relationParam;
                q.spatialRelationship = qp.spatialRelationship;
                q.start = qp.start;
                q.text = qp.text;
                q.timeExtent = qp.timeExtent;
                q.units = qp.units;

            } else if (qp.type === 'relationship') {
                q.definitionExpression = qp.definitionExpression;
                q.relationshipId = qp.relationshipID;
            }

            if (this.growlOptions.loading && !this.isLinkedQuery) {
                this.growlID = this.topicID + 'Growl-StartSearch';
                var msg = lang.mixin(this.i18n.messages.searching, {
                    id: this.growlID,
                    timeout: (esriConfig.defaults.io.timeout + 5000),
                    showProgressBar: true
                });
                topic.publish('growler/growl', msg);
            }

            if (qp.type === 'relationship') {
                qt.executeRelationshipQuery(q, lang.hitch(this, 'processQueryResults'), lang.hitch(this, 'processQueryError'));
            } else {
                qt.execute(q, lang.hitch(this, 'processQueryResults'), lang.hitch(this, 'processQueryError'));
            }
        },

        executeLinkedQuery: function (lq) {
            var qp = this.queryParameters;
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

            this.executeQuery({
                queryOptions: {
                    queryParameters: lq,
                    isLinkedQuery: true
                }
            });
        },

        executeBuffer: function () {
            this.clearBufferGraphics();

            var buffParams = new BufferParameters();
            buffParams.geometries = [this.queryParameters.geometry];
            buffParams.distances = [this.bufferParameters.distance];
            buffParams.unit = this.bufferParameters.unit || units.FEET;
            buffParams.geodesic = this.bufferParameters.geodesic || true;
            buffParams.bufferSpatialReference = this.map.spatialReference;
            buffParams.outSpatialReference = this.map.spatialReference;

            esriConfig.defaults.geometryService.buffer(buffParams, lang.hitch(this, 'processBufferQueryResults'));
        },

        processQueryError: function (error) {
            this.clearGrowl();
            this.executingQuery = false;

            var msg = lang.mixin(this.i18n.messages.searchError, {
                level: 'error',
                timeout: 5000
            });
            topic.publish('growler/growl', msg);
            topic.publish('viewer/handleError', {
                error: error
            });
        },

        processQueryResults: function (results) {
            this.clearGrowl();
            this.executingQuery = false;

            if (!results) {
                return;
            }

            this.results = results;
            this.getFeaturesFromResults();

            if (!this.idProperty) {
                this.getIdProperty(results);
            }

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
                if (this.featureOptions.source && this.queryParameters.geometry) {
                    this.addSourceGraphic(this.queryParameters.geometry);
                }
                this.populateGrid(results);
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

            this.queryParametersType = 'spatial';
            this.linkedQuery = {
                url: null,
                linkIDs: []
            };
        },

        processBufferQueryResults: function (geometries) {
            var showOnly = this.bufferParameters.showOnly;

            // reset the buffer
            this.bufferParameters = lang.clone(this.defaultQueryOptions.bufferParameters);

            if (geometries && geometries.length > 0) {
                this.addBufferGraphic(geometries[0]);

                if (showOnly !== true) {
                    var qParams = lang.clone(this.queryParameters);
                    qParams.bufferGeometry = geometries[0];

                    this.executeQuery({
                        queryOptions: {
                            queryParameters: qParams,
                            bufferParameters: this.bufferParameters,
                            linkedQuery: this.linkedQuery,
                            linkField: this.linkField,
                            isLinkedQuery: this.isLinkedQuery
                        }
                    });

                } else {
                    if (this.featureOptions.source) {
                        this.addSourceGraphic(this.queryParameters.geometry);
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

        // get the idProperty from an 'esriFieldTypeOID'
        // type of field (if available) in the results
        getIdProperty: function (results) {
            var fields = results.fields;
            if (fields && fields.length > 0) {
                array.forEach(fields, lang.hitch(this, function (field) {
                    if (field.type === 'esriFieldTypeOID') {
                        this.idProperty = field.name;
                    }
                }));
            }
        },

        getURL: function () {
            var qp = this.queryParameters;
            var url = qp.url;
            if (!url && qp.layerID) {
                var layer = this.map.getLayer(qp.layerID);
                if (layer) {
                    if (layer.declaredClass === 'esri.layers.FeatureLayer') { // Feature Layer
                        url = layer.url;
                    } else if (layer.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') { // Dynamic Layer
                        if (qp.sublayerID !== null) {
                            url = layer.url + '/' + qp.sublayerID;
                        } else if (layer.visibleLayers && layer.visibleLayers.length === 1) {
                            url = layer.url + '/' + layer.visibleLayers[0];
                        }
                    }
                }
            }
            return url;
        }
    });
});

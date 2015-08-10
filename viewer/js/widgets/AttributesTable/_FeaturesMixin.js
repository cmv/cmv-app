define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic'

], function (
    declare,
    lang,
    topic
) {

    return declare(null, {

        featureOptions: {},

        defaultFeatureOptions: {

            // show the features that were the results of the search
            features: true,

            // Allow records to be selected in the grid
            selected: true,

            // Allow the user to highlight features that have been selected in the grid
            highlighted: true,

            // show the source feature used in the search
            source: true,

            // Allow the creation and display of a buffer
            buffer: true,

            // Allow the display of an info window when a feature is selected
            infoWindow: true,

            // Allow StreetView when tehre is a single selected feature
            streetView: true
        },

        features: [],
        selectedFeatures: [],

        getFeaturesConfiguration: function (options) {
            this.featureOptions = this.mixinDeep(lang.clone(this.defaultFeatureOptions), options);
            if (this.featureOptions.features === false) {
                this.featureOptions.selected = false;
                this.featureOptions.highlighted = false;
            }
        },

        getFeaturesFromResults: function () {
            var results = this.results;
            var features = [];
            if (results.features) {
                features = results.features;
            } else if (this.queryParameters.type === 'relationship') {
                for (var key in results) {
                    if (results.hasOwnProperty(key)) {
                        var item  = results[key];
                        if (item.features) {
                            features = features.concat(item.features);
                        }
                    }
                }
            }
            this.features = features;
            return features;
        },

        getFeatures: function () {
            return this.features;
        },

        getSelectedFeatures: function () {
            return this.selectedFeatures;
        },

        getFeatureCount: function () {
            return (this.features && this.features.length) ? this.features.length : 0;
        },

        clearFeatures: function () {
            this.clearFeatureGraphics();
            this.clearSelectedFeatures();
            this.features = [];
        },

        clearSelectedFeatures: function () {
            if (this.grid && this.grid.clearSelection) {
                this.grid.clearSelection();
            }
            this.clearSelectedGraphics();
            this.selectedFeatures = [];
        },

        doneSelectingFeatures: function (zoom) {
            if (this.selectedFeatures.length < 1) {
                this.setToolbarButtons();
                return;
            }

            this.showAllGraphics();

            var zoomCenter,
                zoomExtent = this.getGraphicsExtent(this.selectedGraphics);
            if (zoomExtent) {
                zoomCenter = zoomExtent.getCenter();
            }
            if (zoom && this.toolbarOptions.zoom.selected) {
                this.zoomToSelectedGraphics();
            }

            this.setToolbarButtons();

            // publish the results of our selection
            var sv = (zoom && this.selectedFeatures.length === 1) ? this.featureOptions.streetView : false;
            topic.publish(this.topicID + '/selectFeatures', {
                selectedFeatures: this.selectedFeatures,
                graphics: this.selectedGraphics.graphics,
                extent: zoomExtent,
                mapPoint: zoomCenter,
                allowStreetView: sv
            });

        }
    });
});

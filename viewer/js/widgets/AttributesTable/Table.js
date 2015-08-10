define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/topic',
    'dojo/dom-style',
    'dojo/dom-geometry',
    'dijit/registry',

    // using mixins to make code easier to maintain
    './_QueryMixin',
    './_GridMixin',
    './_FeaturesMixin',
    './_GraphicsMixin',
    './_ToolbarMixin',

    // template
    'dojo/text!./templates/AttributesTable.html',

    //i18n
    'dojo/i18n!./nls/AttributesTable',

    // template widgets
    'dijit/layout/ContentPane',
    'dijit/Toolbar',
    'dijit/form/DropDownButton',
    'dijit/DropDownMenu',
    'dijit/MenuItem',
    'dijit/form/Button',

    // css
    'xstyle/css!./css/AttributesTable.css'

], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,

    lang,
    aspect,
    topic,
    domStyle,
    domGeometry,
    registry,

    _QueryMixin,
    _GridMixin,
    _FeaturesMixin,
    _GraphicsMixin,
    _ToolbarMixin,
    template,

    i18n
) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _GridMixin, _QueryMixin, _FeaturesMixin, _GraphicsMixin, _ToolbarMixin], {
        widgetsInTemplate: true,
        templateString: template,
        baseClass: 'cmvAttributesTableWidget',

        // i18n
        i18n: i18n,

        mapClickMode: null,
        infoTemplate: null,
        sidebarPane: null,

        // displayed when results are found or not found
        title: 'Query Results',

        // displayed while searching
        loadingMessage: 'Searching...',

        // allows for multiple instances of the widget, all subscribing to different topics
        topicID: 'attributesTable',

        // track the growl
        growlID: null,

        growlOptions: {
            // should the loading growl be displayed?
            loading: true,
            // should the Results growl be displayed
            results: true
        },

        postCreate: function () {
            this.inherited(arguments);

            this.getConfiguration();
            this.addTopics();

            this.addGraphicsLayer();
            this.createGrid();
            this.setToolbarButtons();

            if (this.queryParameters.url || this.queryParameters.layerID) {
                this.own(aspect.after(this, 'startup', lang.hitch(this, function () {
                    this.executeQuery();
                })));
            }
        },

        getConfiguration: function (options) {
            // handle any options passed in the initial widget config
            if (!options) {
                options = {
                    queryOptions: lang.clone(this.queryOptions),
                    gridOptions: lang.clone(this.gridOptions),
                    featureOptions: lang.clone(this.featureOptions),
                    symbolOptions: lang.clone(this.symbolOptions),
                    toolbarOptions: lang.clone(this.toolbarOptions)
                };
            }

            // set the options for each mixin
            if (options.queryOptions) {
                this.getQueryConfiguration(options.queryOptions);
            }
            if (options.gridOptions) {
                this.getGridConfiguration(options.gridOptions);
            }
            if (options.featureOptions) {
                this.getFeaturesConfiguration(options.featureOptions);
            }
            if (options.symbolOptions) {
                this.getGraphicsConfiguration(options.symbolOptions);
            }
            if  (options.toolbarOptions) {
                this.getToolbarConfiguration(options.toolbarOptions);
            }
        },

        addTopics: function () {
            // execute a query
            this.own(topic.subscribe(this.topicID + '/executeQuery', lang.hitch(this, 'executeQuery')));

            // get the results of the query
            this.own(topic.subscribe(this.topicID + '/getQueryResults', lang.hitch(this, 'getQueryResults')));

            // populate the grid
            this.own(topic.subscribe(this.topicID + '/populateGrid', lang.hitch(this, 'populateGrid')));

            // clear the grid
            this.own(topic.subscribe(this.topicID + '/clearGrid', lang.hitch(this, 'clearGrid')));

            // get the features
            this.own(topic.subscribe(this.topicID + '/getFeatures', lang.hitch(this, 'getFeatures')));

            // get the selected features
            this.own(topic.subscribe(this.topicID + '/getSelectedFeatures', lang.hitch(this, 'getSelectedFeatures')));

            // clear all
            this.own(topic.subscribe(this.topicID + '/clearAll', lang.hitch(this, 'clearAll')));

            // show all the graphics
            this.own(topic.subscribe(this.topicID + '/showGraphics', lang.hitch(this, 'showAllGraphics')));

            // hide all the graphics
            this.own(topic.subscribe(this.topicID + '/hideGraphics', lang.hitch(this, 'hideAllGraphics')));

            // show the feature graphics
            this.own(topic.subscribe(this.topicID + '/showFeatureGraphics', lang.hitch(this, 'showFeatureGraphics')));

            // hide the feature graphics
            this.own(topic.subscribe(this.topicID + '/hideFeatureGraphics', lang.hitch(this, 'hideFeatureGraphics')));

            // zoom to the feature graphics
            this.own(topic.subscribe(this.topicID + '/zoomToFeatureGraphics', lang.hitch(this, 'zoomToFeatureGraphics')));

            // clear the features
            this.own(topic.subscribe(this.topicID + '/clearFeatures', lang.hitch(this, 'clearFeatures')));

            // show the selected graphics
            this.own(topic.subscribe(this.topicID + '/showSelectedGraphics', lang.hitch(this, 'showSelectedGraphics')));

            // hide the selected graphics
            this.own(topic.subscribe(this.topicID + '/hideSelectedGraphics', lang.hitch(this, 'hideSelectedGraphics')));

            // zoom to the selected graphics
            this.own(topic.subscribe(this.topicID + '/zoomToSelectedGraphics', lang.hitch(this, 'zoomToSelectedGraphics')));

            // clear the selected features
            this.own(topic.subscribe(this.topicID + '/clearSelectedFeatures', lang.hitch(this, 'clearSelectedFeatures')));

            // show the source graphic(s)
            this.own(topic.subscribe(this.topicID + '/showSourceGraphics', lang.hitch(this, 'showSourceGraphics')));

            // hide the source graphic(s)
            this.own(topic.subscribe(this.topicID + '/hideSourceGraphics', lang.hitch(this, 'hideSourceGraphics')));

            // zoom to the source graphic(s)
            this.own(topic.subscribe(this.topicID + '/zoomToSourceGraphics', lang.hitch(this, 'zoomToSourceGraphics')));

            // clear the source graphic(s)
            this.own(topic.subscribe(this.topicID + '/clearSourceGraphics', lang.hitch(this, 'clearSourceGraphics')));

            // show the buffer graphic(s)
            this.own(topic.subscribe(this.topicID + '/showBufferGraphics', lang.hitch(this, 'showBufferGraphics')));

            // hide the buffer graphic(s)
            this.own(topic.subscribe(this.topicID + '/hideBufferGraphics', lang.hitch(this, 'hideBufferGraphics')));

            // zoom to the buffer graphic(s)
            this.own(topic.subscribe(this.topicID + '/zoomToBufferGraphics', lang.hitch(this, 'zoomToBufferGraphics')));

            // clear the buffer graphic(s)
            this.own(topic.subscribe(this.topicID + '/clearBufferGraphics', lang.hitch(this, 'clearBufferGraphics')));

            // monitor the map click mode
            this.own(topic.subscribe('mapClickMode/currentSet', lang.hitch(this, 'setMapClickMode')));
        },

        setMapClickMode: function (mode) {
            this.mapClickMode = mode;
        },

        hideInfoWindow: function () {
            if (this.map && this.map.infoWindow) {
                this.map.infoWindow.hide();
            }
        },

        clearAll: function () {
            this.clearFeatures();
            this.clearSelectedFeatures();

            this.clearFeatureGraphics();
            this.clearSelectedFeatures();
            this.clearSourceGraphics();
            this.clearBufferGraphics();

            this.clearGrid();

            this.queryParameters = {
                type: 'spatial'
            };

            this.bufferParameters = {
                distance: null,
                units: null,
                showOnly: false
            };

            this.gridOptions.columns = [];
            this.gridOptions.sort = [];
        },

        clearGrowl: function () {
            var growl = registry.byId(this.growlID);
            if (growl && growl.close) {
                growl.close();
                registry.remove(this.growlID);
            }
        },

        // get the sidebar pane containing the widget (if any)
        getSidebarPane: function () {
            if (!this.sidebarPane) {
                this.sidebarPane = registry.byId(this.sidebarID);
            }
        },

        selectTab: function () {
            this.showAllGraphics();
            this.checkSizing();
        },

        unselectTab: function () {
            this.hideAllGraphics();
        },

        /*
            do some rather uncomfortable gymnastics to
            position the toolbar and grid components properly
        */
        checkSizing: function () {
            var top = 0, cStyle;
            var tbNode = this.attributesTableToolbarDijit.domNode;
            var gridNode = this.attributesTableGridDijit.domNode;

            if (this.toolbarOptions.show === false) {
                domStyle.set(tbNode, 'display', 'none');
            } else {
                domStyle.set(tbNode, 'display', 'block');
                cStyle = domStyle.getComputedStyle(tbNode);
                var tbBox = domGeometry.getMarginBox(tbNode, cStyle);
                var tbBottomMargin = domStyle.get(tbNode, 'margin-bottom');
                top = (tbBox.t + tbBox.h - tbBottomMargin);
            }
            domStyle.set(gridNode, 'top', top + 'px');

            var bodyNode = this.grid.bodyNode;
            var hdrNode = this.grid.headerNode;
            var ftrNode = this.grid.footerNode;
            cStyle = domStyle.getComputedStyle(hdrNode);
            var hdrBox = domGeometry.getMarginBox(hdrNode, cStyle);
            cStyle = domStyle.getComputedStyle(ftrNode);
            var ftrBox = domGeometry.getMarginBox(ftrNode, cStyle);
            domStyle.set(bodyNode, 'margin-top', (hdrBox.h + 1) + 'px');
            domStyle.set(bodyNode, 'margin-bottom', (ftrBox.h + 1) + 'px');
        },

        // open the sidebar pane containing this widget (if any)
        openPane: function () {
            this.getSidebarPane();
            if (this.sidebarPane) {
                var paneID = this.sidebarPane.id.toLowerCase().replace('sidebar', '');
                topic.publish('viewer/togglePane', {
                    pane: paneID,
                    show: 'block'
                });
            }
        },

        mixinDeep: function(dest, source) {
            //Recursively mix the properties of two objects
            var empty = {};
            for (var name in source) {
              if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
                   try {
                        if ( source[name].constructor==Object ) {
                             dest[name] = this.mixinDeep(dest[name], source[name]);
                        } else {
                             dest[name] = source[name];
                        }
                   } catch(e) {
                        // Property in destination object not set. Create it and set its value.
                        dest[name] = source[name];
                   }
              }
            }
            return dest;
        }
    });
});

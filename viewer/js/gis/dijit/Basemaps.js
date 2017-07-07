define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',

    'dijit/DropDownMenu',
    'dijit/MenuItem',

    'esri/basemaps',
    'esri/dijit/BasemapGallery',

    'dojo/text!./Basemaps/templates/Basemaps.html',
    'dojo/i18n!./Basemaps/nls/resource',

    'dijit/form/DropDownButton',
    'xstyle/css!./Basemaps/css/Basemaps.css'
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,

    lang,
    array,
    topic,

    DropDownMenu,
    MenuItem,

    esriBasemaps,
    BasemapGallery,

    template,
    i18n
) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        widgetsInTemplate: true,
        i18n: i18n,
        title: i18n.title,
        baseClass: 'basemapWidget',
        basemaps: {},
        currentBasemap: null,
        mapStartBasemap: null,
        basemapsToShow: null,
        galleryOptions: {
            basemapIds: null,
            basemaps: null,
            basemapsGroup: null,
            bingMapsKey: null,
            portalUrl: null,
            referenceIds: null,
            showArcGISBasemaps: false
        },

        postCreate: function () {
            this.inherited(arguments);
            this.initializeBasemaps();
            this.createBasemapGallery();
            topic.subscribe('basemaps/updateBasemap', lang.hitch(this, 'updateBasemap'));
        },

        initializeBasemaps: function () {
            if (this.galleryOptions.basemaps) {
                // if the basemaps to show is not explicitly set, get them from the gallery's basemap array
                this.basemapsToShow = this.basemapsToShow || array.map(this.galleryOptions.basemaps, function (basemap) {
                    return basemap.id;
                });
            } else {
                // no basemaps? use the Esri basemaps
                if (!this.basemaps || Object.keys(this.basemaps).length < 1) {
                    this.basemaps = lang.clone(esriBasemaps);
                    this.galleryOptions.showArcGISBasemaps = false;
                }

                // if the basemaps to show is not explicitly set, get them from the basemap object
                this.basemapsToShow = this.basemapsToShow || Object.keys(this.basemaps);

                var basemaps = [];
                array.forEach(this.basemapsToShow, lang.hitch(this, function (key) {
                    var map = this.basemaps[key];
                    // determine if it is a custom basemap or an esri basemap
                    if (map.basemap && map.basemap.declaredClass === 'esri.dijit.Basemap') {
                        var basemap = map.basemap;
                        basemap.title = map.title || basemap.title;
                        basemap.id = key;
                        basemaps.push(basemap);
                    } else {
                        if (!esriBasemaps[key]) {
                            map.basemap.title = map.title || map.basemap.title;
                            esriBasemaps[key] = map.basemap;
                        }
                        map.title = map.title || esriBasemaps[key].title;
                        this.galleryOptions.showArcGISBasemaps = false;
                    }
                }));
                this.galleryOptions.basemaps = basemaps;
            }

            // if the starting basemap is not explicitly set, get it from the map
            this.mapStartBasemap = this.mapStartBasemap || this.map.getBasemap();

            // check to make sure the starting basemap is found in the basemaps object
            if (array.indexOf(this.basemapsToShow, this.mapStartBasemap) < 0) {
                this.mapStartBasemap = this.basemapsToShow[0];
            }
        },

        createBasemapGallery: function () {
            var opts = lang.mixin({
                map: this.map
            }, this.galleryOptions);
            this.gallery = new BasemapGallery(opts);
            this.gallery.startup();
            if (this.galleryOptions.showArcGISBasemaps) {
                this.gallery.on('load', lang.hitch(this, 'buildMenu'));
            } else {
                this.buildMenu();
            }
        },

        buildMenu: function () {
            this.menu = new DropDownMenu({
                style: 'display: none;'
            });
            array.forEach(this.basemapsToShow, function (basemap) {
                if (this.basemaps.hasOwnProperty(basemap)) {
                    var menuItem = new MenuItem({
                        id: basemap,
                        label: this.basemaps[basemap].title,
                        iconClass: (basemap === this.mapStartBasemap) ? 'selectedIcon' : 'emptyIcon',
                        onClick: lang.hitch(this, 'updateBasemap', basemap)
                    });
                    this.menu.addChild(menuItem);
                }
            }, this);
            this.dropDownButton.set('dropDown', this.menu);
            this.setStartingBasemap();
        },

        setStartingBasemap: function () {
            if (this.mapStartBasemap && (this.gallery.get(this.mapStartBasemap) || esriBasemaps[this.mapStartBasemap])) {
                this.updateBasemap(this.mapStartBasemap);
            }
        },

        updateBasemap: function (basemap) {
            if (basemap !== this.currentBasemap && (array.indexOf(this.basemapsToShow, basemap) !== -1)) {
                if (this.gallery.get(basemap)) {
                    this.gallery.select(basemap);
                } else if (esriBasemaps[basemap]) {
                    this.gallery._removeBasemapLayers();
                    this.gallery._removeReferenceLayer();
                    this.map.setBasemap(basemap);
                } else {
                    topic.publish('viewer/error', 'Invalid basemap selected.');
                    return;
                }
                this.currentBasemap = basemap;
                var ch = this.menu.getChildren();
                array.forEach(ch, function (c) {
                    if (c.id === basemap) {
                        c.set('iconClass', 'selectedIcon');
                    } else {
                        c.set('iconClass', 'emptyIcon');
                    }
                });
            }
        }
    });
});

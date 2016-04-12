define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojox/lang/functional',

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
    functional,

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
        mode: 'agol',

        basemaps: {},
        currentBasemap: null,
        mapStartBasemap: null,
        basemapsToShow: null,

        postCreate: function () {
            this.inherited(arguments);

            // if the basemaps to show is not explicitly set,
            // get them from the basemap object
            if (!this.basemapsToShow) {
                this.basemapsToShow = Object.keys(this.basemaps);
            }

            // if the starting basemap is not explicitly set,
            // get it from the map
            if (!this.mapStartBasemap) {
                this.mapStartBasemap = this.map.getBasemap();
            }

            // check to make sure the starting basemap
            // is found in the basemaps object
            if (!this.basemaps.hasOwnProperty(this.mapStartBasemap)) {
                this.mapStartBasemap = this.basemapsToShow[0];
            }

            if (this.mode === 'custom') {
                this.gallery = new BasemapGallery({
                    map: this.map,
                    showArcGISBasemaps: false,
                    basemaps: functional.map(this.basemaps, function (map) {
                        return map.basemap;
                    })
                });
                this.gallery.startup();
            }
            this.menu = new DropDownMenu({
                style: 'display: none;'
            });

            array.forEach(this.basemapsToShow, function (basemap) {
                if (this.basemaps.hasOwnProperty(basemap)) {
                    if (this.mode !== 'custom') {
                        // add any custom to the esri basemaps
                        var basemapObj = this.basemaps[basemap];
                        if (basemapObj.basemap) {
                            if (!esriBasemaps[basemap]) {
                                if (!basemapObj.basemap.title) {
                                    basemapObj.basemap.title = basemapObj.title || basemap;
                                }
                                esriBasemaps[basemap] = basemapObj.basemap;
                            }
                        }
                    }
                    var menuItem = new MenuItem({
                        id: basemap,
                        label: this.basemaps[basemap].title,
                        iconClass: (basemap === this.mapStartBasemap) ? 'selectedIcon' : 'emptyIcon',
                        onClick: lang.hitch(this, 'updateBasemap', basemap)
                    });
                    this.menu.addChild(menuItem);
                }
            }, this);
            topic.subscribe('basemaps/updateBasemap', lang.hitch(this, 'updateBasemap'));
            this.dropDownButton.set('dropDown', this.menu);
        },

        updateBasemap: function (basemap) {
            if (basemap !== this.currentBasemap && (array.indexOf(this.basemapsToShow, basemap) !== -1)) {
                if (!this.basemaps.hasOwnProperty(basemap)) {
                    return;
                }
                this.currentBasemap = basemap;
                if (this.mode === 'custom') {
                    this.gallery.select(basemap);
                } else {
                    this.map.setBasemap(basemap);
                }

                var ch = this.menu.getChildren();
                array.forEach(ch, function (c) {
                    if (c.id === basemap) {
                        c.set('iconClass', 'selectedIcon');
                    } else {
                        c.set('iconClass', 'emptyIcon');
                    }
                });
            }
        },

        startup: function () {
            this.inherited(arguments);
            if (this.mapStartBasemap) {
                if (this.map.getBasemap() !== this.mapStartBasemap) {
                    this.updateBasemap(this.mapStartBasemap);
                }
            }
        }
    });
});
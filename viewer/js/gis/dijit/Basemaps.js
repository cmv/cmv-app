define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/lang',
    'dijit/DropDownMenu',
    'dijit/MenuItem',
    'dojo/_base/array',
    'dojox/lang/functional',
    'dojo/text!./Basemaps/templates/Basemaps.html',
    'esri/dijit/BasemapGallery',
    'dojo/i18n!./Basemaps/nls/resource',

    'dijit/form/DropDownButton',
    'xstyle/css!./Basemaps/css/Basemaps.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, lang, DropDownMenu, MenuItem, array, functional, template, BasemapGallery, i18n) {

    // main basemap widget
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        widgetsInTemplate: true,
        i18n: i18n,
        mode: 'agol',
        title: i18n.title,

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

            this.currentBasemap = this.mapStartBasemap || null;

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
                    var menuItem = new MenuItem({
                        id: basemap,
                        label: this.basemaps[basemap].title,
                        iconClass: (basemap == this.mapStartBasemap) ? 'selectedIcon' : 'emptyIcon',
                        onClick: lang.hitch(this, function () {
                            if (basemap !== this.currentBasemap) {
                                this.currentBasemap = basemap;
                                if (this.mode === 'custom') {
                                    this.gallery.select(basemap);
                                } else {
                                    this.map.setBasemap(basemap);
                                }
                                var ch = this.menu.getChildren();
                                array.forEach(ch, function (c) {
                                    if (c.id == basemap) {
                                        c.set('iconClass', 'selectedIcon');
                                    } else {
                                        c.set('iconClass', 'emptyIcon');
                                    }
                                });
                            }
                        })
                    });
                    this.menu.addChild(menuItem);
                }
            }, this);

            this.dropDownButton.set('dropDown', this.menu);
        },
        startup: function () {
            this.inherited(arguments);
            if (this.mode === 'custom') {
                if (this.map.getBasemap() !== this.mapStartBasemap) { //based off the title of custom basemaps in viewer.js config
                    this.gallery.select(this.mapStartBasemap);
                }
            } else {
                if (this.mapStartBasemap) {
                    if (this.map.getBasemap() !== this.mapStartBasemap) { //based off the agol basemap name
                        this.map.setBasemap(this.mapStartBasemap);
                    }
                }
            }
        }
    });
});
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/lang',
    'dijit/form/DropDownButton',
    'dijit/DropDownMenu',
    'dijit/MenuItem',
    'dojo/_base/array',
    'dojox/lang/functional',
    'dojo/text!./Basemaps/templates/Basemaps.html',
    'esri/dijit/BasemapGallery',
    'xstyle/css!./Basemaps/css/Basemaps.css'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, lang, DropDownButton, DropDownMenu, MenuItem, array, functional, template, BasemapGallery, css) {

    // main basemap widget
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        widgetsInTemplate: true,
        mode: 'agol',
        title: 'Basemaps',
        //baseClass: 'gis_Basemaps_Dijit',
        //buttonClass: 'gis_Basemaps_Button',
        //menuClass: 'gis_Basemaps_Menu',
        mapStartBasemap: 'streets',
        basemapsToShow: ['streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'],
        customBasemaps: {},
        agolBasemaps: {},
        validBasemaps: [],
        postCreate: function() {
            this.inherited(arguments);
            this.currentBasemap = this.mapStartBasemap || null;

            if (this.mode === 'custom') {
                this.gallery = new BasemapGallery({
                    map: this.map,
                    showArcGISBasemaps: false,
                    basemaps: functional.map(this.customBasemaps, function(map) {
                        return map.basemap;
                    })
                });
                this.gallery.select(this.mapStartBasemap);
                this.gallery.startup();
            }

            this.menu = new DropDownMenu({
                style: 'display: none;' //,
                //baseClass: this.menuClass
            });

            if (this.mode === 'custom') {
                this.validBasemaps = functional.keys(this.customBasemaps);
            } else {
                this.validBasemaps = functional.keys(this.agolBasemaps);
            }

            array.forEach(this.basemapsToShow, function(basemap) {
                if (array.indexOf(this.validBasemaps, basemap) !== -1) {
                    var menuItem = new MenuItem({
                        id: basemap,
                        label: (this.mode === 'custom') ? this.customBasemaps[basemap].title : this.agolBasemaps[basemap].title,
                        iconClass: (basemap == this.mapStartBasemap) ? 'selectedIcon' : 'emptyIcon',
                        onClick: lang.hitch(this, function() {
                            if (basemap !== this.currentBasemap) {
                                this.currentBasemap = basemap;
                                if (this.mode === 'custom') {
                                    this.gallery.select(basemap);
                                } else {
                                    this.map.setBasemap(basemap);
                                }
                                var ch = this.menu.getChildren();
                                array.forEach(ch, function(c) {
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

            if (array.indexOf(this.basemapsToShow, 'osm') !== -1) {
                require(['esri/layers/osm']);
            }
        },
        startup: function() {
            this.inherited(arguments);
            if (this.mode === 'custom') {
                this.gallery.select(this.mapStartBasemap);
            } else {
                this.map.setBasemap(this.mapStartBasemap);
            }
        }
    });
});
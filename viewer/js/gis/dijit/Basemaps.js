define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/lang",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dojo/_base/array",
    "dojox/lang/functional",
    "dojo/text!./Basemaps/templates/Basemaps.html"
    ], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, lang, DropDownButton, DropDownMenu, MenuItem, array, functional, template) {

    //anonymous function to load CSS files required for this module
    (function() {
        var css = [require.toUrl("gis/dijit/Basemaps/css/Basemaps.css")];
        var head = document.getElementsByTagName("head").item(0),
            link;
        for(var i = 0, il = css.length; i < il; i++) {
            link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = css[i].toString();
            head.appendChild(link);
        }
    }());

    // basemap configs
    var maps = {
        streets: {
            title: 'Streets'
        },
        satellite: {
            title: 'Satellite'
        },
        hybrid: {
            title: 'Hybrid'
        },
        topo: {
            title: 'Topo'
        },
        gray: {
            title: 'Gray'
        },
        oceans: {
            title: 'Oceans'
        },
        "national-geographic": {
            title: 'Nat Geo'
        },
        osm: {
            title: 'Open Street Map'
        }
    };

    // main basemap widget
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        widgetsInTemplate: true,
        title: "Basemaps",
        baseClass: 'gis_Basemaps_Dijit',
        buttonClass: 'gis_Basemaps_Button',
        menuClass: "gis_Basemaps_Menu",
        basemaps: ["streets", "satellite"],
        postCreate: function() {
            this.inherited(arguments);

            this.currentBasemap = this.mapStartBasemap || null;

            this.menu = new DropDownMenu({
                style: "display: none;",
                baseClass: this.menuClass
            });

            var validBasemaps = functional.keys(maps);
            array.forEach(this.basemaps, function(basemap) {
                if(array.indexOf(validBasemaps, basemap) !== -1) {
                    var menuItem = new MenuItem({
                        id: basemap,
                        label: maps[basemap].title,
                        iconClass: (basemap == this.mapStartBasemap) ? 'selectedIcon' : 'clearIcon',
                        //maps[basemap].iconClass,
                        onClick: lang.hitch(this, function() {
                            if(basemap !== this.currentBasemap) {
                                this.currentBasemap = basemap;
                                this.map.setBasemap(basemap);
                                var ch = this.menu.getChildren();
                                array.forEach(ch, function(c) {
                                    if(c.id == basemap) {
                                        c.set('iconClass', 'selectedIcon');
                                    } else {
                                        c.set('iconClass', 'clearIcon');
                                    }
                                });
                            }
                        })
                    });
                    this.menu.addChild(menuItem);
                }
            }, this);

            this.dropDownButton.set('dropDown', this.menu);

            if(array.indexOf(this.basemaps, "osm") !== -1) {
                require(["esri/layers/osm"]);
            }
        }
    });
});
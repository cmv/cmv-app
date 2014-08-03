// adapted from https://github.com/esri/arcgis-dijit-geocoder-button-js/
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/a11yclick',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-class',
    'dojo/dom-style',
    'esri/dijit/Geocoder',
    'dojo/text!./Geocoder/templates/Geocoder.html',
    'xstyle/css!./Geocoder/css/Geocoder.css'
],
function (declare, _WidgetBase, _TemplatedMixin, a11yclick, lang, on, domClass, domStyle, Geocoder, template, css) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        baseClass: 'gis_GeocoderDijit',
        expanded: false,
        collapsible: true,
        geocoderOptions: {
            autoComplete: true
        },
        postCreate: function() {
            this.inherited(arguments);
            var options = lang.mixin({}, this.geocoderOptions, {
                map: this.map
            });
            this.geocoder = new Geocoder(options, this.geocoderNode);

            on(this.geocoder, 'select', lang.hitch(this, function(e){
                if(e.result){
                    this.show();
                }
            }));

            if (this.collapsible) {
                on(this.map, 'pan-start', lang.hitch(this, function(){
                    this.hide();
                }));
                this.own(
                    on(this.searchNode, a11yclick, lang.hitch(this, this.toggle))
                );
            } else {
                this.expanded = true;
            }
            this.geocoder.startup();
            if (this.expanded === true) {
                this.show();
            } else{
                this.hide();
            }
        },
        toggle: function() {
            var display = domStyle.get(this.searchContainerNode, 'display');
            if (display === 'block') {
                this.hide();
            } else{
                this.show();
            }
        },
        hide: function () {
            domStyle.set(this.searchContainerNode, 'display', 'none');
            domClass.remove(this.containerNode, 'open');
            if (this.geocoder) {
                this.geocoder.blur();
            }
        },
        show: function() {
            domStyle.set(this.searchContainerNode, 'display', 'block');
            domClass.add(this.containerNode, 'open');
            if (this.geocoder && !this.expanded) {
                this.geocoder.focus();
            }
        }
    });
});

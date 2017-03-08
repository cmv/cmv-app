define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/_base/lang',
    'dojo/topic',

    'esri/dijit/BasemapGallery',

    'dojo/text!./BasemapGallery/templates/BasemapGallery.html',
    'dojo/i18n!./BasemapGallery/nls/resource',

    'dijit/layout/ContentPane',
    'dijit/TitlePane',

    'xstyle/css!./BasemapGallery/css/BasemapGallery.css'

], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,

    lang,
    topic,

    BasemapGallery,

    template,
    i18n
) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: template,
        i18n: i18n,
        baseClass: 'cmvBasemapGalleryWidget',

        galleryOptions: {
            showArcGISBasemaps: true
        },

        postCreate: function () {
            this.inherited(arguments);

            var opts = lang.mixin({
                map: this.map
            }, this.galleryOptions || {});
            this.basemapGallery = new BasemapGallery(opts, 'basemapGallery');
            this.basemapGallery.startup();

            this.basemapGallery.on('selection-change', lang.hitch(this, 'basemapSelected'));

            this.basemapGallery.on('error', function (msg) {
                topic.publish('viewer/handleError', 'basemap gallery error: ' + msg);
            });
        },

        basemapSelected: function (/* basemap */) {
            this.basemapGalleryTitlePane.set('open', false);
        }
    });
});
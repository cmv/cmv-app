define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'esri/toolbars/navigation',
	'dijit/form/Button',
	'dojo/_base/lang',
	'dojo/on',
	'dojo/text!./NavToolbar/templates/NavToolbar.html',
	'xstyle/css!./NavToolbar/css/NavToolbar.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Navigation, Button, lang, on, NavToolbarTemplate, css) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: NavToolbarTemplate,
        navToolbar: null,
        postCreate: function(){
          this.navToolbar = new Navigation(this.map);
          this.navToolbar.on('onExtentHistoryChange', lang.hitch(this, 'extentHistoryChangeHandler'));
		},

        zoomIn: function() {
			this.navToolbar.activate(Navigation.ZOOM_IN);
        },
        zoomOut: function() {
			this.navToolbar.activate(Navigation.ZOOM_OUT);
        },
        fullExtent: function () {
			this.navToolbar.zoomToFullExtent();
        },		
		prevExtent: function () {
			this.navToolbar.zoomToPrevExtent();
        },
        nextExtent: function () {
			this.navToolbar.zoomToNextExtent();
        },		
		pan: function () {
            this.navToolbar.activate(Navigation.PAN);
        },
		deactivate: function () {
			this.navToolbar.deactivate();
        },

        disconnectMapClick: function() {
			this.mapClickMode.current = 'nav';
            // dojo.disconnect(this.mapClickEventHandle);
            // this.mapClickEventHandle = null;
        },
        
		connectMapClick: function() {
            this.mapClickMode.current = this.mapClickMode.defaultMode;
            // if (this.mapClickEventHandle === null) {
            //     this.mapClickEventHandle = dojo.connect(this.map, 'onClick', this.mapClickEventListener);
            // }
        },
		
		extentHistoryChangeHandler: function (evt) {
           //registry.byId('zoomprev').disabled = navToolbar.isFirstExtent();
           //registry.byId('zoomnext').disabled = navToolbar.isLastExtent();
            this.navToolbar.deactivate();
            this.connectMapClick();
        }
	});
});

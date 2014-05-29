define([
	'dojo/_base/declare',
	'dojo/on',
	'dojo/_base/lang'
], function(declare, on, lang) {
	return declare(null, {
		startup: function() {
			var parentWidget = this.getParent();
			if (parentWidget && parentWidget.declaredClass === 'gis.dijit.FloatingWidget' && this.onOpen) {
				on(parentWidget, 'show', lang.hitch(this, 'onOpen'));
			}
			if (parentWidget && parentWidget.declaredClass === 'gis.dijit.FloatingWidget' && this.onClose) {
				on(parentWidget, 'hide', lang.hitch(this, 'onClose'));
			}
			if (parentWidget && parentWidget.declaredClass === 'gis.dijit.FloatingWidget' && this.openOnStartup) {
				parentWidget.show();
			}

			this.inherited(arguments);
		}
	});
});
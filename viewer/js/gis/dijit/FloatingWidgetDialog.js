define([
	'dijit/Dialog',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/on'
], function (Dialog, declare,  lang, on) {
	return declare([Dialog], {
		declaredClass: 'gis.dijit.FloatingWidget',
		title: 'Floating Widget',
		draggable: true,
		toggleable: true,
		'class': 'floatingWidget',
		focus: function () {},
		startup: function() {
			this.inherited(arguments);
			this.own(on(this, 'hide', lang.hitch(this, 'toggle', false, false)));
			this.own(on(this, 'show', lang.hitch(this, 'toggle', true, false)));
		},
		toggle: function(open, doToggle) {
			// default doToggle to true
			if(arguments.length < 2) {
				doToggle = true;
			}
			// we do not execute the toggle if it was already done by this widget
			if(doToggle) {
				if(open) {
					this.show();
				}
				else {
					this.hide();
				}
			}
		}
	});
});
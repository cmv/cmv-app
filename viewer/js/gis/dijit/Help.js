define([
	'dojo/_base/declare',
	'dijit/_WidgetsInTemplateMixin',
	'dijit/form/Button',
	'dijit/Dialog',
	'dijit/layout/TabContainer',
	'dijit/layout/ContentPane',
	'dojo/text!./Help/templates/HelpDialog.html',
	'xstyle/css!./Help/css/Help.css'
	], function(declare, _WidgetsInTemplateMixin, Button, Dialog, TabContainer, ContentPane, helpTemplate, css) {

	return declare([Dialog, _WidgetsInTemplateMixin], {
		templateString: helpTemplate,
		title: 'Help',
		draggable: false,
		baseClass: 'helpDijit',
		postCreate: function() {
			this.inherited(arguments);
		},
		close: function() {
			this.hide();
		}
	});
});
define([
	"dojo/_base/declare",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/form/Button",
	"dijit/Dialog",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"dojo/text!./Help/templates/HelpDialog.html"
	], function(declare, _WidgetsInTemplateMixin, Button, Dialog, TabContainer, ContentPane, helpTemplate) {

	//anonymous function to load CSS files required for this module
	(function() {
		var css = [require.toUrl("gis/dijit/Help/css/Help.css")];
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
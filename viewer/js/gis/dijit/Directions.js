define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'esri/dijit/Directions',
	'dojo/text!./Directions/templates/Directions.html',
	'dojo/_base/lang',
	'dijit/Menu',
	'dijit/MenuItem',
	'dijit/MenuSeparator',
	'gis/dijit/3.7DirectionsPatch'
], function(declare, _WidgetBase, _TemplatedMixin, Directions, template, lang, Menu, MenuItem, MenuSeparator, patch) {

	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		postCreate: function() {
			this.inherited(arguments);
			this.directions = new Directions(lang.mixin({
				map: this.map
			}, this.options), this.directionsNode);
			this.directions.startup();

			// capture map right click position
			this.map.on("MouseDown", lang.hitch(this, function(evt) {
				this.mapRightClickPoint = evt.mapPoint;
			}));

			// create right-click menu
			this.menu = new Menu({
				targetNodeIds: [this.map.root]
			});
			this.menu.addChild(new MenuItem({
				label: "Directions from here",
				onClick: lang.hitch(this, 'directionsFrom')
			}));
			this.menu.addChild(new MenuItem({
				label: "Directions to here",
				onClick: lang.hitch(this, 'directionsTo')
			}));
			this.menu.addChild(new MenuSeparator());
			this.menu.addChild(new MenuItem({
				label: "Add stop",
				onClick: lang.hitch(this, 'addStop')
			}));
			this.menu.startup();
		},
		// clearMap: function() {
		// 	this.directions.clearDirections();
		// },
		clearStops: function() {
			this.directions.reset();
		},
		directionsFrom: function() {
			this.directions.updateStop(this.mapRightClickPoint, 0).then(lang.hitch(this, 'doRoute'));
		},
		directionsTo: function() {
			this.directions.updateStop(this.mapRightClickPoint, this.directions.stops.length - 1).then(lang.hitch(this, 'doRoute'));
		},
		addStop: function() {
			this.directions.addStop(this.mapRightClickPoint, this.directions.stops.length - 1).then(lang.hitch(this, 'doRoute'));
		},
		doRoute: function() {
			if (this.titlePane && !this.titlePane.open) {
				this.titlePane.toggle();
			}
			if (this.directions.stops[0] && this.directions.stops[1]) {
				this.directions.getDirections();
			}
		}
	});
});
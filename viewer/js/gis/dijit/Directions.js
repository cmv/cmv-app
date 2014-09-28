define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'esri/dijit/Directions',
	'dojo/text!./Directions/templates/Directions.html',
	'dojo/_base/lang',
	'dijit/Menu',
	'dijit/MenuItem',
	'dijit/PopupMenuItem',
	'dijit/MenuSeparator',
	'esri/geometry/Point',
	'esri/SpatialReference',
	'dojo/topic'
], function (declare, _WidgetBase, _TemplatedMixin, Directions, template, lang, Menu, MenuItem, PopupMenuItem, MenuSeparator, Point, SpatialReference, topic) {

	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		postCreate: function () {
			this.inherited(arguments);
			this.directions = new Directions(lang.mixin({
				map: this.map
			}, this.options), this.directionsNode);
			this.directions.startup();

			if (this.mapRightClickMenu) {
				this.addRightClickMenu();
			}
		},
		addRightClickMenu: function () {
			// capture map right click position
			this.map.on('MouseDown', lang.hitch(this, function (evt) {
				this.mapRightClickPoint = evt.mapPoint;
			}));

			this.menu = new Menu();
			this.menu.addChild(new MenuItem({
				label: 'Directions from here',
				onClick: lang.hitch(this, 'directionsFrom')
			}));
			this.menu.addChild(new MenuItem({
				label: 'Directions to here',
				onClick: lang.hitch(this, 'directionsTo')
			}));
			this.menu.addChild(new MenuSeparator());
			this.menu.addChild(new MenuItem({
				label: 'Add stop',
				onClick: lang.hitch(this, 'addStop')
			}));
			this.menu.addChild(new MenuSeparator());
			this.menu.addChild(new MenuItem({
				label: 'Use my location as start point',
				onClick: lang.hitch(this, 'getGeoLocation', 'directionsFrom')
			}));
			this.menu.addChild(new MenuItem({
				label: 'Use my location as end point',
				onClick: lang.hitch(this, 'getGeoLocation', 'directionsTo')
			}));

			// add this widgets menu as a sub menu to the map right click menu
			this.mapRightClickMenu.addChild(new PopupMenuItem({
				label: 'Directions',
				popup: this.menu
			}));
		},
		clearStops: function () {
			this.directions.reset();
		},
		directionsFrom: function () {
			this.directions.updateStop(this.mapRightClickPoint, 0).then(lang.hitch(this, 'doRoute'));
		},
		directionsTo: function () {
			this.directions.updateStop(this.mapRightClickPoint, this.directions.stops.length - 1).then(lang.hitch(this, 'doRoute'));
		},
		addStop: function () {
			this.directions.addStop(this.mapRightClickPoint, this.directions.stops.length - 1).then(lang.hitch(this, 'doRoute'));
		},
		doRoute: function () {
			if (this.parentWidget && !this.parentWidget.open) {
				this.parentWidget.toggle();
			}
			if (this.directions.stops[0] && this.directions.stops[1]) {
				this.directions.getDirections();
			}
		},
		startAtMyLocation: function () {
			this.getGeoLocation('directionsFrom');
		},
		endAtMyLocation: function () {
			this.getGeoLocation('directionsTo');
		},
		getGeoLocation: function (leg) {
			if (navigator && navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(lang.hitch(this, 'locationSuccess', leg), lang.hitch(this, 'locationError'));
			} else {
				topic.publish('growler/growl', {
					title: 'Error',
					message: 'Geolocation not supported by your browser.',
					level: 'default',
					timeout: 10000,
					opacity: 1.0
				});
			}
		},
		locationSuccess: function (leg, event) {
			this.mapRightClickPoint = new Point(event.coords.longitude, event.coords.latitude, new SpatialReference({
				wkid: 4326
			}));
			this[leg]();
		},
		locationError: function (error) {
			topic.publish('growler/growl', {
				title: 'Error',
				message: 'There was a problem with getting your location: ' + error.message,
				level: 'default',
				timeout: 10000,
				opacity: 1.0
			});
		}
	});
});
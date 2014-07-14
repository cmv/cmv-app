define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'esri/dijit/Measurement',
	'dojo/aspect',
	'dojo/_base/lang',
	'dojo/dom-construct'
], function(declare, _WidgetBase, Measurement, aspect, lang, domConstruct) {

	return declare([_WidgetBase], {
		declaredClass: 'gis.digit.Measurement',
		postCreate: function() {
			this.inherited(arguments);
			this.measure = new Measurement({
				map: this.map,
				defaultAreaUnit: this.defaultAreaUnit,
				defaultLengthUnit: this.defaultLengthUnit
			}, domConstruct.create('div')).placeAt(this.domNode);
			this.measure.startup();
			aspect.before(this.measure, 'measureArea', lang.hitch(this, 'setMapClickMode', 'measure'));
			aspect.before(this.measure, 'measureDistance', lang.hitch(this, 'setMapClickMode', 'measure'));
			aspect.before(this.measure, 'measureLocation', lang.hitch(this, 'setMapClickMode', 'measure'));
			aspect.after(this.measure, 'closeTool', lang.hitch(this, 'setMapClickMode', this.mapClickMode.defaultMode));
		},
		setMapClickMode: function(mode) {
			this.mapClickMode.current = mode;
		}
	});
});
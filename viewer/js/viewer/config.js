define(function() {
	return {
		proxy: {
			url: "proxy/proxy.ashx",
			alwaysUseProxy: false
		},
		basemap: "streets",
		initialExtent: {
			xmin: -15489130.48708616,
			ymin: 398794.4860580916,
			xmax: -5891085.7193757,
			ymax: 8509680.431452557,
			spatialReference: {
				wkid: 102100
			}
		},
		operationalLayers: [
			{
			type: "feature",
			url: "http://psstldemo3.esri.com/arcgis/rest/services/demo/MeetUpHomeTowns/MapServer/0",
			options: {
				id: "meetupHometowns",
				title: "STLJS Meetup Home Towns",
				opacity: 1.0,
				visible: true,
				infoTemplate: new esri.InfoTemplate("Hometown", "${*}"),
				mode: esri.layers.FeatureLayer.MODE_SNAPSHOT
			}
		}
		],
		printTask: {
			url: "http://psstldemo3.esri.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
			copyrightText: "Copyright ESRI 2012",
			authorText: "ESRI"
		}
	};
});
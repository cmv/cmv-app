define(function() {
	return {
		// url to your proxy page, must be on same machine hosting you app. See proxy folder for readme.
		proxy: {
			url: "proxy/proxy.ashx",
			alwaysUseProxy: false
		},
		// basemap: valid options: "streets", "satellite", "hybrid", "topo", "gray", "oceans", "national-geographic", "osm"
		defaultBasemap: "streets",
		//basemaps to show in menu
		basemaps: ["streets", "satellite", "hybrid", "topo", "gray", "oceans", "national-geographic", "osm"],
		// initialExtent: extent the the map starts at. Helper tool: http://www.arcgis.com/home/item.html?id=dd1091f33a3e4ecb8cd77adf3e585c8a
		initialExtent: {
			xmin: -15489130.48708616,
			ymin: 398794.4860580916,
			xmax: -5891085.7193757,
			ymax: 8509680.431452557,
			spatialReference: {
				wkid: 102100
			}
		},
		// operationalLayers: Layers to load on top of the basemap: valid 'type' options: "dynamic", "tiled", "feature".
		// 'options' object is passed as the layers options for constructor. Title will be used in the legend only. id's must be unique and have no spaces.
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
		// printTask: Url and default options for your print task. Make sure default layout and format options are supported by your print service.
		printTask: {
			url: "http://psstldemo3.esri.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
			copyrightText: "Copyright ESRI 2012",
			authorText: "ESRI",
			defaultTitle: 'Meetup Hometowns',
			defaultFormat: 'PDF',
			defaultLayout: 'Letter ANSI A Landscape'
		}
	};
});
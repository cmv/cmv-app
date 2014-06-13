define([
	'esri/InfoTemplate',
	'esri/units',
	'esri/geometry/Extent',
	'esri/config',
	'esri/tasks/GeometryService'
], function(InfoTemplate, units, Extent, esriConfig, GeometryService) {

	// url to your proxy page, must be on same machine hosting you app. See proxy folder for readme.
	esriConfig.defaults.io.proxyUrl = 'proxy/proxy.ashx';
	esriConfig.defaults.io.alwaysUseProxy = false;
	// url to your geometry server.
	esriConfig.defaults.geometryService = new GeometryService('http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer');

	return {
		//default mapClick mode, mapClickMode lets widgets know what mode the map is in to avoid multipult map click actions from taking place (ie identify while drawing).
		defaultMapClickMode: 'identify',
		// map options, passed to map constructor. see: https://developers.arcgis.com/javascript/jsapi/map-amd.html#map1
		mapOptions: {
			basemap: 'streets',
			center: [-96.59179687497497, 39.09596293629694],
			zoom: 5,
			sliderStyle: 'small'
		},
		// operationalLayers: Array of Layers to load on top of the basemap: valid 'type' options: 'dynamic', 'tiled', 'feature'.
		// The 'options' object is passed as the layers options for constructor. Title will be used in the legend only. id's must be unique and have no spaces.
		// 3 'mode' options: MODE_SNAPSHOT = 0, MODE_ONDEMAND = 1, MODE_SELECTION = 2
		operationalLayers: [{
			type: 'feature',
			url: 'http://services1.arcgis.com/g2TonOxuRkIqSOFx/arcgis/rest/services/MeetUpHomeTowns/FeatureServer/0',
			title: 'STLJS Meetup Home Towns',
			options: {
				id: 'meetupHometowns',
				opacity: 1.0,
				visible: true,
				outFields: ['*'],
				infoTemplate: new InfoTemplate('Hometown', '${*}'),
				mode: 0
			},
			editorLayerInfos: {
				disableGeometryUpdate: false
			}
		}, {
			type: 'dynamic',
			url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
			title: 'Louisville Public Safety',
			slider: true,
			noLegend: false,
			collapsed: false,
			options: {
				id: 'louisvillePubSaftey',
				opacity: 1.0,
				visible: true
			}
		}, {
			type: 'dynamic',
			url: 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/DamageAssessment/MapServer',
			title: 'Damage Assessment',
			slider: true,
			noLegend: false,
			collapsed: false,
			options: {
				id: 'DamageAssessment',
				opacity: 1.0,
				visible: true
			}
		}],
		// set include:true to load. For titlePane type set position to the desired order in the sidebar
		widgets: {
			growler: {
				include: true,
				id: 'growler',
				type: 'domNode',
				path: 'gis/dijit/Growler',
				srcNodeRef: 'growlerDijit',
				options: {}
			},
			geocoder: {// https://developers.arcgis.com/javascript/jsapi/geocoder-amd.html
				include: true,
				id: 'geocoder',
				type: 'domNode',
				path: 'esri/dijit/Geocoder',
				srcNodeRef: 'geocodeDijit',
				options: {//see geocoder API Reference link above for constructor details
					// uncomment lines below then modify url: and name: to use your own geocoder service. 
					/* arcgisGeocoder: false,
					geocoders: [{
						url: "http://ServerName/ArcGIS/rest/services/GeocoderServiceName/GeocodeServer",
						name: "GeocoderServiceName",
						}], */
					map: true,
					autoComplete: true
				}
			},
			identify: {
				include: true,
				id: 'identify',
				type: 'invisible',
				path: 'gis/dijit/identify',
				options: {
					map: true,
					mapClickMode: true,
					identifyTolerance: 5
				}
			},
			basemaps: {
				include: true,
				id: 'basemaps',
				type: 'domNode',
				path: 'gis/dijit/Basemaps',
				srcNodeRef: 'basemapsDijit',
				options: {
					map: true,
					mode: 'agol', //must be either 'agol' or 'custom'
					title: 'Basemaps',
					mapStartBasemap: null, //valid options for 'agol' mode: null, 'streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'
					basemapsToShow: ['streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'] //basemaps to show in menu. If 'agol' mode use valid values from above, if 'custom' mode then define in basmaps dijit and refrenc by name here
				}
			},
			scalebar: {// https://developers.arcgis.com/javascript/jsapi/scalebar-amd.html
				include: true,
				id: 'scalebar',
				type: 'map',
				path: 'esri/dijit/Scalebar',
				options: {//see scalebar API Reference link above for constructor details
					map: true,
					attachTo: 'bottom-left',
					scalebarStyle: 'line',
					scalebarUnit: 'dual'
				}
			},
			locateButton: {// https://developers.arcgis.com/javascript/jsapi/locatebutton-amd.html
				include: true,
				id: 'locateButton',
				type: 'domNode',
				path: 'gis/dijit/LocateButton',
				srcNodeRef: 'locateButton',
				options: {//see locatebutton API Reference link above for constructor details
					map: true,
					highlightLocation: true,
					useTracking: true,
					geolocationOptions: {
						maximumAge: 0,
						timeout: 15000,
						enableHighAccuracy: true
					}
				}
			},
			overviewMap: {// https://developers.arcgis.com/javascript/jsapi/overviewmap-amd.html
				include: true,
				id: 'overviewMap',
				type: 'map',
				path: 'esri/dijit/OverviewMap',
				options: {//see overviewmap API Reference link above for constructor details
					map: true,
					attachTo: 'bottom-right',
					color: '#0000CC',
					height: 100,
					width: 125,
					opacity: 0.30,
					visible: false
				}
			},
			homeButton: {// https://developers.arcgis.com/javascript/jsapi/homebutton-amd.html
				include: true,
				id: 'homeButton',
				type: 'domNode',
				path: 'esri/dijit/HomeButton',
				srcNodeRef: 'homeButton',
				options: {//see homebutton API Reference link above for constructor details
					map: true,
					extent: new Extent({
						// to modify homebutton extent for your map 
						// use this helper Tool http://www.arcgis.com/home/item.html?id=dd1091f33a3e4ecb8cd77adf3e585c8a
						xmin: -180,
						ymin: -85,
						xmax: 180,
						ymax: 85,
						spatialReference: {
							wkid: 4326
						}
					})
				}
			},
			legend: {
				include: true,
				id: 'legend',
				type: 'titlePane',
				path: 'esri/dijit/Legend',
				title: 'Legend',
				open: false,
				position: 0,
				options: {
					map: true,
					legendLayerInfos: true
				}
			},
			TOC: {
				include: true,
				id: 'toc',
				type: 'titlePane',
				path: 'gis/dijit/TOC',
				title: 'Layers',
				open: false,
				position: 1,
				options: {
					map: true,
					tocLayerInfos: true
				}
			},
			bookmarks: {// https://developers.arcgis.com/javascript/jsapi/bookmarks-amd.html
				include: true,
				id: 'bookmarks',
				type: 'titlePane',
				path: 'gis/dijit/Bookmarks',
				title: 'Bookmarks',
				open: false,
				position: 2,
				options: {//see bookmarks API Reference link above for constructor details
					map: true,
					editable: true
				}
			},
			draw: {
				include: true,
				id: 'draw',
				type: 'titlePane',
				path: 'gis/dijit/Draw',
				title: 'Draw',
				open: false,
				position: 3,
				options: {
					map: true,
					mapClickMode: true
				}
			},
			measure: {// https://developers.arcgis.com/javascript/jsapi/measurement-amd.html
				include: true,
				id: 'measurement',
				type: 'titlePane',
				path: 'gis/dijit/Measurement',
				title: 'Measurement',
				open: false,
				position: 4,
				options: {//see measurment API Reference link above for constructor details
					map: true,
					mapClickMode: true,
					defaultAreaUnit: units.SQUARE_MILES,
					defaultLengthUnit: units.MILES
				}
			},
			print: {// https://developers.arcgis.com/javascript/jsapi/print-amd.html
				include: true,
				id: 'print',
				type: 'titlePane',
				path: 'gis/dijit/Print',
				title: 'Print',
				open: false,
				position: 5,
				options: {//see print (not printTask) API Reference link above for constructor details
					map: true,
					// modify url for your own Export Web Map Task service
					printTaskURL: 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task',
					copyrightText: 'Copyright 2014',
					authorText: 'Me',
					defaultTitle: 'Viewer Map',
					defaultFormat: 'PDF',
					defaultLayout: 'Letter ANSI A Landscape'
				}
			},
			directions: {// https://developers.arcgis.com/javascript/jsapi/directions-amd.html
				include: true,
				id: 'directions',
				type: 'titlePane',
				path: 'gis/dijit/Directions',
				title: 'Directions',
				open: false,
				position: 6,
				options: {
					map: true,
					options: {//see directions API Reference link above for constructor details. optimalRoute parameter is set by user
					// modify routeTaskUrl: to use your own NAServer service
						routeTaskUrl: 'http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Network/USA/NAServer/Route',
						routeParams: {
							directionsLanguage: 'en-US',
							directionsLengthUnits: units.MILES
						}
					}
				}
			},
			editor: {// https://developers.arcgis.com/javascript/jsapi/editor-amd.html
				include: true,
				id: 'editor',
				type: 'titlePane',
				path: 'gis/dijit/Editor',
				title: 'Editor',
				open: false,
				position: 7,
				options: {
					map: true,
					mapClickMode: true,
					editorLayerInfos: true,
					settings: {//see editor API Reference link above for constructor details
						toolbarVisible: true,
						showAttributesOnClick: true,
						enableUndoRedo: true,
						createOptions: {
							polygonDrawTools: ['freehandpolygon', 'autocomplete']
						},
						toolbarOptions: {
							reshapeVisible: true,
							cutVisible: true,
							mergeVisible: true
						}
					}
				}
			},
			streetview: {
				include: true,
				id: 'streetview',
				type: 'floating',
				path: 'gis/dijit/StreetView',
				title: 'Google Street View',
				options: {
					map: true,
					mapClickMode: true,
					openOnStartup: true
				}
			}
		}
	};
});

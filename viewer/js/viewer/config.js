define([
	'esri/InfoTemplate',
	'esri/units'
], function(InfoTemplate, units) {
	return {
		// url to your proxy page, must be on same machine hosting you app. See proxy folder for readme.
		proxy: {
			url: 'proxy/proxy.ashx',
			alwaysUseProxy: false
		},
		// url to your geometry server.
		geometryService: {
			url: 'http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer'
		},
		//default mapClick mode, mapClickMode lets widgets know what mode the map is in to avoid multipult map click actions from taking place (ie identify while drawing).
		defaultMapClickMode: 'identify',
		// basemapMode: must be either 'agol' or 'custom'
		//basemapMode: 'custom',
		basemapMode: 'agol',
		// defaultBasemap: valid options for 'agol' mode: 'streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'
		//mapStartBasemap: 'lightGray',
		mapStartBasemap: 'streets',
		//basemapsToShow: basemaps to show in menu. If 'agol' mode use valid values from above, if 'custom' mode then define in basmaps dijit and refrenc by name here
		//basemapsToShow: ['street', 'satellite', 'hybrid', 'satTrans', 'lightGray'],
		basemapsToShow: ['streets', 'satellite', 'hybrid', 'topo', 'gray', 'oceans', 'national-geographic', 'osm'],
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
		// tolerance for identify map click.
		identifyTolerance: 5,
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
		// widgets for the map area. set include to true or false to load or leave out the widget.
		mapWidgets: {
			scalebar: {
				include: true,
				options: {
					attachTo: 'bottom-left',
					scalebarStyle: 'line',
					scalebarUnit: 'dual'
				}
			},
			locateButton: {
				include: true,
				options: {
					highlightLocation: true,
					useTracking: true,
					geolocationOptions: {
						maximumAge: 0,
						timeout: 15000,
						enableHighAccuracy: true
					}
				}
			},
			overviewMap: {
				include: true,
				options: {
					attachTo: 'bottom-right',
					color: '#0000CC',
					height: 100,
					width: 125,
					opacity: 0.30,
					visible: false
				}
			},
			homeButton: {
				include: true,
				options: {
					extent: {
						xmin: -180,
						ymin: -85,
						xmax: 180,
						ymax: 85,
						spatialReference: {
							wkid: 4326
						}
					}
				}
			}
		},
		// widgets for the sidebar. Set include to true or false to load or leave out the widget. Set position to the desired order, starts at 0 on the top.
		sidebarWidgets: {
			legend: {
				include: true,
				title: 'Legend',
				open: false,
				position: 0
			},
			TOC: {
				include: true,
				title: 'Layers',
				open: false,
				position: 1
			},
			bookmarks: {
				include: true,
				title: 'Bookmarks',
				open: false,
				position: 2
			},
			draw: {
				include: true,
				title: 'Draw',
				open: false,
				position: 3
			},
			measure: {
				include: true,
				title: 'Measurement',
				open: false,
				position: 4,
				defaultAreaUnit: units.SQUARE_MILES,
				defaultLengthUnit: units.MILES
			},
			print: {
				include: true,
				title: 'Print',
				open: false,
				position: 5,
				serviceURL: 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task',
				copyrightText: 'Copyright 2014',
				authorText: 'Me',
				defaultTitle: 'Viewer Map',
				defaultFormat: 'PDF',
				defaultLayout: 'Letter ANSI A Landscape'
			},
			directions: {
				include: true,
				title: 'Directions',
				open: false,
				position: 6,
				options: {
					routeTaskUrl: 'http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Network/USA/NAServer/Route',
					routeParams: {
						directionsLanguage: 'en-US',
						directionsLengthUnits: 'esriMiles'
					}
				}
			},
			editor: {
				include: true,
				title: 'Editor',
				open: false,
				position: 7,
				settings: {
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
		}
	};
});
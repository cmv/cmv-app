define([
    //'esri/dijit/Basemap',
    //'esri/dijit/BasemapLayer',
    //'esri/layers/osm'
], function (/* Basemap, BasemapLayer, osm */) {
    'use strict';

    return {
        map: true, // needs a refrence to the map
        mode: 'agol', //must be either 'agol' or 'custom'
        title: 'Basemaps', // title for widget

        /* optional starting basemap
        / otherwise uses the basemap from the map
        / must match one of the keys in basemaps object below
        */
        //mapStartBasemap: 'streets',

        /* optional array of  basemaps to show in menu.
        / otherwise uses keys in basemaps object below
        / values in array must match keys in basemaps object
        */
        //basemapsToShow: ['streets', 'satellite', 'hybrid', 'topo', 'lightGray', 'gray', 'national-geographic', 'osm', 'oceans'],

        // define all valid custom basemaps here. Object of Basemap objects. For custom basemaps, the key name and basemap id must match.
        basemaps: { // agol basemaps
            streets: {
                title: 'Streets'
            },
            'streets-night-vector': {
                title: 'Streets (Night)'
            },
            'streets-navigation-vector': {
                title: 'Streets (Navigation)'
            },
            'streets-relief-vector': {
                title: 'Street (Relief)'
            },
            satellite: {
                title: 'Satellite'
            },
            hybrid: {
                title: 'Hybrid'
            },
            topo: {
                title: 'Topo'
            },
            'terrain': {
                title: 'Terrain'
            },
            'gray-vector': {
                title: 'Gray'
            },
            'dark-gray-vector': {
                title: 'Dark Gray'
            },
            oceans: {
                title: 'Oceans'
            },
            'national-geographic': {
                title: 'Nat Geo'
            },
            osm: {
                title: 'Open Street Map'
            }

            // examples of custom basemaps

            /*streets: {
                title: 'Streets',
                basemap: new Basemap({
                    id: 'streets',
                    layers: [new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer'
                    })]
                })
            },
            satellite: {
                title: 'Satellite',
                basemap: new Basemap({
                    id: 'satellite',
                    layers: [new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                    })]
                })
            },
            hybrid: {
                title: 'Hybrid',
                basemap: new Basemap({
                    id: 'hybrid',
                    layers: [new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                    }), new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer',
                        isReference: true,
                        displayLevels: [0, 1, 2, 3, 4, 5, 6, 7]
                    }), new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer',
                        isReference: true,
                        displayLevels: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
                    })]
                })
            },
            lightGray: {
                title: 'Light Gray Canvas',
                basemap: new Basemap({
                    id: 'lightGray',
                    layers: [new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer'
                    }), new BasemapLayer({
                        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer',
                        isReference: true
                    })]
                })
            }*/

            // example using vector tile basemaps (beta in v3.15)

            /*
            streets: {
                title: 'Streets',
                basemap: new Basemap({
                    id: 'streets',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/3b8814f6ddbd485cae67e8018992246e/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            },
            satellite: {
                title: 'Satellite',
                basemap: new Basemap({
                    id: 'satellite',
                    layers: [new BasemapLayer({
                        url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                    })]
                })
            },
            hybrid: {
                title: 'Hybrid',
                basemap: new Basemap({
                    id: 'hybrid',
                    layers: [
                        new BasemapLayer({
                            url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                        }),
                        new BasemapLayer({
                            'styleUrl': '//www.arcgis.com/sharing/rest/content/items/1854498c7e35420b963a514a32689c80/resources/styles/root.json',
                            'type': 'VectorTileLayer',
                            isReference: true
                        })
                    ]
                })
            },
            lightGray: {
                title: 'Light Gray Canvas',
                basemap: new Basemap({
                    id: 'lightGray',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/bdf1eec3fa79456c8c7c2bb62f86dade/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            },
            darkGray: {
                title: 'Dark Gray Canvas',
                basemap: new Basemap({
                    id: 'darkGray',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/3e3099d7302f4d99bc6f916dcc07ed59/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            },
            navigation: {
                title: 'Navigation',
                basemap: new Basemap({
                    id: 'navigation',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/00cd8e843bae49b3a040423e5d65416b/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            },
            streetsNight: {
                title: 'Streets Night',
                basemap: new Basemap({
                    id: 'streetsNight',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/f96366254a564adda1dc468b447ed956/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            },
            streetsRelief: {
                title: 'Streets w/ Relief',
                basemap: new Basemap({
                    id: 'streetsRelief',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/ad06088bd1174866aad2dddbf5ec9642/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            },
            topo: {
                title: 'Topographic',
                basemap: new Basemap({
                    id: 'topo',
                    layers: [new BasemapLayer({
                        'styleUrl': '//www.arcgis.com/sharing/rest/content/items/be44936bcdd24db588a1ae5076e36f34/resources/styles/root.json',
                        'type': 'VectorTileLayer'
                    })]
                })
            }
            */

        }
    };
});
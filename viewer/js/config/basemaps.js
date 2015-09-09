define([
    //'esri/dijit/Basemap',
    //'esri/dijit/BasemapLayer',
    //'esri/layers/osm'
], function ( /* Basemap, BasemapLayer, osm */ ) {
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
            satellite: {
                title: 'Satellite'
            },
            hybrid: {
                title: 'Hybrid'
            },
            topo: {
                title: 'Topo'
            },
            gray: {
                title: 'Gray'
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
        }
    };
});
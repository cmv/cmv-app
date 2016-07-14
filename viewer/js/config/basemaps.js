define([
    //'esri/dijit/Basemap',
    //'esri/dijit/BasemapLayer'
    'dojo/i18n!./nls/main'
], function (/* Basemap, BasemapLayer, */i18n) {

    return {
        map: true, // needs a reference to the map
        mode: 'agol', // mut be either 'agol' or 'custom'
        title: i18n.basemaps.title, // title for widget

        /* optional starting basemap
        / otherwise uses the basemap from the map
        / must match one of the keys in basemaps object below
        */
        //mapStartBasemap: 'streets',

        /* optional array of  basemaps to show in menu.
        / otherwise uses keys in basemaps object below
        / values in array must match keys in basemaps object
        */
        //basemapsToShow: ['streets', 'satellite', 'hybrid', 'topo', 'lightGray', 'gray', 'nationalGeographic', 'osm', 'oceans'],

        // define all valid basemaps here.
        basemaps: {
            streets: {
                title: i18n.basemaps.streets
            },
            streetsNightVector: { // requires v3.16 or higher
                title: i18n.basemaps.streetsNightVector
            },
            streetsNavigationVector: { // requires v3.16 or higher
                title: i18n.basemaps.streetsNavigationVector
            },
            streetsReliefVector: { // requires v3.16 or higher
                title: i18n.basemaps.streetsReliefVector
            },
            satellite: {
                title: i18n.basemaps.satellite
            },
            hybrid: {
                title: i18n.basemaps.hybrid
            },
            topo: {
                title: i18n.basemaps.topo
            },
            terrain: {
                title: i18n.basemaps.terrain
            },
            grayVector: { // requires v3.16 or higher
                title: i18n.basemaps.grayVector
            },
            darkGrayVector: { // requires v3.16 or higher
                title: i18n.basemaps.darkGrayVector
            },
            oceans: {
                title: i18n.basemaps.oceans
            },
            nationalGeographic: {
                title: i18n.basemaps.nationalGeographic
            },
            osm: {
                title: i18n.basemaps.osm
            },
            landsatShaded: {
                title: i18n.basemaps.landsatShaded,
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/LandsatShadedBasemap/ImageServer'
                        }
                    ]
                }
            },
            earthAtNight: {
                title: i18n.basemaps.earthAtNight,
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/Earth_at_Night_WM/MapServer'
                        }
                    ]
                }
            },
            davidRumseyMap1812: {
                title: i18n.basemaps.davidRumseyMap1812,
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://tiles.arcgis.com/tiles/IEuSomXfi6iB7a25/arcgis/rest/services/World_Globe_1812/MapServer'
                        }
                    ]
                }
            }

            // additional examples of vector tile basemaps (requires v3.16 or higher)
            /*
            streetsVector: {
                title: 'Streets',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/3b8814f6ddbd485cae67e8018992246e/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            },
            satelliteVector: {
                title: 'Satellite',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                        }
                    ]
                }
            },
            hybridVector: {
                title: 'Hybrid',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                        },
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/1854498c7e35420b963a514a32689c80/resources/styles/root.json',
                            type: 'VectorTile',
                            isReference: true
                        }
                    ]
                }
            },
            lightGrayVector: {
                title: 'Light Gray Canvas',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/bdf1eec3fa79456c8c7c2bb62f86dade/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            },
            darkGrayVector: {
                title: 'Dark Gray Canvas',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/3e3099d7302f4d99bc6f916dcc07ed59/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            },
            navigationVector: {
                title: 'Navigation',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/00cd8e843bae49b3a040423e5d65416b/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            },
            streetsNightVector: {
                title: 'Streets Night',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/f96366254a564adda1dc468b447ed956/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            },
            streetsReliefVector: {
                title: 'Streets w/ Relief',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/ad06088bd1174866aad2dddbf5ec9642/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            },
            topoVector: {
                title: 'Topographic',
                basemap: {
                    baseMapLayers: [
                        {
                            url: 'https://www.arcgis.com/sharing/rest/content/items/be44936bcdd24db588a1ae5076e36f34/resources/styles/root.json',
                            type: 'VectorTile'
                        }
                    ]
                }
            }
            */

            //examples of custom basemaps
            /*
            streets: {
                title: 'Streets',
                basemap: new Basemap({
                    id: 'streets',
                    layers: [new BasemapLayer({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer'
                    })]
                })
            },
            satellite: {
                title: 'Satellite',
                basemap: new Basemap({
                    id: 'satellite',
                    layers: [new BasemapLayer({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                    })]
                })
            },
            hybrid: {
                title: 'Hybrid',
                basemap: new Basemap({
                    id: 'hybrid',
                    layers: [new BasemapLayer({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                    }), new BasemapLayer({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer',
                        isReference: true,
                        displayLevels: [0, 1, 2, 3, 4, 5, 6, 7]
                    }), new BasemapLayer({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer',
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
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer'
                    }), new BasemapLayer({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer',
                        isReference: true
                    })]
                })
            },
            stamenToner: {
                title: 'Toner (maps.stamen.com)',
                basemap: new Basemap({
                    id: 'stamenToner',
                    layers: [new BasemapLayer({
                        url: 'https://tile.stamen.com/toner/${level}/${col}/${row}.png',
                        copyright: 'stamen, 2016',
                        id: 'stamenToner',
                        type: 'WebTiledLayer'
                    })]
                })
            },
            stamenTerrain: {
                title: 'Terrain (stamen.com)',
                basemap: new Basemap({
                    id: 'stamenTerrain',
                    layers: [new BasemapLayer({
                        url: 'https://tile.stamen.com/terrain/${level}/${col}/${row}.png',
                        copyright: 'stamen, 2016',
                        id: 'stamenTerrain',
                        type: 'WebTiledLayer'
                    })]
                })
            },
            stamenWatercolor: {
                title: 'Watercolor (stamen.com)',
                basemap: new Basemap({
                    id: 'stamenWatercolor',
                    layers: [new BasemapLayer({
                        url: 'https://tile.stamen.com/watercolor/${level}/${col}/${row}.png',
                        copyright: 'stamen, 2016',
                        id: 'stamenWatercolor',
                        type: 'WebTiledLayer'
                    })]
                })
            },
            mapboxPirates: {
                title: 'Pirates (mapbox.com)',
                basemap: new Basemap({
                    id: 'mapboxPirates',
                    layers: [new BasemapLayer({
                        url: 'https://${subDomain}.tiles.mapbox.com/v3/aj.Sketchy2/${level}/${col}/${row}.png',
                        copyright: 'mapbox, 2016',
                        id: 'mapboxPirates',
                        subDomains: ['a', 'b', 'c', 'd'],
                        type: 'WebTiledLayer'
                    })]
                })
            }
            */
        }
    };
});
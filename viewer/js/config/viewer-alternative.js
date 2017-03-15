define([
    'config/viewer'
], function (config) {
    var widgets = config.widgets;
    config.widgets = {
        growler: widgets.growler,
        search: widgets.search,
        basemaps: widgets.basemaps,
        mapInfo: widgets.mapInfo,
        scalebar: widgets.scalebar,
        locateButton: widgets.locateButton,
        overviewMap: widgets.overviewMap,
        homeButton: widgets.homeButton,
        legend: widgets.legend,
        layerControl: widgets.layerControl,
        locale: widgets.locale,
        help: widgets.help,
        configSwitch: widgets.configSwitch
    };
    /*
        growler: widgets.growler,
        search: widgets.search,
        basemaps: widgets.basemaps,
        identify: widgets.identify,
        mapInfo: widgets.mapInfo,
        scalebar: widgets.scalebar,
        locateButton: widgets.locateButton,
        overviewMap: widgets.overviewMap,
        homeButton: widgets.homeButton,
        legend: widgets.legend,
        layerControl: widgets.layerControl,
        bookmarks: widgets.bookmarks,
        find: widgets.find,
        draw: widgets.draw,
        measure: widgets.measure,
        print: widgets.print,
        directions: widgets.directions,
        editor: widgets.editor,
        streetview: widgets.streetview,
        locale: widgets.locale,
        help: widgets.help,
        configSwitch: widgets.configSwitch
    */
    config.panes = {
        left: {
            open: false
        }
    };
    return config;
});

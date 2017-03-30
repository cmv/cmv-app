define([
    'dojo/i18n!./nls/main'
], function (i18n) {

    return {
        map: true,
        editable: true,
        bookmarks: [
            {
                extent: {
                    xmin: -15489130.48708616,
                    ymin: 398794.4860580916,
                    xmax: -5891085.7193757,
                    ymax: 8509680.431452557,
                    spatialReference: {
                        wkid: 102100
                    }
                },
                name: i18n.bookmarks.usa
            },
            {
                extent: {
                    xmin: 0,
                    ymin: 0,
                    xmax: 0,
                    ymax: 0,
                    spatialReference: {
                        wkid: 102100
                    }
                },
                name: i18n.bookmarks.nullIsland
            }
        ]
    };
});
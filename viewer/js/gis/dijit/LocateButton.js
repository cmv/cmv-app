define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/number',
    'dojo/topic',

    'esri/dijit/LocateButton',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/PictureMarkerSymbol',
    'esri/layers/GraphicsLayer',
    'esri/InfoTemplate'
], function (declare, lang, on, number, topic, LocateButton, SimpleRenderer, PictureMarkerSymbol, GraphicsLayer, InfoTemplate) {

    return declare([LocateButton], {
        growlTemplate: '<div style="white-space:nowrap;margin:5px 0;"><b>latitude:</b> {latitude}<br/><b>longitude:</b> {longitude}<br/><b>accuracy:</b> {accuracy}<br/><b>altitude:</b> {altitude}<br/><b>altitude accuracy:</b> {altitudeAccuracy}<br/><b>heading:</b> {heading}<br/><b>speed:</b> {speed}</div>',

        postCreate: function () {
            this.inherited(arguments);

            var symbol = new PictureMarkerSymbol('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAmCAYAAACoPemuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABJhJREFUeNrcmN9PW2UYx7/n9ATKj7QMMUCxmSxlCRI3BzF6MRO9WOyVN5sJFxqvNCa7MmbphTG78Iprwx+weEMiF8bdLNFojBhNDEwu3ObWjo2uLUXKaIFSCqdnz7e8hx1WdOcUij+e5ElLOe3zyfd93ud9nlezLAte7LOv0S4vZ8VPi0eU72dx5bPiU+Jr9j8+fevpcTS3YALUIy/viUdRn10TvyK+cChgTwL5dOCZNqA7CARbgIB//+8VSkB+A8jmgdw6YFb2AgrcQt1gAsUli4m3E6gnAAx0A61N3qQqloE7WZGqsAvIZR0TuCnPYAJ1UV4u8H2oAzhZB9B+gLcFML2y+9GkwI27BhOomL10g71AfxcO1eaWgJuZx0srcGNPBbOV4tK9emInjxphzL9f7u4ubY1y+j45VV2+RkLR+NuMoeyCil0LpnZfzF6+RkI54RhLWUwx1CjGktDORD/snPo7YyzGZGzF8BhMkUaZV9x9R22M6duRKGqrpjvUqtapg5aEeowxGdvJoquzr6rWgEe1uJ8rFrSy+EYFOp3v+ZnlEW5gr2rthjqQq8eMF7UYvGRBL5jwFbZhFCs76rfqqAQMbAd8MP0aKroGy61qZFhcrf551lBdQvXs8wK1VoFvoYym+5vwT6ceBrMrq36YW+gOtJRGng/ljzej1NOEcrsO0y0cGRTYacNuW9yWB0agUoSaLpiBianfw5l7ydbBvle0Yi6Dn+IT1s8n+ouj588nR441F55rxmaLBlNzWT6URXbB/qpLqAETtbh8VGrih9nwYHi47e33TyErx3Lhfhc6Zl7Ufrs62TaxfiXc9eEHCS4rl1RzoZqDIaJ73UHbbGkkp64/WAqm/7jROvAacGtTzj5Zgrvii5YJq/N1pH/8tvX6rTtBPrtdx071DGaKYkz0zFLOf/LZF7TMn0BqXlqaJJBZLCOVzwEbq7CWwlpmPunns/yO1zhG3cVHEn0rn8bq3DBK0s4UimsoPlzZaboyImFB1tY06/55z4r5JFdYEno7g6W5+HfW9vwGyullbKSkl7knaiXyVdcqv1q9faESn/W53JUHAqPETOgz/eF8KDJYnPnmC6wncrASotRN6aFnRKnclwi9ca545tRQns8adSoWt3t0N8bdxeLJOjX6zrvJQMfq+vJXFy1c/Rz4fhz68kdW3zn/+ugnl5N8hs9qLhVzMMQNBRZh4+amZDCLuf1ZPEc6/YWuSx8npt+MBrMPUn5UKugOXSqNDL+0W2CrpcJD8+gE49wX5TQTPuZSZlGAFZ3Fk0t1/OWhUnFk6EBHEo0MymYNNYzGOGJxWHB7XjIgKzqDdxrYsksCE91QS+6lRjA2GZRN6dJrc5S6xt6bI5YX0xRgEyFFKTrf6x6haIyt+n8OJ2v2ruSEXC1BJD9qY0zGdrLo6i5hwVbtdvbowW6k96i18GQdI+kah1HOfUdljKVaHabUeE2BVaTVwZPDqGPrNswYwzH4jql8r6386i5hku85jDYSzh54HVcFU//NK4JGX6ow0VVOeb9U+VdfQzX44m7cmej/r6vOf+py+JEAAwDRMD/uB0XQuQAAAABJRU5ErkJggg==', 38, 38);
            this.graphicsLayer = new GraphicsLayer({
                id: 'GeoLocationGraphics'
            });
            var renderer = new SimpleRenderer(symbol);
            renderer.label = 'GPS Position';
            renderer.description = 'GPS Position';
            this.graphicsLayer.setRenderer(renderer);
            this.map.addLayer(this.graphicsLayer);

            this.infoTemplate = new InfoTemplate('GPS Position', '${*}');
            this.symbol = null;

            on(this, 'locate', lang.hitch(this, '_growlLocation'));
        },
        _growlLocation: function (evt) {
            var stats = {
                accuracy: (evt.position.coords.accuracy) ? number.format(evt.position.coords.accuracy) : '',
                altitude: (evt.position.coords.altitude) ? number.format(evt.position.coords.altitude) : '',
                altitudeAccuracy: (evt.position.coords.altitudeAccuracy) ? number.format(evt.position.coords.altitudeAccuracy) : '',
                heading: (evt.position.coords.heading) ? number.format(evt.position.coords.heading) : '',
                latitude: (evt.position.coords.latitude) ? number.format(evt.position.coords.latitude, {places: 6}) : '',
                longitude: (evt.position.coords.longitude) ? number.format(evt.position.coords.longitude, {places: 6}) : '',
                speed: (evt.position.coords.speed) ? number.format(evt.position.coords.speed) : ''
            };

            evt.graphic.attributes = stats;

            if (this.publishGPSPosition) {
                topic.publish('growler/growl', {
                    title: 'GPS Position',
                    message: lang.replace(this.growlTemplate, stats),
                    level: 'default', //can be: 'default', 'warning', 'info', 'error', 'success'.
                    timeout: 10000, //set to 0 for no timeout
                    opacity: 1.0
                });
            }
        }
    });
});
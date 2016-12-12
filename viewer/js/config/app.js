(function () {
    var path = location.pathname.replace(/[^\/]+$/, '');
    window.dojoConfig = {
        async: true,
        packages: [
            {
                name: 'viewer',
                location: path + 'js/viewer'
            }, {
                name: 'gis',
                location: path + 'js/gis'
            }, {
                name: 'config',
                location: path + 'js/config'
            }, {
                name: 'proj4js',
                location: '//cdnjs.cloudflare.com/ajax/libs/proj4js/2.3.15'
            }
        ]
    };

    require(window.dojoConfig, [
        'dojo/_base/declare',

        // minimal Base Controller
        'viewer/_ControllerBase',

        // *** Controller Mixins
        // Use the core mixins, add custom mixins
        // or replace core mixins with your own
        'viewer/_ConfigMixin', // manage the Configuration
        'viewer/_LayoutMixin', // build and manage the Page Layout and User Interface
        'viewer/_MapMixin', // build and manage the Map
        'viewer/_WidgetsMixin', // build and manage the Widgets

        'viewer/_WebMapMixin' // for WebMaps
        //'config/_customMixin'

    ], function (
        declare,

        _ControllerBase,
        _ConfigMixin,
        _LayoutMixin,
        _MapMixin,
        _WidgetsMixin,

        _WebMapMixin
        //_MyCustomMixin

    ) {
        var controller = new (declare([
            _ControllerBase,
            _ConfigMixin,
            _LayoutMixin,
            _MapMixin,
            _WidgetsMixin,

            _WebMapMixin
        ]))();
        controller.startup();
    });
})();

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
                name: 'put-selector',
                main: 'put',
                name: 'proj4js',
                location: '//cdnjs.cloudflare.com/ajax/libs/proj4js/2.3.12'
                location: 'https://cdn.rawgit.com/kriszyp/put-selector/v0.3.6'
            }, {
                name: 'xstyle',
                main: 'css',
                location: 'https://cdn.rawgit.com/kriszyp/xstyle/v0.3.2'
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
        'viewer/_WidgetsMixin' // build and manage the Widgets

        //'config/_customMixin'

    ], function (
        declare,

        _ControllerBase,
        _ConfigMixin,
        _LayoutMixin,
        _MapMixin,
        _WidgetsMixin

        //_MyCustomMixin

    ) {
        var controller = new (declare([
            _ControllerBase,
            _ConfigMixin,
            _LayoutMixin,
            _MapMixin,
            _WidgetsMixin
        ]))();
        controller.startup();
    });
})();

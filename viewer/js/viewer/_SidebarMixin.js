define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom',
    'dojo/sniff',
    'dojo/Deferred',
    'module',

    'put-selector'

], function (
    declare,
    lang,
    dom,
    has,
    Deferred,
    module,

    put,

    Sidebar
) {

    return declare(null, {

        postConfig: function () {
            this.config.layout = this.config.layout || {};
            this._checkForSidebarLayout();

            if (this.config.layout.sidebar) {
                this.inherited(arguments);
                this.config.panes = this.mixinDeep(this.config.panes || {}, {
                    left: {
                        collapsible: false,
                        style: 'display:none !important'
                    }
                });
                var deferred = new Deferred();
                require([
                    'viewer/sidebar/Sidebar'
                ], lang.hitch(this, function (sidebar) {
                    Sidebar = sidebar;
                    this.mapDeferred.then(lang.hitch(this, '_createSidebar'));
                    deferred.resolve();
                }));
                return deferred;
            }
            return this.inherited(arguments);
        },

        _checkForSidebarLayout: function () {
            var sidebar = this.config.layout.sidebar;

            switch (sidebar) {
            // all devices
            case true:
                break;

            // no devices
            case false:
                break;

            // tablets and phones
            case 'mobile':
                if (has('mobile')) {
                    sidebar = true;
                }
                break;

            // phones
            case 'phone':
                if (has('phone')) {
                    sidebar = true;
                }
                break;
            default:
                // perhaps they've configured something we don't expect
                if (typeof sidebar === 'string') {
                    if (has(sidebar)) {
                        sidebar = true;
                    }
                // default is just for phones
                } else if (has('phone')) {
                    sidebar = true;
                }
                break;
            }
            this.config.layout.sidebar = sidebar;
        },

        _createSidebar: function () {
            var mapContainer = dom.byId(this.map.id);
            //create controls div
            var mapControlsNode = put(this.map.root, 'div.sidebar-map');
            //create sidebar
            this.sidebar = new Sidebar({
                map: this.map,
                mapContainer: mapContainer,
                collapseSyncNode: mapControlsNode
            }, put(this.map.root, 'div'));
            this.sidebar.startup();

            this._origCreateTitlePaneWidget = lang.clone(this._createTitlePaneWidget);
            this._createTitlePaneWidget = this._createTabPaneWidget;
        },

        _createTabPaneWidget: function (widgetConfig) {
            // if not a pane widget (placed elsewhere), use the original method
            if (!this.panes[widgetConfig.placeAt]) {
                return this._origCreateTitlePaneWidget(widgetConfig);
            }

            // show the sidebar now that a widget is being added
            this.sidebar.show();
            var tabOptions = widgetConfig.tabOptions || widgetConfig.paneOptions;
            return this.sidebar.createTab(tabOptions);
        }

    });
});
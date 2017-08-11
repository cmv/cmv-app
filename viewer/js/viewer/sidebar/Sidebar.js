define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',

    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-geometry',
    'dojo/on',
    'dojo/aspect',

    'dijit/registry',

    'put-selector/put',

    'viewer/sidebar/SidebarTab',

    'dojo/text!./templates/Sidebar.html',

    'xstyle/css!./css/Sidebar.css',

    'dojo/NodeList-traverse'

], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,

    lang,
    array,
    query,
    domClass,
    domGeom,
    on,
    aspect,

    registry,

    put,

    SidebarTab,

    template
) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        baseClass: 'sidebar',

        viewPadding: {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        },

        showCloseIcon: true,

        collapseSyncNode: null,

        postCreate: function () {
            this.inherited(arguments);

            // start hidden until a widget is added
            this.hide();

            this.tabs = [];
            if (this.collapseSyncNode) {
                //wire up css transition callback covering all event name bases
                on(this.collapseSyncNode, 'transitionend, oTransitionEnd, webkitTransitionEnd, animationend, webkitAnimationEnd', lang.hitch(this, '_setViewPadding'));
            }
            aspect.before(this.map, 'setExtent', lang.hitch(this, '_viewPaddingHandler'));

            // resize tab and any widgets within the tab when it is opened
            on(this.domNode, 'transitionend, oTransitionEnd, webkitTransitionEnd, animationend, webkitAnimationEnd', lang.hitch(this, '_resizeActiveTab'));

            // resize tab and any widgets within the tab when the browser is resized
            on(window, 'resize', lang.hitch(this, function () {
                window.setTimeout(lang.hitch(this, '_resizeActiveTab'), 300); // 300ms to wait for the animation to complete
            }));

        },

        show: function () {
            domClass.remove(this.domNode, 'hidden');
            if (this.collapseSyncNode) {
                //move the slider into the controls div
                put(this.collapseSyncNode, '>', this.map._slider);

                if (domClass.contains(this.domNode, 'collapsed')) {
                    domClass.add(this.mapContainer, 'sidebar-collapsed');
                }
            }

        },

        hide: function () {
            domClass.add(this.domNode, 'hidden');
            domClass.remove(this.mapContainer, 'sidebar-collapsed');
        },

        createTab: function (options) {
            options = options || {};
            options.open = options.open || false;
            options.baseClass = this.baseClass;
            options.showCloseIcon = this.showCloseIcon;
            options.tabsContainerNode = this.tabsContainerNode;
            options.tabsButtonNode = this.tabsButtonNode;

            var tab = new SidebarTab(options);
            tab.watch('open', lang.hitch(this, 'checkTabs', tab));
            if (options.open) {
                tab.openTab();
            }

            this.tabs.push(tab);
            return tab;
        },

        checkTabs: function (tab) {
            array.forEach(this.tabs, function (childTab) {
                if (childTab.get('id') !== tab.get('id')) {
                    childTab.closeTab(true);
                }
            });
            if (tab.get('open')) {
                domClass.add(this.tabsButtonNode, 'active');
                domClass.remove(this.domNode, 'collapsed');
                domClass.remove(this.mapContainer, 'sidebar-collapsed');
            } else {
                domClass.remove(this.tabsButtonNode, 'active');
                domClass.add(this.domNode, 'collapsed');
                domClass.add(this.mapContainer, 'sidebar-collapsed');
            }
        },

        _setViewPadding: function () {
            var dims = domGeom.getContentBox(this.domNode);
            this.viewPadding = {
                top: 0,
                left: dims.w + dims.l,
                right: 0,
                bottom: 0
            };
            this._viewPaddingHandler(this.map.extent);
        },

        _viewPaddingHandler: function (extent) {
            if (extent.spatialReference !== this.map.extent.spatialReference) {
                return [extent];
            }
            var map = this.map,
                vp = this.viewPadding,
                w = map.width - vp.left - vp.right,
                h = map.height - vp.top - vp.bottom,
                res = Math.max(extent.getWidth() / w, extent.getHeight() / h),
                center = extent.getCenter(),
                result = map.extent.expand(res / (map.extent.getWidth() / map.width));
            result = result.centerAt({
                x: center.x - (vp.left - vp.right) * 0.5 * res,
                y: center.y - (vp.top - vp.bottom) * 0.5 * res
            });
            return [result];
        },

        _resizeActiveTab: function () {
            var childTabs = array.filter(this.tabs, function (tab) {
                return domClass.contains(tab.contentNode, 'active');
            });
            if (childTabs && childTabs.length > 0) {
                var contentNode = query(childTabs[0].contentNode);
                this._resizeWidgetsInNodeList(contentNode);
                var children = contentNode.children();
                this._resizeWidgetsInNodeList(children);
            }
        },

        _resizeWidgetsInNodeList: function (nodes) {
            array.forEach(nodes, function (node) {
                // resize any widgets
                var childWidgets = registry.findWidgets(node);
                array.forEach(childWidgets, function (widget) {
                    if (widget.resize && typeof(widget.resize) === 'function') {
                        window.setTimeout(function () {
                            widget.resize();
                        }, 50);
                    }
                });

            });
        }
    });
});
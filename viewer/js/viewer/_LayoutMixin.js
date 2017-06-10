define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/_base/array',
    'dojo/on',
    'dojo/aspect',
    'dojo/dom',
    'dojo/query',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-geometry',
    'dojo/sniff',
    'dojo/Deferred',

    'put-selector',

    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',

    'esri/dijit/PopupMobile',

    'dojo/text!./templates/mapOverlay.html'
], function (
    declare,
    lang,
    topic,
    array,
    on,
    aspect,
    dom,
    domQuery,
    domStyle,
    domClass,
    domGeom,
    has,
    Deferred,

    put,

    BorderContainer,
    ContentPane,

    PopupMobile,

    mapOverlay
) {

    return declare(null, {

        panes: {
            left: {
                id: 'sidebarLeft',
                placeAt: 'outer',
                collapsible: true,
                region: 'left'
            },
            center: {
                id: 'mapCenter',
                placeAt: 'outer',
                region: 'center',
                content: mapOverlay
            }
        },
        collapseButtons: {},

        loadConfig: function () {
            this.detectTouchDevices();
            return this.inherited(arguments);
        },

        postConfig: function () {
            this.layoutDeferred = new Deferred();
            return this.inherited(arguments);
        },

        startup: function () {
            this.config.layout = this.config.layout || {};

            this.addTopics();
            this.addTitles();
            this.setPhoneInfoWindow();
            this.initPanes();

            this.mapDeferred.then(lang.hitch(this, 'createPanes'));

            // resolve the layout deferred
            this.layoutDeferred.resolve();
            this.inherited(arguments);
        },

        // add topics for subscribing and publishing
        addTopics: function () {
            // toggle a sidebar pane
            topic.subscribe('viewer/togglePane', lang.hitch(this, function (args) {
                this.togglePane(args.pane, args.show, args.suppressEvent);
            }));

            // load a widget
            topic.subscribe('viewer/loadWidget', lang.hitch(this, function (args) {
                this.widgetLoader(args.options, args.position);
            }));

            // setup error handler. centralize the debugging
            if (this.config.isDebug) {
                topic.subscribe('viewer/handleError', lang.hitch(this, 'handleError'));
            }

            // set the current mapClickMode
            topic.subscribe('mapClickMode/setCurrent', lang.hitch(this, function (mode) {
                this.mapClickMode.current = mode;
                topic.publish('mapClickMode/currentSet', mode);
            }));

            // set the current mapClickMode to the default mode
            topic.subscribe('mapClickMode/setDefault', lang.hitch(this, function () {
                topic.publish('mapClickMode/setCurrent', this.mapClickMode.defaultMode);
            }));

        },

        // set titles (if any)
        addTitles: function () {
            if (!this.config.titles) {
                return;
            }
            var titles = this.config.titles;
            if (titles.header) {
                var headerTitleNode = dom.byId('headerTitleSpan');
                if (headerTitleNode) {
                    headerTitleNode.innerHTML = titles.header;
                }
            }
            if (titles.subHeader) {
                var subHeaderTitle = dom.byId('subHeaderTitleSpan');
                if (subHeaderTitle) {
                    subHeaderTitle.innerHTML = titles.subHeader;
                }
            }
            if (titles.pageTitle) {
                document.title = titles.pageTitle;
            }
        },
        // setup all the sidebar panes
        initPanes: function () {
            var key,
                panes = this.config.panes || {};
            this.defaultPanes = lang.clone(this.panes);
            for (key in this.panes) {
                if (this.defaultPanes.hasOwnProperty(key)) {
                    panes[key] = lang.mixin(this.defaultPanes[key], panes[key]);
                }
            }

            var container = dom.byId(this.config.layout.container) || document.body;
            this.panes.outer = new BorderContainer({
                id: 'borderContainerOuter',
                design: 'sidebar',
                gutters: false
            }).placeAt(container);

            var options, placeAt, type;
            for (key in panes) {
                if (panes.hasOwnProperty(key)) {
                    options = lang.clone(panes[key]);
                    placeAt = this.panes[options.placeAt] || this.panes.outer;
                    options.id = options.id || key;
                    type = options.type;
                    delete options.placeAt;
                    delete options.type;
                    delete options.collapsible;
                    if (placeAt) {
                        if (type === 'border') {
                            this.panes[key] = new BorderContainer(options).placeAt(placeAt);
                        } else if (options.region) {
                            this.panes[key] = new ContentPane(options).placeAt(placeAt);
                        }
                    }
                }
            }
            this.panes.outer.startup();
        },

        createPanes: function () {
            var key,
                panes = this.config.panes || {};
            for (key in this.panes) {
                if (this.defaultPanes.hasOwnProperty(key)) {
                    panes[key] = lang.mixin(this.defaultPanes[key], panes[key]);
                }
            }
            // where to place the buttons
            // either the center map pane or the outer pane?
            this.collapseButtonsPane = this.config.collapseButtonsPane || 'outer';

            for (key in panes) {
                if (panes.hasOwnProperty(key)) {
                    if (panes[key].collapsible) {
                        this.collapseButtons[key] = put(this.panes[this.collapseButtonsPane].domNode, 'div.sidebarCollapseButton.sidebar' + key + 'CollapseButton.sidebarCollapseButton' + ((key === 'bottom' || key === 'top') ? 'Vert' : 'Horz') + ' div.dijitIcon.button.close').parentNode;
                        on(this.collapseButtons[key], 'click', lang.hitch(this, 'togglePane', key, null, false));
                        this.positionSideBarToggle(key);
                        if (this.collapseButtonsPane === 'outer') {
                            var splitter = this.panes[key]._splitterWidget;
                            if (splitter) {
                                aspect.after(splitter, '_startDrag', lang.hitch(this, '_splitterStartDrag', key));
                                aspect.after(splitter, '_stopDrag', lang.hitch(this, '_splitterStopDrag', key));
                            }
                        }
                    }
                    if (panes[key].open !== undefined) {
                        this.togglePane(key, panes[key].open, true);
                    }
                    if (key !== 'center' && this.panes[key]._splitterWidget) {
                        domClass.add(this.map.root.parentNode, 'pane' + key);
                        if (key === 'right' && this.panes.top) {
                            domClass.add(this.panes.top.domNode, 'pane' + key);
                        }
                        if (key === 'right' && this.panes.bottom) {
                            domClass.add(this.panes.bottom.domNode, 'pane' + key);
                        }
                        if (key === 'left' && this.panes.top) {
                            domClass.add(this.panes.top.domNode, 'pane' + key);
                        }
                        if (key === 'left' && this.panes.bottom) {
                            domClass.add(this.panes.bottom.domNode, 'pane' + key);
                        }
                    }
                }
            }

            this.resizeLayout();
        },

        togglePane: function (id, show, suppressEvent) {
            if (!this.panes[id]) {
                return;
            }
            var domNode = this.panes[id].domNode;
            if (domNode) {
                var oldDisp = domStyle.get(domNode, 'display');
                var newDisp;

                if (typeof(show) === 'string' && (show === 'none' || show === 'block')) {
                    // Set (CSS Display Property)
                    newDisp = show;
                } else if (typeof(show) === 'boolean') {
                    // Set (boolean)
                    newDisp = (show) ? 'block' : 'none';
                } else if (show === undefined || show === null) {
                    // Toggle
                    newDisp = (oldDisp === 'none') ? 'block' : 'none';
                } else {
                    this.handleError({
                        source: '_LayoutMixin',
                        error: 'Invalid type passed as "show" property of "togglePane" function : ' + typeof(show)
                    });
                    return;
                }
                show = (newDisp === 'block');

                if (newDisp !== oldDisp) {
                    domStyle.set(domNode, 'display', newDisp);
                    if (this.panes[id]._splitterWidget) { // show/hide the splitter, if found
                        domStyle.set(this.panes[id]._splitterWidget.domNode, 'display', newDisp);
                    }
                    this.positionSideBarToggle(id);
                    if (this.panes.outer) {
                        this.panes.outer.resize();
                    }

                    if (!suppressEvent) {
                        topic.publish('viewer/onTogglePane', {
                            pane: id,
                            show: show
                        });
                    }
                }
            }
        },

        positionSideBarToggle: function (id) {
            var pane = this.panes[id];
            var btn = this.collapseButtons[id];
            if (!pane || !btn) {
                return;
            }
            var disp = domStyle.get(pane.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(btn.children[0], rCls);
            domClass.add(btn.children[0], aCls);

            // extra management required when the buttons
            // are not in the center map pane
            if (this.collapseButtonsPane === 'outer') {
                var pos = (pane._splitterWidget) ? 0 : -1;
                var orie = (id === 'bottom' || id === 'top') ? 'h' : 'w';
                if (disp === 'block') { // pane is open
                    pos += domGeom.getMarginBox(pane.domNode)[orie];
                }
                if (pane._splitterWidget) { // account for a splitter
                    pos += domGeom.getMarginBox(pane._splitterWidget.domNode)[orie];
                }
                domStyle.set(btn, id, pos.toString() + 'px');
                domStyle.set(btn, 'display', 'block');
            }
        },

        repositionSideBarButtons: function () {
            var btns = ['left', 'right', 'top', 'bottom'];
            array.forEach(btns, lang.hitch(this, function (id) {
                this.positionSideBarToggle(id);
            }));
        },

        resizeLayout: function () {
            this.panes.outer.resize();
        },

        // extra management of splitters required when the buttons
        // are not in the center map pane
        _splitterStartDrag: function (id) {
            var btn = this.collapseButtons[id];
            domStyle.set(btn, 'display', 'none');
        },
        _splitterStopDrag: function (id) {
            this.positionSideBarToggle(id);
        },

        detectTouchDevices: function () {
            if (has('touch') && (has('ios') || has('android') || has('bb'))) {
                has.add('mobile', true);
                if (screen.availWidth < 500 || screen.availHeight < 500) {
                    has.add('phone', true);
                } else {
                    has.add('tablet', true);
                }
            }
        },

        setPhoneInfoWindow: function () {
            // use the mobile popup for phones
            if (has('phone') && !this.config.mapOptions.infoWindow) {
                this.config.mapOptions.infoWindow = new PopupMobile(null, put('div'));
            }

        }
    });
});

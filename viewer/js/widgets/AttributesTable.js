define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/topic',
    'dojo/_base/array',
    'dojo/dom-style',
    'dijit/registry',

    'dijit/_Container',
    'dijit/layout/TabContainer',

    './AttributesTable/Table',

    //i18n
    'dojo/i18n!./AttributesTable/nls/AttributesTable'

], function (
    declare,
    _WidgetBase,
    lang,
    aspect,
    topic,
    array,
    domStyle,
    registry,

    _Container,
    TabContainer,
    Table,

    i18n
) {

    return declare([_WidgetBase, _Container], {
        baseClass: 'cmvAttributesContainerWidget',
        topicID: 'attributesContainer',

        // i18n
        i18n: i18n,

        postCreate: function () {
            this.inherited(arguments);

            this.addTopics();

            // add a tab container for multiple tables
            if (this.useTabs) {
                this.tabContainer = new TabContainer({
                    className: 'attributesTabContainer',
                    useSlider: true
                });
                this.addChild(this.tabContainer);
                this.tabContainer.startup();
                this.tabContainer.watch('selectedChildWidget', function(name, oldVal, newVal){
                    if (oldVal && oldVal.unselectTab) {
                        oldVal.unselectTab(name);
                    }
                    if (newVal && newVal.selectTab) {
                        newVal.selectTab(name);
                    }
                });

                this.tabContainer.on('click', lang.hitch(this.tabContainer, function () {
                    if (this.hasChildren()) {
                        var tab = this.selectedChildWidget;
                        if (tab && tab.selectTab) {
                            tab.selectTab();
                        }
                    }
                }));

                if (this.tables && this.tables.length > 0) {
                    this.addTables(this.tables);
                }

                // just add a table
            } else {
                if (this.tables && this.tables.length > 0) {
                    this.addTables(this.tables);
                }

            }

            aspect.after(this, 'resize', lang.hitch(this, 'resizeChildren'));
            this.resizeChildren();
        },

        addTopics: function () {
            // add an array of tables to the tab strip
            this.own(topic.subscribe(this.topicID + '/addTables', lang.hitch(this, 'addTables')));

            // add a new table to the tab strip
            this.own(topic.subscribe(this.topicID + '/addTable', lang.hitch(this, 'addTable')));

            // remove a table from the tab strip
            this.own(topic.subscribe(this.topicID + '/removeTable', lang.hitch(this, 'removeTable')));

            // add a new tab to the tab strip
            this.own(topic.subscribe(this.topicID + '/addTab', lang.hitch(this, 'addTab')));

            // remove a tab from the tab strip
            this.own(topic.subscribe(this.topicID + '/removeTab', lang.hitch(this, 'removeTab')));
        },

        // add multiple tables
        addTables: function (tables) {
            array.forEach(tables, lang.hitch(this, function (table) {
                this.addTable(table);
            }));
        },

        // add a Table as a Tab
        addTable: function (table) {
            var tab = this.addTab(table);
            topic.publish(this.topicID + '/tableAdded', tab);
            return  tab;
        },

        // remove a existing Table by ID
        removeTable: function (id) {
            this.removeTab(id);
            topic.publish(this.topicID + '/tableRemoved', id);
        },

        // add a Tab
        addTab: function (options, select) {
            var tabs = this.tabContainer,
                tab;

            if (!this.useTabs) {
                options.topicID = this.topicID;
            }
            if (!options.id) {
                options.id = 'attrTab-' + options.topicID;
            }
            if (typeof options.closable == 'undefined'){
                options.closable = true;
            }
            if (typeof options.confirmClose == 'undefined'){
                options.confirmClose = true;
            }
            options.map = this.map;
            options.sidebarID = this.sidebarID;

            if (this.useTabs) {
                if (!tabs) {
                    return;
                }
                // see if the tab exists already
                if (tabs.hasChildren()) {
                    tab = this.getTab(options);
                }

                // table tab not found so add it
                if (!tab) {
                    tab = new Table(options);
                    tab.startup();
                    tabs.addChild(tab);
                    tab.onClose = lang.hitch(tab, function () {
                        var close = this.confirmClose ? confirm('Do you really want to close this tab?') : true;
                        if (close && this.clearAll) {
                            this.clearAll();
                        }
                        return close;
                    });
                }
                if (tab && select !== false) {
                    tabs.selectChild(tab);
                }
            } else {
                tab = this.getTab(options);
                if (!tab) {
                    tab = new Table(options);
                    tab.startup();
                    this.addChild(tab);
                }
            }
            return tab;
        },

        // remove an existing tab by ID
        removeTab: function (id) {
            var tabs = this.tabContainer;
            if (!tabs || !tabs.hasChildren()) {
                return;
            }
            var tab = registry.byId(id);
            if (tab) {
                if (tab.clearAll) {
                    tab.clearAll();
                }
                tabs.removeChild(tab);
            }
            if (tabs.hasChildren()) {
                tabs.selectChild(0);
            }
        },

        getTab: function (options) {
            var tab = registry.byId(options.id);
            if (tab) {
                if (options.queryOptions) {
                    tab.clearAll();
                    tab.executeQuery(options);
                }
            }
            return tab;
        },

        // this will resize all the children when the container is
        // is resized. This works when container is in the bottom pane.
        // Would it work with other panes? Is there a better way?
        resizeChildren: function () {
            var node = this.domNode.parentNode,
                top = 0,
                height = domStyle.get(node, 'height'),
                width = domStyle.get(node, 'width'),
                children = null;

            if (this.tabContainer) {
                // resize the tab container first
                this.tabContainer.resize();

                var childNode = this.tabContainer.domNode.children[0];
                if (childNode) {
                    top = domStyle.get(childNode, 'height');
                    if (top === 0) {
                        top = 35;
                    }
                }
                children =this.tabContainer.getChildren();

            } else {
                children = this.getChildren();
            }

            array.forEach(children, lang.hitch(this, function (child) {
                this.resizeChild(child, top, height, width);
            }));
        },

        resizeChild: function (child, top, height, width) {
            var node = child.domNode;
            domStyle.set(node, 'top', (top - 1) + 'px');
            domStyle.set(node, 'height', (height - top) + 'px');
            domStyle.set(node, 'width', width + 'px');

            if (child.checkSizing) {
                child.checkSizing();
            }

            // this gets the columns to resize properly
            if (child.grid) {
                var sort = child.grid.get('sort');
                child.grid.sort(sort);
            }

        }
    });
});

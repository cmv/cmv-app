define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',

    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-class',

    'put-selector/put'

], function (
    declare,
    _WidgetBase,

    lang,
    on,
    domClass,

    put

) {
    return declare([_WidgetBase], {
        id: null,
        title: 'Title',
        iconClass: 'fa-bars',
        open: false,
        baseClass: null,
        tabsButtonNode: null,
        tabsContainerNode: null,
        buttonNode: null,
        contentNode: null,
        titleNode: null,
        closeBtnNode: null,
        containerNode: null,

        postCreate: function () {
            this.inherited(arguments);

            //create and place dom element for the tab button
            this.buttonNode = put(this.tabsButtonNode, 'li a[role=tab] i.fa.' + this.iconClass + '<<');

            //create and place dom elements for the tab pane
            this.contentNode = put(this.tabsContainerNode, 'div.' + this.baseClass + '-pane');
            this.titleNode = put(this.contentNode, 'div.' + this.baseClass + '-pane-title $', this.title);
            this.containerNode = put(this.contentNode, 'div.sidebar-widget div.sidebar-widget-content');
            if (this.showCloseIcon) {
                this.closeBtnNode = put(this.titleNode, 'i.fa.fa-chevron-left.' + this.baseClass + '-closeIcon');
                // listen for the tab close button click
                on(this.closeBtnNode, 'click', lang.hitch(this, 'tabClickHandler'));
            }

            // listen for the tab button click
            on(this.buttonNode, 'click', lang.hitch(this, 'tabClickHandler'));

        },

        openTab: function (silent) {
            domClass.add(this.buttonNode, 'active');
            domClass.add(this.containerNode, 'active');
            domClass.add(this.contentNode, 'active');
            if (silent) {
                this.open = true;
                return;
            }
            this.set('open', true);
        },

        closeTab: function (silent) {
            domClass.remove(this.buttonNode, 'active');
            domClass.remove(this.containerNode, 'active');
            domClass.remove(this.contentNode, 'active');
            if (silent) {
                this.open = false;
                return;
            }
            this.set('open', false);
        },

        tabClickHandler: function () {
            if (domClass.contains(this.buttonNode, 'active')) {
                this.closeTab();
            } else {
                this.openTab();
            }
        }
    });
});
define([
    'dojo/_base/declare',
    'dijit/Dialog',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-construct',

    'xstyle/css!./FloatingWidgetDialog/css/FloatingWidgetDialog.css'
], function (declare, Dialog, lang, on, domConstruct) {

    return declare([Dialog], {
        declaredClass: 'gis.dijit.FloatingWidget',
        title: 'Floating Widget',
        draggable: true,
        'class': 'floatingWidget',
        postCreate: function () {
            if (this.iconClass) {
                this.iconNode = domConstruct.create('span', {
                    'class': 'titlePaneIcon fa fa-fw ' + this.iconClass
                }, this.titleNode, 'before');
            }
            if (this.html && this.domTarget) {
                var link = domConstruct.place(this.html, this.domTarget);
                this.own(on(link, 'click', lang.hitch(this, 'show')));
            }
            this.inherited(arguments);
        },
        close: function () {
            this.hide();
        },
        focus: function () {}
    });
});
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'gis/dijit/_FloatingWidgetMixin',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/text!./Help/templates/HelpDialog.html',
    'dojo/i18n!./Help/nls/resource',
    'dijit/form/Button',
    'dijit/layout/TabContainer',
    'dijit/layout/ContentPane',
    'xstyle/css!./Help/css/Help.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _FloatingWidgetMixin, lang, aspect, template, i18n) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _FloatingWidgetMixin], {
        widgetsInTemplate: true,
        templateString: template,
        i18n: i18n,
        baseClass: 'helpDijit',
        postCreate: function () {
            this.inherited(arguments);
            if (this.parentWidget.toggleable) {
                this.own(aspect.after(this.parentWidget, 'toggle', lang.hitch(this, function () {
                    this.containerNode.resize();
                })));
            }
        },
        onOpen: function () {
            //  Make sure the content is visible when the dialog
            //  is shown/opened. Something like this may be needed
            //  for all floating windows that don't open on startup?
            if (!this.openOnStartup) {
                this.containerNode.resize();
            }
        },
        close: function () {
            if (this.parentWidget.hide) {
                this.parentWidget.hide();
            }
        }
    });
});
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/_base/lang',
    'esri/dijit/Legend'
], function (
    declare,
    _WidgetBase,
    lang,
    Legend
) {
    return declare([_WidgetBase], {
        startup: function () {
            this.inherited(arguments);

            this.legend = new Legend({
                arrangement: this.arrangement || Legend.ALIGN_LEFT,
                autoUpdate: this.autoUpdate || true,
                id: this.id + '_legend',
                layerInfos: this.layerInfos,
                map: this.map,
                respectCurrentMapScale: this.respectCurrentMapScale || true
            }, this.domNode);
            this.legend.startup();

            this.map.on('update-end', lang.hitch(this, function () {
                this.legend.refresh();
            }));
        }
    });
});

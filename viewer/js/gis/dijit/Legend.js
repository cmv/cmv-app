define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'esri/dijit/Legend'
], function (declare, lang, Legend) {
    return declare([Legend], {
        startup: function () {
            this.inherited(arguments);
            this.map.on('update-end', lang.hitch(this, function () {
                this.refresh();
            }));
        }
    });
});

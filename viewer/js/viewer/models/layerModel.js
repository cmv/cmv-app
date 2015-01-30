define([
    'dojo/_base/declare',
    'dojo/Stateful',
    'dojo/_base/lang'
], function (
    declare, Stateful, lang
) {
    var model = {
        id: null,
        layer: null,
        type: null,
        url: null,
        options: {}
    };

    var LayerModel = declare([Stateful], {
        constructor: function (options) {
            lang.mixin(this, model, options);
        }
    });

    return LayerModel;
});
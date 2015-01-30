define([
    'dojo/_base/declare',
    'dojo/Stateful',
    'dojo/_base/lang'
], function (
    declare, Stateful, lang
) {
    var model = {
        id: null,
        widget: null,
        type: null,
        placeAt: null,
        className: null,
        tabOptions: {},
        options: {}
    };

    var WidgetModel = declare([Stateful], {
        constructor: function (options) {
            lang.mixin(this, model, options);
        }
    });

    return WidgetModel;
});
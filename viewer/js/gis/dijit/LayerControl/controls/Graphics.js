define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    './_Control' // layer control base class
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _Contained,
    _Control
) {

    var GraphicsControl = declare([_WidgetBase, _TemplatedMixin, _Contained, _Control], {
        _layerType: 'vector', // constant
        _esriLayerType: 'graphics', // constant
        _layerTypeInit: function () {
            this._expandRemove();
            // legend or no legend???
        }
    });
    return GraphicsControl;
});
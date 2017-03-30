define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    './_Control', // layer control base class
    './../plugins/legendUtil'
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _Contained,
    _Control
) {

    var WFSControl = declare([_WidgetBase, _TemplatedMixin, _Contained, _Control], {
        _layerType: 'vector', // constant
        _esriLayerType: 'wfs', // constant
        _layerTypeInit: function () {
            this._expandRemove();
        }
    });
    return WFSControl;
});
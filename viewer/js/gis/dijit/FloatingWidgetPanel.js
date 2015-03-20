define([
  'dijit/_TemplatedMixin',
  'dijit/_WidgetBase',

  'dojo/_base/declare',
  'dojo/dom-style',
  'dojo/text!./FloatingWidgetPanel/templates/template.html',

  'xstyle/css!./FloatingWidgetPanel/css/style.css'
  ], function (
    _TemplatedMixin,
    _WidgetBase,

    declare,
    domStyle,
    template

    ) {
    return declare([_WidgetBase, _TemplatedMixin], {

      baseClass: 'FloatingWigetPanel',
      templateString: template,

      open: false,
      toggleable: true,
      toggle: function(show) {
        this.open = show;
        if(show === true) {
          domStyle.set(this.domNode, 'display', 'block');
        }
        else {
          domStyle.set(this.domNode, 'display', 'none');
        }
      }
    }
  );
});

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
      open: false,
      baseClass: 'FloatingWigetPanel',
      toggleable: true,
      templateString: template,
      show: function() {
        this.toggle(true);
      },
      hide: function() {
        this.toggle(false);
      },
      toggle: function(isOpen) {
        this.open = isOpen;
        domStyle.set(this.domNode, 'display', isOpen === true ? 'block' : 'none');
      }
    });
  });

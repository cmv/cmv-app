define([
  'dijit/_TemplatedMixin',
  'dijit/_WidgetBase',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',

  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/html',
  'dojo/_base/lang',
  'dojo/aspect',
  'dojo/dom-class',
  'dojo/on',
  'dojo/text!./CmvMenuWidget/templates/template.html',

  'xstyle/css!./CmvMenuWidget/css/style.css'
],
  function(
  _TemplatedMixin,
  _WidgetBase,
  _WidgetsInTemplateMixin,
  registry,

  array,
  declare,
  html,
  lang,
  aspect,
  domClass,
  on,
  template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

      widgetsInTemplate: true,
      templateString: template,
      baseClass: 'CmvMenu',
      //the default height of the icon
      iconHeight: 16,
      //the default height of the widget
      height: 20,
      widgets: {},

      startup: function() {
        this.inherited(arguments);

        // do not empty the container node because their may be other widgets in there
        //html.empty(this.containerNode);

        var openMenuItem = null;
        array.forEach(this.widgets, function(aWidgetConfig) {
          var node = this._createMenuItem(aWidgetConfig);
          if (aWidgetConfig.open === true) {
            openMenuItem = node;
          }
        }, this);
        // Since  the dependant widgets are probably not loaded, this call will likely fail. Need a topic for 'widgetLoaded'.
        /*
        if (openMenuItem) {
          this._onMenuClick(openMenuItem);
        }
        */
      },

      _createMenuItem: function(aWidgetConfig) {

        var menuItemNode = html.create('div', {
          'class': 'menu-item'
        }, this.containerNode);

        if(aWidgetConfig.icon) {
          html.create('div', {
            title: aWidgetConfig.title,
            'class': 'menu-item-icon',
            'style': {
              'line-height': this.height + 'px',
              width: this.iconHeight + 'px',
              height: this.iconHeight + 'px',
              'background-image': 'url(' + aWidgetConfig.icon + ')',
              'background-repeat': 'no-repeat',
              'background-size': this.iconHeight + 'px ' + this.iconHeight + 'px',
              'margin-top': ((this.height - this.iconHeight) / 2) + 'px'
            }
          }, menuItemNode);
        }
        html.create('div', {
          'class': 'menu-item-text',
          'style': {
            'line-height': this.height + 'px'
          },
          innerHTML: aWidgetConfig.title
        }, menuItemNode);

        aWidgetConfig.menuItem = menuItemNode;

        on(menuItemNode, 'click', lang.hitch(this, '_onMenuClick', aWidgetConfig));

      },

      _onMenuClick: function(aWidgetConfig) {
        var isOpen = this._isWidgetOpen(aWidgetConfig);
        if(isOpen != null)  {
          if(isOpen === true) {
            this._closeWidget(aWidgetConfig);
          }
          else {
            this._closeWidgetsInSameGroup(aWidgetConfig);
            // open this widget
            this._openWidget(aWidgetConfig);
          }
        }
      },

      _closeWidgetsInSameGroup: function(aWidgetConfig) {
        // close other widgets that are in the same group
        array.forEach(this.widgets, function(aWidgetConfigToClose) {
          if(this._widgetsAreInSameGroup(aWidgetConfig, aWidgetConfigToClose))
          {
            this._closeWidget(aWidgetConfigToClose);
          }
        }, this);
      },

      _widgetsAreInSameGroup: function(aWidgetConfig, bWidgetConfig) {
        if(aWidgetConfig.id !== bWidgetConfig.id && aWidgetConfig.group && bWidgetConfig.group &&  aWidgetConfig.group == bWidgetConfig.group)
        {
          return true;
        }
        else {
          return false;
        }
      },

      _findAndStoreParentWidget: function(aWidgetConfig) {
        // so we do not do a dom query every time, cache the widget in the config object
        if(aWidgetConfig.widget == null ||  aWidgetConfig.widget.parentWidget == null)
        {
          var widget = registry.byId(aWidgetConfig.id + '_widget');
          if(widget && widget.parentWidget)
          {
            aWidgetConfig.widget = widget;
          }
        }
        if(aWidgetConfig.widget && aWidgetConfig.widget.parentWidget) {
          return true;
        }
        else {
          return false;
        }
      },

      _isWidgetOpen: function(aWidgetConfig) {
        if(this._findAndStoreParentWidget(aWidgetConfig) === true) {
          return aWidgetConfig.widget.parentWidget.open;
        }
        else {
          return null;
        }
      },

      _openWidget: function(aWidgetConfig) {
        // toggle will also capture if the user toggles the widget using the x-button or some unknown means
        aspect.after(aWidgetConfig.widget.parentWidget, 'toggle', lang.hitch(this, '_toggleMenuItem', aWidgetConfig.menuItem), true);
        if(this._findAndStoreParentWidget(aWidgetConfig) === true) {
          aWidgetConfig.widget.parentWidget.show();
        }
      },

      _closeWidget: function(aWidgetConfig) {
        if(this._findAndStoreParentWidget(aWidgetConfig) === true) {
          aWidgetConfig.widget.parentWidget.hide();
        }
      },

      _toggleMenuItem: function(aMenuItem, isOpen) {
        if(isOpen) {
          domClass.add(aMenuItem, 'open');
        }
        else {
          domClass.remove(aMenuItem, 'open');
        }
      }

    });
});
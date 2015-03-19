define([
  'dijit/_TemplatedMixin',
  'dijit/_WidgetBase',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',
  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/html',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/on',
  'dojo/query',
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
  domClass,
  on,
  query,
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

      postCreate: function() {
        this.inherited(arguments);

        if (this.position && this.position.height) {
          this.height = this.position.height;
        }

      },

      startup: function() {
        this.inherited(arguments);
        this._createMenuItems();
      },

      _createMenuItems: function() {
        html.empty(this.containerNode);

        var openMenuItem = null;
        array.forEach(this.widgets, function(aWidgetConfig) {
          var node = this._createMenuItem(aWidgetConfig);
          if (aWidgetConfig.open === true) {
            openMenuItem = node;
          }
        }, this);
        // note that all this widgets might not be loaded yet so this may fail
        /*
        if (openMenuItem) {
          this._onMenuClick(openMenuItem);
        }
        */
      },

      _createMenuItem: function(aWidgetConfig) {

        var menuItemNode = html.create('div', {
          'class': 'menu-item',
          'data-cmvmenu-id': aWidgetConfig.id
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

        on(menuItemNode, 'click', lang.hitch(this, function () {
          this._onMenuClick(aWidgetConfig);
        }));

        //menuItemNode.config = aWidgetConfig;

        return menuItemNode;
      },

      _onMenuClick: function(aWidgetConfig) {
        var parentWidget = registry.byId(aWidgetConfig.id + '_parent');
        if(parentWidget) {
          if(parentWidget.open) {
            this._closeMenuItem(aWidgetConfig.id);
            this._closeWidget(aWidgetConfig.id);
          }
          else {
            // close others 
            array.forEach(this.widgets, function(aWidgetConfigToClose) {
              if(aWidgetConfigToClose.id !== aWidgetConfig.id && aWidgetConfig.group && aWidgetConfigToClose.group == aWidgetConfig.group)
              //if(aWidgetConfigToClose.id != aWidgetConfig.id)
              {
                this._closeMenuItem(aWidgetConfigToClose.id);
                this._closeWidget(aWidgetConfigToClose.id);
              }
            }, this);
            // open this one
            this._openMenuItem(aWidgetConfig.id); 
            this._openWidget(aWidgetConfig.id);
          }
        }
      },

      _openWidget: function(id) {
        var widget = registry.byId(id + '_widget');
        if(widget) {
          var parentWidget = widget.parentWidget;
          if(parentWidget) {

            on(parentWidget, 'toggle', lang.hitch(this, '_toggleMenuItem', id));

            parentWidget.show();
          }
        }
      },
      _closeWidget: function(id) {
        var widget = registry.byId(id + '_widget');
        if(widget) {
          var parentWidget = widget.parentWidget;
          if(parentWidget) {
            parentWidget.hide();
          }
        }
      },

      _getMenuItemById: function(id) {
        var node = query('.menu-item[data-cmvmenu-id="' + id + '"]', this.domNode);
        if (node.length === 0) {
          return;
        }
        return node[0];
      },

      _toggleMenuItem: function(id, isOpen) {
        if(isOpen) {
          this._closeMenuItem(id);
        }
        else {
          this._openMenuItem(id);
        }
        /*
        var node = this._getMenuItemById(id);
        if(parentWidget.open) {
          this._closeMenuItem(node);
        }
        else {
          this._openMenuItem(node);
        }
        */
      },
      _openMenuItem: function(id) {
        var node = this._getMenuItemById(id);
        domClass.add(node, 'open');
      },
      _closeMenuItem: function(id) {
        var node = this._getMenuItemById(id);
        domClass.remove(node, 'open');
      }

    });
});
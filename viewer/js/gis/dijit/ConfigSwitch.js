define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',

    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-style',
    'dojo/_base/array',
    'dojo/_base/kernel',
    'dojo/io-query',

    'dijit/form/DropDownButton',
    'dijit/DropDownMenu',
    'dijit/MenuItem',

    'viewer/_ConfigMixin',

    'dojo/text!./ConfigSwitch/templates/ConfigSwitch.html',

    'xstyle/css!./ConfigSwitch/css/ConfigSwitch.css'
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,

    lang,
    on,
    domStyle,
    array,
    kernel,
    ioQuery,

    DropDownButton,
    DropDownMenu,
    MenuItem,

    _ConfigMixin,

    template
) {

    var defaultConfigSrc = _ConfigMixin().defaultConfig;
    var defaultConfig = {
        src: defaultConfigSrc,
        label: 'Default'
    };

    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        baseClass: 'cmvConfigSwitchDijit',

        currentConfig: defaultConfig,

        configs: [defaultConfig],

        postCreate: function () {
            this.inherited(arguments);

            if (this.parentWidget) {
                if (this.parentWidget.toggleable) {
                    domStyle.set(this.configSwitchLabelContainer, 'display', 'block');
                }
            }

            var menu = new DropDownMenu({
                baseClass: 'configSwitchMenu'
            });

            var uri = window.location.href, qsObj = {};
            if (uri.indexOf('?') > -1) {
                var qs = uri.substring(uri.indexOf('?') + 1, uri.length);
                qsObj = ioQuery.queryToObject(qs);
            }

            var currentConfigSrc = qsObj.config || defaultConfigSrc;

            array.forEach(this.configs, lang.hitch(this, function (config) {
                if (currentConfigSrc === config.src) {
                    this.currentConfig = config;
                }

                var menuItem = new MenuItem({
                    id: config.src,
                    label: config.label,
                    onClick: lang.hitch(this, 'switchConfig', config)
                });
                menu.addChild(menuItem);
            }));
            menu.startup();

            var button = new DropDownButton({
                label: this.currentConfig.label,
                dropDown: menu
            });

            this.configSwitchDropDownContainer.appendChild(button.domNode);
        },

        switchConfig: function (newConfig) {
            if (newConfig !== this.currentConfig) {
                var uri = window.location.href, qsObj = {};
                if (uri.indexOf('?') > -1) {
                    var qs = uri.substring(uri.indexOf('?') + 1, uri.length);
                    qsObj = ioQuery.queryToObject(qs);
                }

                // set the new locale
                qsObj.config = newConfig.src;

                // reload the page
                window.location = window.location.pathname + '?' + ioQuery.objectToQuery(qsObj);

            }
        }
    });
});

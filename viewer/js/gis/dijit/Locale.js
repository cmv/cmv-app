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

    './Locale/countries',

    'dojo/text!./Locale/templates/Locale.html',
    'dojo/i18n!./Locale/nls/resource',

    'xstyle/css!flag-icon-css/css/flag-icon.min.css',
    'xstyle/css!./Locale/css/Locale.css'
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

    countries,

    template,
    i18n
) {

    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        i18n: i18n,
        baseClass: 'cmvLocaleDijit',

        currentLocale: null,

        includeFlag: true,
        includeCountry: true,
        includeLanguage: true,

        languages: {
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'pt': 'Português'
        },

        locales: [
            'es-ar',
            'es-bo',
            'pt-br',
            'en-ca',
            'fr-ca',
            'es-cl',
            'es-co',
            'es-cr',
            'es-do',
            'es-ec',
            'es-sv',
            'fr-FR',
            'es-gt',
            'fr-ht',
            'es-hn',
            'en-in',
            'es-mx',
            'es-pa',
            'es-pe',
            'es-pr',
            'pt-pt',
            'es-py',
            'es-es',
            'en-gb',
            'en-us',
            'es-us',
            'es-uy',
            'es-ve'
        ],

        postCreate: function () {
            this.inherited(arguments);

            this.currentLocale = kernel.locale;

            if (this.parentWidget) {
                if (this.parentWidget.toggleable) {
                    domStyle.set(this.localeLabelContainer, 'display', 'block');
                }
            }

            var menu = new DropDownMenu({
                baseClass: 'localeMenu'
            });

            array.forEach(this.locales, lang.hitch(this, function (locale) {
                var vals = locale.split('-');

                // only include supported languages
                var language = this.languages[vals[0]];
                if (language) {
                    var label = '', country = null, icon = null;
                    if (vals[1]) {
                        if (this.includeFlag) {
                            icon = 'flag-icon flag-icon-' + vals[1].toLowerCase();
                        }
                        country = countries[vals[1].toUpperCase()];
                        if (country && this.includeCountry) {
                            label = country;
                        }
                    }
                    if (this.includeLanguage) {
                        if (label.length > 0) {
                            label += ' - ';
                        }
                        label += language;
                    }
                    var menuItem = new MenuItem({
                        id: locale,
                        label: label,
                        iconClass: icon,
                        onClick: lang.hitch(this, 'switchLocale', locale)
                    });
                    menu.addChild(menuItem);
                }
            }));
            menu.startup();

            var vals = this.currentLocale.split('-');
            var language = this.languages[vals[0]];
            var label = '', country = null;
            if (vals[1]) {
                if (this.includeFlag) {
                    label = '<div class="flag-icon flag-icon-' + vals[1].toLowerCase() + '"></div>';
                }
                country = countries[vals[1].toUpperCase()];
                if (country && this.includeCountry) {
                    label += country;
                }
                if (this.includeLanguage) {
                    if (country && this.includeCountry) {
                        label += ' - ';
                    }
                    label += language;
                }
            }

            var button = new DropDownButton({
                label: label,
                dropDown: menu
            });

            this.localeDropDownContainer.appendChild(button.domNode);
        },

        switchLocale: function (newLocale) {
            if (newLocale !== this.currentLocale) {
                var uri = window.location.href, qsObj = {};
                if (uri.indexOf('?') > -1) {
                    var qs = uri.substring(uri.indexOf('?') + 1, uri.length);
                    qsObj = ioQuery.queryToObject(qs);
                }

                // set the new locale
                qsObj.locale = newLocale;

                // reload the page
                window.location = window.location.pathname + '?' + ioQuery.objectToQuery(qsObj);

            }
        }
    });
});

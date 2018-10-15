define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'esri/tasks/PrintTask',
    'dojo/store/Memory',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/query',
    'dojo/date/locale',
    'dojo/text!./Print/templates/Print.html',
    'dojo/text!./Print/templates/PrintResult.html',
    'esri/tasks/PrintTemplate',
    'esri/tasks/PrintParameters',
    'esri/request',
    'esri/urlUtils',
    'dojo/i18n!./Print/nls/resource',

    'dijit/form/ValidationTextBox',

    'dijit/form/Form',
    'dijit/form/FilteringSelect',
    'dijit/form/NumberTextBox',
    'dijit/form/Button',
    'dijit/form/CheckBox',
    'dijit/ProgressBar',
    'dijit/form/DropDownButton',
    'dijit/TooltipDialog',
    'dijit/form/RadioButton',
    'xstyle/css!./Print/css/Print.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, PrintTask, Memory, lang, array, topic, Style, domConstruct, domClass, query, locale, printTemplate, printResultTemplate, PrintTemplate, PrintParameters, esriRequest, urlUtils, i18n, ValidationTextBox) {

    // Print result dijit
    var PrintResultDijit = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: printResultTemplate,
        i18n: i18n,
        url: null,
        fileHandle: null,
        resultOrder: 'last', // first or last

        postCreate: function () {
            this.inherited(arguments);
            this.fileHandle.then(lang.hitch(this, '_onPrintComplete'), lang.hitch(this, '_onPrintError'));
        },
        _onPrintComplete: function (data) {
            if (data.url) {
                var proxyRule = urlUtils.getProxyRule(data.url);
                if (proxyRule && proxyRule.proxyUrl) {
                    this.url = proxyRule.proxyUrl + '?' + data.url;
                } else {
                    this.url = data.url;
                }
                this.nameNode.innerHTML = '<span class="bold">' + this.docName + '</span>';
                domClass.add(this.resultNode, 'printResultHover');
            } else {
                this._onPrintError(this.i18n.printResults.errorMessage);
            }
        },
        _onPrintError: function (err) {
            topic.publish('viewer/handleError', {
                source: 'Print',
                error: err
            });
            this.nameNode.innerHTML = '<span class="bold">' + i18n.printResults.errorMessage + '</span>';
            domClass.add(this.resultNode, 'printResultError');
        },
        _openPrint: function () {
            if (this.url !== null) {
                window.open(this.url);
            }
        },
        _handleStatusUpdate: function (event) {
            var jobStatus = event.jobInfo.jobStatus;
            if (jobStatus === 'esriJobFailed') {
                this._onPrintError(this.i18n.printResults.errorMessage);
            }
        }
    });

    // Main print dijit
    var PrintDijit = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: printTemplate,
        i18n: i18n,
        map: null,
        count: 1,
        results: [],
        authorText: null,
        copyrightText: null,
        defaultTitle: null,
        defaultFormat: null,
        defaultLayout: null,
        baseClass: 'gis_PrintDijit',
        pdfIcon: require.toUrl('gis/dijit/Print/images/pdf.png'),
        imageIcon: require.toUrl('gis/dijit/Print/images/image.png'),
        printTaskURL: null,
        printTask: null,
        customTextElementIds: [],

        postCreate: function () {
            this.inherited(arguments);
            this.printparams = new PrintParameters();
            this.printparams.map = this.map;
            this.printparams.outSpatialReference = this.map.spatialReference;

            this._addCustomfields();

            esriRequest({
                url: this.printTaskURL,
                content: {
                    f: 'json'
                },
                handleAs: 'json',
                callbackParamName: 'callback',
                load: lang.hitch(this, '_handlePrintInfo'),
                error: lang.hitch(this, '_handleError')
            });
        },

        _handleError: function (err) {
            topic.publish('viewer/handleError', {
                source: 'Print',
                error: err
            });
        },

        _handlePrintInfo: function (data) {
            this.printTask = new PrintTask(this.printTaskURL, {
                async: data.executionType === 'esriExecutionTypeAsynchronous'
            });

            if (!this._setLayoutDijit(data)) {
                return;
            }
            this._setFormatDijit(data);

        },

        _setLayoutDijit: function (data) {
            var layoutTemplate = array.filter(data.parameters, function (param) {
                return param.name === 'Layout_Template';
            });
            if (layoutTemplate.length === 0) {
                topic.publish('viewer/handleError', {
                    source: 'Print',
                    error: 'Print service parameters name for templates must be \'Layout_Template\''
                });
                return false;
            }
            var layoutItems = array.map(layoutTemplate[0].choiceList, function (item) {
                return {
                    name: item,
                    id: item
                };
            });
            layoutItems.sort(function (a, b) {
                return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
            });
            var layout = new Memory({
                data: layoutItems
            });
            this.layoutDijit.set('store', layout);
            if (this.defaultLayout) {
                this.layoutDijit.set('value', this.defaultLayout);
            } else {
                this.layoutDijit.set('value', layoutTemplate[0].defaultValue);
            }

            return true;
        },

        _setFormatDijit: function (data) {
            var Format = array.filter(data.parameters, function (param) {
                return param.name === 'Format';
            });
            if (Format.length === 0) {
                topic.publish('viewer/handleError', {
                    source: 'Print',
                    error: 'Print service parameters name for format must be \'Format\''
                });
                return false;
            }
            var formatItems = array.map(Format[0].choiceList, function (item) {
                return {
                    name: item,
                    id: item
                };
            });
            formatItems.sort(function (a, b) {
                return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
            });
            var format = new Memory({
                data: formatItems
            });
            this.formatDijit.set('store', format);
            if (this.defaultFormat) {
                this.formatDijit.set('value', this.defaultFormat);
            } else {
                this.formatDijit.set('value', Format[0].defaultValue);
            }

            return true;
        },

        print: function () {
            if (this.printSettingsFormDijit.isValid()) {
                this.printparams.template = this._getPrintTemplate();

                var form = this.printSettingsFormDijit.get('value'),
                    fileHandle = this.printTask.execute(this.printparams);
                var result = new PrintResultDijit({
                    count: this.count.toString(),
                    icon: (form.format === 'PDF') ? this.pdfIcon : this.imageIcon,
                    docName: form.title,
                    title: form.format + ', ' + form.layout + ', ' + locale.format(new Date(), {
                        formatLength: 'short'
                    }),
                    fileHandle: fileHandle
                }).placeAt(this.printResultsNode, this.resultOrder);

                if (this.printTask.async) {
                    result.own(this.printTask.printGp.on('status-update', lang.hitch(result, '_handleStatusUpdate')));
                }

                Style.set(this.clearActionBarNode, 'display', 'block');
                this.count++;
            } else {
                this.printSettingsFormDijit.validate();
            }
        },

        _getPrintTemplate: function () {
            var form = this.printSettingsFormDijit.get('value'),
                preserve = this.preserveFormDijit.get('value'),
                layoutForm = this.layoutFormDijit.get('value'),
                mapQualityForm = this.mapQualityFormDijit.get('value'),
                mapOnlyForm = this.mapOnlyFormDijit.get('value');

            lang.mixin(form, preserve);
            lang.mixin(mapOnlyForm, mapQualityForm);

            var custElementValues = this._getCustomElementValues(form);

            var template = new PrintTemplate();
            template.format = form.format;
            template.layout = form.layout;
            template.preserveScale = (form.preserveScale.toLowerCase() === 'true');
            template.outScale = form.outScale;
            template.label = form.title;
            template.exportOptions = mapOnlyForm;
            template.layoutOptions = {
                authorText: this.authorText,
                copyrightText: this.copyrightText,
                legendLayers: (layoutForm.legend.length > 0 && layoutForm.legend[0]) ? null : [],
                titleText: form.title,
                scalebarUnit: layoutForm.scalebarUnit,
                customTextElements: custElementValues
            };
            return template;
        },

        _getCustomElementValues: function (form) {
            //collect form values for custom fields if they match customElementIds array
            var formCustomElementsArray = [];
            for (var eachEl in form) {
                if (this.customTextElementIds.indexOf(eachEl) > -1) {
                    var custFieldObj = {};
                    custFieldObj[eachEl] = form[eachEl];
                    formCustomElementsArray.push(custFieldObj);
                }
            }
            return formCustomElementsArray;
        },

        _addCustomfields: function () {
            var printForm = this.printSettingsFormDijit.domNode,
                formTitle = query('table tbody tr:first-child', printForm),
                custElements = [];

            array.forEach(this.customTextElements, function (element) {
                var customLabel = null,
                    newRow = null,
                    inputDiv = null,
                    newInput = null,
                    inputInsertSlot = null;

                if (typeof element === 'object') {
                    for (var item in element) {
                        if (element.hasOwnProperty(item)) {
                            custElements.push(item);
                            customLabel = element[item];

                            //create some new DOM nodes to place the new input widget
                            //probably too much reliance on existing dom, not sure if better way to get custom fields right after the title
                            newRow = domConstruct.toDom('<tr><td>' + customLabel + ':</td><td></td></tr>');
                            domConstruct.place(newRow, formTitle[0], 'after');

                            inputInsertSlot = query('td:nth-child(2)', newRow);
                            inputDiv = domConstruct.toDom('<div></div>');
                            domConstruct.place(inputDiv, inputInsertSlot[0]);

                            newInput = new ValidationTextBox({
                                required: false,
                                style: 'width:100%',
                                name: item
                            }, inputDiv);
                            newInput.startup();
                        }
                    }
                }
            });

            this.customTextElementIds = custElements;
        },

        clearResults: function () {
            domConstruct.empty(this.printResultsNode);
            Style.set(this.clearActionBarNode, 'display', 'none');
            this.count = 1;
        }
    });

    return PrintDijit;
});
define([
    'dojo/i18n!./nls/main',
    'dojo/_base/lang'
], function (i18n, lang) {

    var linkTemplate = '<a href="{url}" target="_blank">{text}</a>';
    function directionsFormatter (noValue, attributes) {
        return lang.replace(linkTemplate, {
            url: 'https://www.google.com/maps/dir/' + attributes.Address + ' Louisville, KY',
            text: 'Get Directions'
        });
    }

    /**
     * A simple number formatter that adds commas to a number
     * @param  {number} num The number to commafy
     * @return {String}     The formatted number
     */
    function commafy (num) {
        var str = num.toString().split('.');
        if (str[0].length >= 5) {
            str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
        }
        if (str[1] && str[1].length >= 5) {
            str[1] = str[1].replace(/(\d{3})/g, '$1 ');
        }
        return str.join('.');
    }


    return {
        map: true,
        mapClickMode: true,
        mapRightClickMenu: true,
        identifyLayerInfos: true,
        identifyTolerance: 5,
        draggable: false,

        // config object definition:
        //  {<layer id>:{
        //      <sub layer number>:{
        //          <pop-up definition, see link below>
        //          }
        //      },
        //  <layer id>:{
        //      <sub layer number>:{
        //          <pop-up definition, see link below>
        //          }
        //      }
        //  }

        // for details on pop-up definition see: https://developers.arcgis.com/javascript/jshelp/intro_popuptemplate.html

        identifies: {
            cities: {
                0: {
                    fieldInfos: [{
                        visible: true,
                        fieldName: 'CITY_NAME',
                        label: 'Name'
                    }, {
                        visible: true,
                        fieldName: 'POP',
                        label: 'Population',
                        formatter: commafy
                    }]
                }
            },
            louisvillePubSafety: {
                2: {
                    title: i18n.identify.louisvillePubSafety.policeStation,
                    fieldInfos: [{
                      // example of adding a 'calculated' or formatted field
                      // click on a louisville kentucky police station to see
                      // the result
                        fieldName: 'Directions',
                        visible: true,
                        formatter: directionsFormatter
                    }, {
                        fieldName: 'Name',
                        visible: true
                    }, {
                        fieldName: 'Address',
                        visible: true
                    }, {
                        fieldName: 'Type',
                        visible: true
                    }, {
                        fieldName: 'Police Function',
                        visible: true
                    }, {
                        fieldName: 'Last Update Date',
                        visible: true
                    }]
                },
                8: {
                    title: i18n.identify.louisvillePubSafety.trafficCamera,
                    description: '{Description} lasted updated: {Last Update Date}',
                    mediaInfos: [{
                        title: '',
                        caption: '',
                        type: 'image',
                        value: {
                            sourceURL: '{Location URL}',
                            linkURL: '{Location URL}'
                        }
                    }]
                }
            }
        }
    };
});

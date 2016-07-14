define([
    'dojo/i18n!./nls/main'
], function (i18n) {

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
            louisvillePubSafety: {
                2: {
                    title: i18n.identify.louisvillePubSafety.policeStation,
                    fieldInfos: [{
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
    }
});
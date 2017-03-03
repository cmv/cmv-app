define([
    'dojo/on',
    'dojo/date/locale',
    'dojo/string',
    'esri/tasks/IdentifyParameters'
], function (on, locale, string, IdentifyParameters) {

    return {
        map: true,
        mapClickMode: true,
        identifyLayerInfos: true,
        identifyTolerance: 5,
        hideShapeLayerSelect: true,

        layers: [
            {
                name: 'Houston General Plans',
                expression: '', // additional where expression applied to all queries
                idProperty: 'objectid',
                identifyParameters: {
                    type: 'spatial', // spatial, relationship, table or database
                    layerID: 'Houston_General_Plans', // from operational layers
                    //layerOption: IdentifyParameters.LAYER_OPTION_ALL,
                    outFields: ['*']
                },
                attributeSearches: [
                    {
                        name: 'Houston General Plans',
                        searchFields: [
                            //{
                            //    name: 'Lead Organization',
                            //    label: 'Lead Organization',
                            //    expression: '(LEAD_ORGANIZATION LIKE \'[value]%\')',
                            //    placeholder: 'e.g. HGAC',
                            //    required: true,
                            //    minChars: 3
                            //}
                        ],

                        title: 'Houston General Plans',
                        topicID: 'Houston_General_Plans',
                        featureOptions: {
                            addLayerNameToFeature: true,
                            convertAttrKeysToLowerCase: true
                        },
                        gridOptions: {
                            columns: [
                                {
                                    field: 'lead_organization',
                                    label: 'Lead Organization'
                                },
                                {
                                    field: 'plan_name',
                                    label: 'Plan Name'
                                },
                                {
                                    field: 'plan_link',
                                    label: 'Plan Link',
                                    formatter: function (value) {
                                        return string.substitute('<a target="_blank" href="${link}">Plan details</a>', {
                                            link: value
                                        });
                                    }
                                }
                            ],
                            sort: [
                                {
                                    attribute: 'plan_name',
                                    descending: 'ASC'
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };
});
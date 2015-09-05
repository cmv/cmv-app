define([
    'dojo/on',
    'dojo/date/locale',
    'esri/tasks/IdentifyParameters'
], function (on, locale, IdentifyParameters) {

    return {
        map: true,
        mapClickMode: true,
        identifyLayerInfos: true,
        identifyTolerance: 5,

        layers: [
            {
                name: 'Houston General Plans',
                expression: '', // additional where expression applied to all queries
                idProperty: 'OBJECTID',
                open: false,
                identifyParameters: {
                    type: 'spatial', // spatial, relationship, table or database
                    layerID: 'Houston_General_Plans', // from operational layers
                    layerOption: IdentifyParameters.LAYER_OPTION_ALL,
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

                        title: 'Houston Government Boundaries',
                        topicID: 'HoustonGovernmentBoundaries',
                        gridOptions: {
                            columns: [
                                {
                                    field: 'Lead_Organization',
                                    label: 'Lead Organization'
                                },
                                {
                                    field: 'Plan_Name',
                                    label: 'Plan Name'
                                },
                                {
                                    field: 'Plan_Link',
                                    label: 'Plan Link'
                                }
                            ],
                            sort: [
                                {
                                    attribute: 'Plan_Name',
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
define([
    'dojo/on',
    'dojo/date/locale'
], function (on, locale) {

    function formatDateTime (value) {
        var date = new Date(value);
        return locale.format(date, {
            formatLength: 'short'
        });
    }

    return {
        map: true,
        mapClickMode: true,
        identifyLayerInfos: true,
        identifyTolerance: 5,

        layers: [
            {
                name: 'Houston Government Boundaries',
                expression: '', // additional where expression applied to all queries
                idProperty: 'OBJECTID',
                open: false,
                identifyParameters: {
                    type: 'spatial', // spatial, relationship, table or database
                    layerID: 'Houston_Government_Boundaries', // from operational layers
                    outFields: ['*']
                },
                attributeSearches: [
                    {
                        name: 'Houston Government Boundaries',
                        searchFields: [
                            {
                                name: 'Lead Organization',
                                label: 'Lead Organization',
                                expression: '(LEAD_ORGANIZATION LIKE \'[value]%\')',
                                placeholder: 'e.g. HGAC',
                                required: true,
                                minChars: 3
                            }
                        ],

                        title: 'Houston Government Boundaries',
                        topicID: 'HoustonGovernmentBoundaries',
                        gridOptions: {
                            columns: [
                                {
                                    field: 'layer_name',
                                    label: 'Layer Name'
                                },
                                {
                                    field: 'OBJECTID',
                                    label: 'Object ID'
                                },
                                {
                                    field: 'Shape',
                                    label: 'Shape'
                                },
                                {
                                    field: 'CODE',
                                    label: 'Code'
                                },
                                {
                                    field: 'NAME',
                                    label: 'Name'
                                },
                                {
                                    field: 'School Name',
                                    label: 'School Name'
                                },
                                {
                                    field: 'School District',
                                    label: 'School District'
                                }
                            ],
                            sort: [
                                {
                                    attribute: 'CODE',
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
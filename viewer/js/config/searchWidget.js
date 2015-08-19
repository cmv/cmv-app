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
                idProperty: 'OBJECTID_1',
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
                                    field: 'PLAN_ID',
                                    label: 'Plan ID'
                                },
                                {
                                    field: 'Plan_Name',
                                    label: 'Plan Name'
                                },
                                {
                                    field: 'LEAD_ORGANIZATION',
                                    label: 'Lead Organization'
                                },
                                {
                                    field: 'PLAN_HOU_GOALS',
                                    label: 'Goals'
                                },
                                {
                                    field: 'PLAN_TIME_FRAME',
                                    label: 'Time Frame'
                                },
                                {
                                    field: 'DATE_ADDED_UPDATED',
                                    label: 'Date Updated'
                                },
                                {
                                    field: 'PROJECT_STATUS',
                                    label: 'Project Status'
                                },
                                {
                                    field: 'PROJECT_SUMMARY',
                                    label: 'Project Summary'
                                },
                                {
                                    field: 'TYPE_OF_PLAN',
                                    label: 'Type of Plan'
                                },
                                {
                                    field: 'Plan_Link',
                                    label: 'Plan Link'
                                }
                            ],
                            sort: [
                                {
                                    attribute: 'PLAN_ID',
                                    descending: 'ASC'
                                }
                            ]
                        }
                    }
                ]
            },
            {
                name: 'All Plans',
                expression: '', // additional where expression applied to all queries
                idProperty: 'OBJECTID',
                open: false,
                identifyParameters: {
                    type: 'spatial', // spatial, relationship, table or database
                    layerID: 'All_Plans', // from operational layers
                    outFields: ['*']
                },
                attributeSearches: [
                    {
                        name: 'Search For Plans',
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

                        title: 'Plan Database',
                        topicID: 'allPlansQuery',
                        gridOptions: {
                            columns: [
                                {
                                    field: 'PLAN_ID',
                                    label: 'Plan ID'
                                },
                                {
                                    field: 'Plan_Name',
                                    label: 'Plan Name'
                                },
                                {
                                    field: 'LEAD_ORGANIZATION',
                                    label: 'Lead Organization'
                                },
                                {
                                    field: 'PLAN_HOU_GOALS',
                                    label: 'Goals'
                                },
                                {
                                    field: 'PLAN_TIME_FRAME',
                                    label: 'Time Frame'
                                },
                                {
                                    field: 'DATE_ADDED_UPDATED',
                                    label: 'Date Updated'
                                },
                                {
                                    field: 'PROJECT_STATUS',
                                    label: 'Project Status'
                                },
                                {
                                    field: 'PROJECT_SUMMARY',
                                    label: 'Project Summary'
                                },
                                {
                                    field: 'TYPE_OF_PLAN',
                                    label: 'Type of Plan'
                                },
                                {
                                    field: 'Plan_Link',
                                    label: 'Plan Link'
                                }                                
                            ],
                            sort: [
                                {
                                    attribute: 'PLAN_ID',
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
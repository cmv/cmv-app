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

        layers: [{
                name: 'allplanstest',
                expression: '', // additional where expression applied to all queries
                idProperty: 'allplanstest',
                queryParameters: {
                    type: 'spatial', // spatial, relationship, table or database
                    layerID: 'allplanstest', // from operational layers
                    sublayerID: 0,
                    outFields: ['*']
                },
                attributeSearches: [
                    {
                        name: 'Search For Plans',
                        searchFields: [
                            {
                                name: 'Lead Organization',
                                label: 'Lead Organization',
                                expression: '(lead_organization LIKE \'[value]%\')',
                                placeholder: 'e.g. HGAC',
                                required: true,
                                minChars: 3
                            }
                        ],

                        title: 'Plan Database',
                        topicID: 'assessmentsQuery',
                        gridOptions: {
                            columns: [                          
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
                                    attribute: 'incidentnm',
                                    descending: 'ASC'
                                }
                            ]
                        }
                    }
                ]
            },
            {
                name: 'Hospitals',
                expression: '', // additional where expression applied to all queries
                idProperty: 'OBJECTID',
                queryParameters: {
                    type: 'table', // spatial, relationship, table or database
                    layerID: 'louisvillePubSafety', // from operational layers
                    sublayerID: 5,
                    outFields: ['*']
                },
                attributeSearches: [
                    {
                        name: 'Search For Hospital',
                        searchFields: [
                            {
                                name: 'Hospital Name',
                                label: 'Name',
                                expression: '(NAME LIKE \'[value]%\')',
                                placeholder: 'Enter the name of the hospital',
                                required: true,
                                minChars: 3
                            },
                            {
                                name: 'Total Admissions',
                                label: 'Total Admissions >=',
                                expression: '(TOTALADM >= [value])',
                                placeholder: 'Total Admissions >='
                            },
                            {
                                name: 'Total Admissions',
                                label: 'Total Admissions <=',
                                expression: '(TOTALADM <= [value])',
                                placeholder: 'Total Admissions <='
                            }
                        ],

                        title: 'Hospitals',
                        topicID: 'hospitalQuery',
                        gridOptions: {
                            columns: [
                                {
                                    id: 'Action',
                                    field: 'OBJECTID',
                                    label: 'Action',
                                    width: 32,
                                    sortable: false,
                                    exportable: false,
                                    renderCell: function (object, value, node) {
                                        on(node, 'click', function () {
                                            alert('Do something exciting here like search for related records or edit the selected record.');
                                        });
                                        node.innerHTML = '<i class=\'fa fa-pencil\' style=\'margin-left:8px;\'></i>';
                                    }
                                },
                                {
                                    field: 'NAME',
                                    label: 'Name',
                                    width: 150
                                },
                                {
                                    field: 'ADDRESS',
                                    label: 'Address',
                                    width: 150
                                },
                                {
                                    field: 'CITY',
                                    label: 'City',
                                    width: 80
                                },
                                {
                                    field: 'STABREV',
                                    label: 'State',
                                    width: 50
                                },
                                {
                                    field: 'ZIPCODE',
                                    label: 'Zip Code',
                                    width: 80
                                },
                                {
                                    field: 'TOTALADM',
                                    label: 'Total Admission',
                                    width: 100
                                },
                                {
                                    field: 'LASTUPDATE',
                                    label: 'Last Update',
                                    width: 100,
                                    get: function (object) { // allow export as a proper date
                                        return new Date(object.LASTUPDATE);
                                    },
                                    formatter: formatDateTime
                                }
                            ],
                            sort: [
                                {
                                    attribute: 'NAME',
                                    descending: 'ASC'
                                }
                            ]
                        }
                    }
                ]
            },
            {
                name: 'Police Stations',
                expression: '', // additional where expression applied to all queries
                queryParameters: {
                    type: 'table', // spatial, relationship, table or database
                    layerID: 'louisvillePubSafety', // from operational layers
                    sublayerID: 2,
                    outFields: ['*']
                },
                idProperty: 'OBJECTID',
                attributeSearches: [
                    {
                        name: 'Search For Police Station By Name',
                        searchFields: [
                            {
                                name: 'Police Station',
                                label: 'Name',
                                expression: '(PDNAME LIKE \'[value]%\')',
                                placeholder: 'Enter the Name of the Police Station',
                                required: true,
                                minChars: 3
                            }
                        ],

                        title: 'Police Stations',
                        topicID: 'policeStationQuery',
                        gridOptions: {
                            columns: [
                                {
                                    field: 'PDNAME',
                                    label: 'Name',
                                    width: 150
                                },
                                {
                                    field: 'ADDRESS',
                                    label: 'Address',
                                    width: 150
                                },
                                {
                                    field: 'PDTYPE',
                                    label: 'Type',
                                    width: 100
                                },
                                {
                                    field: 'FUNCTION',
                                    label: 'Function',
                                    width: 100
                                },
                                {
                                    field: 'LASTUPDATE',
                                    label: 'Last Update',
                                    width: 100,
                                    get: function (object) { // allow export as a proper date
                                        return new Date(object.LASTUPDATE);
                                    },
                                    formatter: formatDateTime
                                }
                            ],
                            sort: [
                                {
                                    attribute: 'PDNAME',
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
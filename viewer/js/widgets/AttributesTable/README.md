#Attributes Table Widget

##AttributesTable Class
Adding Attributes Table to CMV

Add the widget configuration object to the widgets object in viewer.js.
Additional options can be passed with each layer via the controlOptions object. See Attribute Table Options for the many options available.

##Widget Configuration
``` javascript
attributesTable: {
    include: true,
    id: 'attributesContainer',
    type: 'domNode',
    srcNodeRef: 'attributesContainer',
    path: 'widgets/AttributesTable',
    options: {
        map: true,
        mapClickMode: true,

        // use a tab container for multiple tables or
        // show only a single table
        useTabs: false,

        // used to open the sidebar after a query has completed
        sidebarID: 'sidebarBottom',

        // optional tables to load when the widget is first instantiated
        tables: [
            {
                title: 'Census',
                topicID: 'censusQuery',
                queryOptions: {
                    queryParameters: {
                        url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Census_USA/MapServer/4',
                        maxAllowableOffset: 100,
                        where: 'STATE_FIPS = \'06\' OR STATE_FIPS = \'08\''
                    },
                    idProperty: 'ObjectID'
                }
            }
        ]
    }
},
```

##Pane Configuration
Because of the dimensions needed to show an attributes table, placing it in the bottom pane of your app is recommended. Here is the pane configuration to work with the above  widget configuration
``` javascript
bottom: {
    id: 'sidebarBottom',
    placeAt: 'outer',
    splitter: true,
    collapsible: true,
    region: 'bottom',
    style: 'height:200px;',
    content: '<div id="attributesContainer"></div>'
}
```
The `content` property is used to provide a source node reference in the widget configuration when you use type: `type: 'domNode`. You can also use `type: 'titlePane` or `type: contentPane` depending on your needs.

## Screenshot:
![Screenshot](https://tmcgee.github.io/cmv-widgets/images/attributesTables1.jpg)

##Communicating with other widgets
The Attributes Table can be stand-alone if you want to display the results of a query at the start of your application for example. It can also work well with other widgets. The [Search Widget](https://github.com/tmcgee/cmv-widgets#search) is intended to be used as a querying interface for an attributes table. The [Export Widget](https://github.com/tmcgee/cmv-widgets#export) is intended to be used to export the records from an attributes table. Two other widgets are planned that would communicate with an attributes table:

1. Plug-in for layerControl widget
2. Query Builder widget

Communication to/from another widget to an attributes table is via dojo's topic publish/subscribe model. The available topics are listed below.

---
##Widget Options
The attributes table is extremely flexible and so there are many options you can configure. For many of them, you can just use the defaults. Here is a basic configuration example that could be defined in the `config/attributesTable` file or the widget options. Additional options are described below.

``` javascript
define({
    map: true,
    mapClickMode: true,
    useTabs: true,
    sidebarID: 'sidebarBottom'

    /*
        any predefined tables to add to the tab container or possibly just one table
    */
    tables: [
        {
            // title for tab
            title: 'My Query',

            // unique topicID so it doesn't collide with
            // other instances of attributes table
            topicID: 'query',

            // allow tabs to be closed
            // confirm tab closure
            closable: true,
            confirmClose: true,

            queryOptions: {
                // parameters for the query
                queryParameters: {
                    url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Census_USA/MapServer/4',
                    maxAllowableOffset: 100,
                    where: 'STATE_FIPS = \'06\' OR STATE_FIPS = \'08\''
                },
                idProperty: 'ObjectID'
            }
        }
    }
});
```


``` javascript
/*
    Allows for multiple instances of the widget,
    all subscribing to different topics
*/
topicID: 'attributesTable',
```

---
##Growler Options
``` javascript
growl: {
    // should the "loading" growl be displayed?
    loading: true,
    // should the "Results" growl be displayed?
    results: true
},
```


---
##Query Options
``` javascript
queryOptions:
    // parameters for the query
    queryParameters: {
        /*
            What type of query:

            * spatial - search spatial features (FeatureService or layer in MapService)

            * relationship - search records related to spatial features

            * table - search a non-spatial table. This displays records in the grid but not on the map.

            (An additional type `database` will be supported in the future)
        */
        type: 'spatial',

        /*
            Default Spatial Reference
        */
        outputSpatialReference: 4326,

        /*
            AGS REST URL to Query
            default is null
        */
        url: null,

        /*
            If no url provided and the layerID/sublayerID is passed,
            the url of the layer will be retrieved from the map.
        */
        layerID: null,
        sublayerID: null,

        /*
            Attribute fields to include in the FeatureSet.
            default ['*] - returns all fields
        */
        outFields: ['*'],

        /*
            A where clause for the query. default returns all records
        */
        where: '1=1',

        /*
            The geometry to apply to the spatial filter.
        */
        geometry: null,

        spatialRelationship: Query.SPATIAL_REL_INTERSECTS

    },

    /*
        Provide the url if there is a spatial query linked from a table or database query
    */
    linkedQuery: {
        url: null,
        idProperty: null,
        ids: [] // if linkedQuery, then store the linkedIDs for use in linked query
    },

    /*
        Allow a buffer to be performed before a spatial query and then use the buffer geometry in the query
        if showOnly = true, the buffer is displayed  but the query is not run
    */
    bufferParameters: {
        distance: null,
        unit: null,
        showOnly: false
    },

    /*
        default Unique ID
    */
    idProperty: 'FID'

},
```


---
##Grid Options
``` javascript
gridOptions: {

    minWidth: 70,
    /*
        no columns, use fields from Query's returned features
    */
    columns: [],

    /*
        no sort, use sort: 'inherit' to use the order of the query results.
    */
    sort: [],

    /*
        set a column width if one is not explictly defined
        ensures that tables will scroll horizontally
    */
    defaultColumnWidth: 100,

    /*
        Allow the user to hide columns in grid
    */
    columnHide: true,

    /*
        Allow the user to reorder columns in grid
    */
    columnReorder: true,

    /*
        Allow the user to resize columns in grid
    */
    columnResize: true,

    /*
        Use pagination on the results grid
    */
    pagination: true,

    paginationOptions: {
        rowsPerPage: 50,
        previousNextArrows: true,
        firstLastArrows: true,
        pagingLinks: 2,
        pagingTextBox: true,
        showLoadingMessage: true
    }
},
```


---
##Feature Options
``` javascript
featureOptions: {
    /*
        Show the resulting features on the map
    */
    features: true,

    /*
        Allow records to be selected in the grid
    */
    selected: true,

    /*
        Allow the display of an info window when a feature is selected
    */
    infoWindow: true,

    /*
        Allow the user to highlight features that have been selected in the grid
    */
    highlight: true,

    /*
        Show the source feature used in the search
    */
    source: true,

    /*
        Allow the creation and display of a buffer
    */
    buffer: true,

    /*
        Do we zoom to the source features after the query
    */
    zoomToSource: true,

    /*
        Do we zoom to the selected features after the query
    */
    zoomToSelected: true,

    /*
        Allow StreetView when there is a single selected feature
    */
    streetView: true
},
```


---
## Toolbar Options
``` javascript
toolbarOptions: {
    /*
        show the menu toolbar
    */
    show: true,

    zoom: {
        /*
            Allow the user access to 'Zoom' menu
        */
        show: true,

        /*
            Allow the user to zoom to the source features
        */
        source: true,

        /*
            Allow the user to zoom to the selected features
        */
        selected: true,

        /*
            Allow the user to zoom to the buffer
        */
        buffer: true

    },

    clear: {
        /*
            Allow the user access to 'Clear' menu
        */
        show: true,

        /*
            Allow the user to clear the grid
        */
        grid: true,

        /*
            Allow the user to clear the selected features
        */
        selected: true,

        /*
            Allow the user to clear the buffer
        */
        buffer: true
    },

    'export': {
        /*
            Allow the user access to 'Export'
        */
        show: true
    }
},
```


---
##Symbology
You can override the symbology for any graphics that are added to the map.
Each child configuration within the symbols config is described below.
```
symbolOptions: {
    features: {...},
    selected: {...},
    highlighted: {...},
    source: {...},
    buffer: {...}
},
```


###Feature Symbology
Symbology for features that are a result of the query
``` javascript
features: {
    point: {
        type: 'esriSMS',
        style: 'esriSMSCircle',
        size: 15,
        color: [200, 0, 200, 16],
        angle: 0,
        xoffset: 0,
        yoffset: 0,
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [200, 0, 200, 200],
            width: 2
        }
    },
    polyline: {
        type: 'esriSLS',
        style: 'esriSLSSolid',
        color: [200, 0, 200, 192],
        width: 2
    },
    polygon: {
        type: 'esriSFS',
        style: 'esriSFSSolid',
        color: [255, 0, 255, 16],
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [200, 0, 200, 192],
            width: 1
        }
    }
},
```


###Selected Features
The symbology for selected features - those that have been selected on the map or from the grid
``` javascript
selected: {
    point: {
        type: 'esriSMS',
        style: 'esriSMSCircle',
        size: 15,
        color: [0, 255, 255, 16],
        angle: 0,
        xoffset: 0,
        yoffset: 0,
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [0, 255, 255, 255],
            width: 2
        }
    },
    polyline: {
        type: 'esriSLS',
        style: 'esriSLSSolid',
        color: [0, 255, 255, 255],
        width: 2
    },
    polygon: {
        type: 'esriSFS',
        style: 'esriSFSSolid',
        color: [0, 255, 255, 32],
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [0, 255, 255, 255],
            width: 2
        }
    }
},
```


###Highlighted Features
The symbology for a graphic while you are hovering your mouse over a queried feature on the map
``` javascript
highlighted: {
    point: {
        type: 'esriSMS',
        style: 'esriSMSCircle',
        size: 15,
        color: [255, 255, 255, 64],
        angle: 0,
        xoffset: 0,
        yoffset: 0,
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [0, 255, 255, 255],
            width: 2
        }
    },
    polyline: {
        type: 'esriSLS',
        style: 'esriSLSSolid',
        color: [0, 255, 255, 255],
        width: 2
    },
    polygon: {
        type: 'esriSFS',
        style: 'esriSFSSolid',
        color: [0, 255, 255, 64],
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [0, 255, 255, 255],
            width: 2
        }
    }
},
```


###Source Symbols
Symbology for  the point, circle, extent or feature(s) that was used for a spatial query
``` javascript
source: {
    point: {
        type: 'esriSMS',
        style: 'esriSMSCircle',
        size: 3,
        color: [0, 0, 0, 64],
        angle: 0,
        xoffset: 0,
        yoffset: 0,
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [0, 0, 0, 128],
            width: 1
        }
    },
    polyline: {
        type: 'esriSLS',
        style: 'esriSLSSolid',
        color: [0, 0, 0, 128],
        width: 1
    },
    polygon: {
        type: 'esriSFS',
        style: 'esriSFSSolid',
        color: [0, 0, 0, 64],
        outline: {
            type: 'esriSLS',
            style: 'esriSLSSolid',
            color: [0, 0, 0, 128],
            width: 1
        }
    }
},
```


###Buffer Symbology
Symbolology for the buffer if one is used around the source symbol(s)
``` javascript
buffer: {
    type: 'esriSFS',
    style: 'esriSFSSolid',
    color: [255, 0, 0, 32],
    outline: {
        type: 'esriSLS',
        style: 'esriSLSDash',
        color: [255, 0, 0, 255],
        width: 1
    }
},
```


---
##Attributes Table Topics

### Subscribed Topics
The Attribute Table subscribes to the following topics. The topicID should be unique for each instance of the Attribute Table
```javascript
// execute a query
topicID + '/executeQuery'

// populate the grid
topicID + '/populateGrid'

// clear the grid
topicID + '/clearGrid'

// get the results of the query
topicID + '/getQueryResults'

// get the features
topicID + '/getFeatures'

// get the selected features
topicID + '/getSelectedFeatures'

// clear all
topicID + '/clearAll'

// show all graphics
topicID + '/showGraphics'

// hide all graphics
topicID + '/hideGraphics'

// show the feature graphic(s)
topicID + '/showFeatureGraphics'

// hide the feature graphic(s)
topicID + '/hideFeatureGraphics'

// zoom to the feature graphic(s)
topicID + '/zoomToFeatureGraphics'

// clear the feature(s)
topicID + '/clearFeatures'

// show the selected feature(s)
topicID + '/showSelectedGraphics'

// zoom to the selected graphic(s)
topicID + '/zoomToSelectedGraphics'

// hide the selected graphic(s)
topicID + '/hideSelectedGraphics'

// clear the selected feature(s)
topicID + '/clearSelectedFeatures'

// show the source graphic(s)
topicID + '/showSourceGraphics'

// hide the source graphic(s)
topicID + '/hideSourceGraphics'

// zoom to the source graphic(s)
topicID + '/zoomToSourceGraphics'

// clear the source graphic(s)
topicID + '/clearSourceGraphics'

// show the buffer graphic(s)
topicID + '/showBufferGraphics'

// hide the buffer graphic(s)
topicID + '/hideBufferGraphics'

// zoom to the buffer graphic(s)
topicID + '/zoomToBufferGraphics'

// clear the buffer graphic(s)
topicID + '/clearBufferGraphics'

// listens for the mapClickMode changing
'mapClickMode/currentSet'
```

### Published Topics
The Attribute Table publishes the following topics. The topicID should be unique for each instance of the Attribute Table
```javascript
// publishes to Growl widget to provide users with information such as when a query is executing or details about the query results (number of results)
'growler/growl'

// publishes to the central error handler when an unexpected error occurs
'viewer/handleError'

// publishes to the central pane management to open/close the pane containing the Attribute Table
'viewer/togglePane'

// publishes the raw results of the QueryTask
topicID + '/queryResults'

// publishes the selected feature when one is selected on the map or withing the Attribute Table grid
topicID + '/selectFeatures'

```


##Attributes Table Container Topics

### Subscribed Topics
The Attributes Table Container subscribes to the following topics. The topicID should be unique for each instance of the Attribute Table
``` javascript
// add an array of tables to the tab strip
topicID + '/addTables'

// add a new table to the tab strip
topicID + '/addTable'

// remove a table from the tab strip
topicID + '/removeTable'

// add a new tab to the tab strip
topicID + '/addTab'

// remove a tab from the tab strip
topicID + '/removeTab'
```

### Published Topics
The Attributes Table Container publishes the following topics. The topicID should be unique for each instance of the Attribute Table
``` javascript
// published when a table is added. returns the new table class
topicID + '/tableAdded'

// published when a table is removed. returns the id of the table removed.
topicID + '/tableRemoved'
```

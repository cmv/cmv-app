# Advanced Find Widget Overview

The Advanced Find widget gives you additional configuration options not found in the basic Find widget.  The configuration builds on the configuration structure for the basic Find widget and adds additional properties to control the behavior of the widget.  In fact, you can use a configuration from the basic Find widget and it should work without any modifications.

The additional options include

* Configurable columns for each query
* Configurable sort for each query
* Configurable prompt for each query
* Configurable symbology, both the base symbology used to show each find result on the map as well as a different symbology for the selected find result(s)

## Important concepts

When configuring the various options, it's important to remember that the widget is based on the FindTask and all results will be a FindResult object.  A FindResult object will contain a **feature** attribute which is a Graphic object.  This means it will have an **attributes** object with the properties of each result as specified by the layer in the base service.

It is important to recognize that the attribute names in this **attributes** property will be the field aliases specified for each field in the service definition and not the actual field name.

It is also important to understand that different layers in a service can have very different attributes but the grid columns you specify apply to all layers included in the find task.  It is therefore recommended to achieve best results that you either limit the layers included in the find task to layers that have similar attributes *or*, limit the columns you specify to fields shared by all layers.

## Tips

If you can control the service, it may be useful to use common aliases for fields in different layers.  For example:

```
PDNAME -> Name
```

```
FDNAME -> Name
```

```
RESNAME -> Name
```

Use a get function (detailed below) to compute and store a value on each FindResult item in your results.  A get function will be invoked and passed the FindResult object.  You can test for different properties to format the returned string.


## Specifying columns

There are two ways to specify columns.  Each has it's own benefits but follows the rules outlined in the dgrid documentation for specifying grid structures.

Using an the array approach gives more flexibility but the object form is a handy shortcut for simple configurations.

### As an array of objects

Add a 'gridColumns' property to the query object.  The value should be an array of objects with the following properties:

- 'field': this is the field alias of the column to get the value from.
- 'get': this should be a function that accepts a find result item as the only argument and returns a string to display.
- 'label': The column heading
- 'resizable' <true/false>: whether or not the column can be resized
- 'visible' <true/false>: set to false to compute and store a value on each FindResult item without displaying it in a column.  This is useful for sorting.
- 'width': initial width of the column


### As an object

This is a handy shortcut for specifying column defininitons but is much less flexible.  Check the dgrid documentation for details.

Another way to specify a column is to use the get function.  Using this approach, the underlying dgrid instance will call the function you specify as the *get* property of a column object.  This function will receive the FindResult object and should return a string.  Check the Dgrid documentation for more information.

You can specify a visible property for each property.  Setting this to false is a useful way of computing and storing a property which can be specified as a attribute to sort on but will not be shown in the grid:

#### Get Function

The get function can be used to compute and return a string to display in a column.
```
gridColumns: [
    { field: 'SORT_VAL', visible: false, get: function ( item ) {
        return String( '0000' + item.feature.attributes.ASSET_NO ).slice( -4 );
    } }
],
sort: [
    {
        attribute: 'SORT_VAL',
        descending: false
    }
]
```

## Prompt

You can add a **prompt** property to each query object to set the placeholder or prompt text in the search input for the query.

## Selection mode

You can add a **selectionMode** property to control what results users can select in the results grid.  You need to specify any of the dgrid Selection mixin modes.

You can set this both for all queries (specify as a sibling of the **queries** property and optionally override for each query

## Symbology

You can add a **resultsSymbols** property to override the default symbology of each FindResult.  You can also add a **selectedSymbols** property to override the symbology used to depict selected find results in the map.

Each is an object with

* point
* polygon
* polyline

properties.  Each of which must be a fully formed JSON symbol definition appropriate to the geometry type.  Check viewer.js for examples.


## Custom grid event functions

You can add custom handlers for dgrid events by adding a **customGridHandlers** property which should be an array of objects:

```
[
  {
    event: '.dgrid-row:click',
    handler: function ( event ) {}
  }
]
```



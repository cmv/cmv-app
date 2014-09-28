## Layer Control

A layer control widget for CMV. Just don't call it a TOC.

### Features

* Toggle layer visibility
* Layer menu with Zoom To Layer, Transparency and Layer Swipe
* Legends for ArcGIS layers
* Sublayer/folder structure and toggling for ArcGIS dynamic layers
  * can be disabled
  * single layer map services display legend in expand area
* Layer reordering in map and LayerControl widget
* Separate vector and overlay layers (required for layer reordering)
* Support for several layer types:
  * dynamic
  * feature
  * tiled
  * image

### LayerControl Class

#### Adding Layer Control to CMV

1. Copy `layerControl.js` and `LayerControl` folder into `js/gis/dijit/` directory.
2. Add the widget configuration object to the `widgets` object in `viewer.js`.
3. Additional options can be passed with each layer via the `controlOptions` object. See Layer Options for said options.

**Widget Configuration**

``` javascript
layerControl: {
    include: true,
    id: 'layerControl',
    type: 'titlePane',
    path: 'gis/dijit/LayerControl',
    title: 'Layers',
    open: true,
    position: 0,
    options: {
        map: true, //required
        layerControlLayerInfos: true //required
    }
}
```

#### Additional Widget Options

| Option | Type | Description |
| :----: | :--: | ----------- |
| `separated` | Boolean | Separate vector and overlay layer types. Required for `vectorReorder`, `vectorLabel`, `overlayReorder` and `overlayLabel`. Default is `false`. |
| `vectorReorder` | Boolean | Enable reordering of vector layers in map and Layer Control. Default is `false`. |
| `vectorLabel` | Mixed | Label for vector layers. Default is `false`. Pass the label or html for quick easy custom styling of label text. |
| `overlayReorder` | Boolean | Enable reordering of overlay layers in map and Layer Control. Default is `false`. |
| `overlayLabel` | Mixed | Label for overlay layers. Default is `false`. Pass the label or html for quick easy custom styling of label text. |
| `noLegend` | Boolean | When `true` no legend is created for all layers. Can be overridden for specific layer(s) with `noLegend' layer option. |
| `noZoom` | Boolean | When `true` removes "Zoom to Layer" menu item for all layers. Can be overridden for specific layer(s) with `noZoom' layer option. |
| `noTransparency` | Boolean | When `true` removes "Transparency" menu item for all layers. Can be overridden for specific layer(s) with `noTransparency' layer option. |
| `swipe` | Boolean | When `true` adds "Layer Swipe" menu item for all layers.  Can be overridden for specific layer(s) with `swipe` layer option. |
| `swiperButtonStyle` | String | CSS for positioning "Exit Layer Swipe" button in the map. Must include `position:absolute;` and a `z-index`. Default is `position:absolute;top:20px;left:120px;z-index:50;`. |
| `fontAwesome` | Boolean | Load Font Awesome CSS. Because dbootstrap uses FA v3.x it is necessary to load FA v4.x. Default is `true`. This can be set to `false` if FA v4.x is being loaded with a `link` tag in `index.html` or as a font. |
| `fontAwesomeUrl` | String | CDN URL from which to load Font Awesome. Default is FA v4.2.0 from the BootstrapCDN. |

### Layer Options

Additional options can be passed with each layer via the `layerControlLayerInfos` object. All layer types have common options while some options are specific to certain layer types. All `controlOptions` are Boolean.

| Option | Description | Affects |
| :----: | ----------- | ------- |
| `exclude` | When `true` a layer control will not be added to the widget. Using `exclude` for a layer with layer reordering enabled which is not above or below all included layers will result in layer reordering issues. | all layers |
| `noLegend` |  When `true` no legend is created. Set to `false` to override `noLegend: true` widget option. | dynamic, feature and tiled |
| `noZoom` | When `true` removes "Zoom to Layer" menu item. Set to `false` to override `noZoom: true` widget option. | all layers |
| `noTransparency` | When `true` removes "Transparency" menu item. Set to `false` to override `noTransparency: true` widget option. | all layers |
| `swipe` | When `true` adds "Layer Swipe" menu item. Set to `false` to override `swipe: true` widget option. | all layers |
| `swipeScope` | When `true` adds Scope option to Layer Swipe menu. Default is `false`. |
| `expanded` | When `true` expands top level exposing sublayers or legend. | dynamic, feature & tiled |
| `sublayers` | When `true` dynamic folder/sublayer structure is not created. | dynamic |

#### Dynamic Example

``` javascript
{
    type: 'dynamic',
    url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
    title: 'Louisville Public Safety',
    options: {
        //layer options
    },
    layerControlLayerInfos: {
        sublayers: false,
        noTransparency: true
    }
}
```

#### Feature Example

``` javascript
{
    type: 'feature',
    url: 'http://services1.arcgis.com/g2TonOxuRkIqSOFx/arcgis/rest/services/MeetUpHomeTowns/FeatureServer/0',
    title: 'STLJS Meetup Home Towns',
    options: {
        //layer options
    },
    layerControlLayerInfos: {
        noLegend: true,
        noZoom: true
    }
}
```

### Topics

Subscribe to any of the following topics. CMV aims to please, so let us know if you would like a topic published for a particular user action, or layer/layer control state change.

`layerControl/layerToggle` is published when layer visibility changes via the layer checkbox.

```javascript
topic.subscribe('layerControl/layerToggle', function (r) {
    console.log(r.id); //layer id
    console.log(r.visible); //layer visibility (true/false)
});
```

`layerControl/setVisibleLayers` is published when visible layers are set on a dynamic layer.

```javascript
topic.subscribe('layerControl/setVisibleLayers', function (r) {
    console.log(r.id); //layer id
    console.log(r.visibleLayers); //array of set visible layer ids
});
```

#### Layer Control TODO

Do not include this section is docs outside this file.

1. Support all layer types CMV supports (csv, kml, stream, wms)
2. More topics published
3. Method by which to add custom layer menu items
4. ~~Single legend module~~
5. Users' suggestions for improvements
6. ~~Support pre 10.1 (10.2 in the case of image) legends with arcgis.com legend tool~~
7. ~~Add 'scope' layer swipe type~~
8. Optional plugin to set image layer rendering properties (`setBandIds`, `setMosaicRule`, etc)
9. ~~If dynamic `sublayers: false` but legend would otherwise be created build tiled style legend and place in `expandNode`~~

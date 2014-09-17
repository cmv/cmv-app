## Layer Control
A layer control widget for CMV.

### Features
* Toggle layer visibility
* Layer menu with Zoom To Layer, Transparency and Layer Swipe
* Legends for ArcGIS layers
* Sublayer/folder structure and toggling for ArcGIS Dynamic layers
  * can be disabled
  * single layer map services display legend in expand area
* Layer reordering in map and Layer Control
* Separate vector and overlay layers (required for layer reordering)
* Support for several layer types
  * dynamic
  * feature (legend does not support all renderers yet)
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
| `separated` | Boolean | Separate vector and overlay layer types. Required for `vectorReorder`, `vectorLabel`, `overlayReorder` and `overlayLabel`. Default is `true`. |
| `vectorReorder` | Boolean | Enable reordering of vector layers in map and Layer Control. Default is `false`. |
| `vectorLabel` | String | Label for vector layers. Default is `Feature Layers`. Pass html for quick easy custom styling of label text. Pass `false` to disable. |
| `overlayReorder` | Boolean | Enable reordering of overlay layers in map and Layer Control. Default is `false`. |
| `overlayLabel` | String | Label for overlay layers. Default is `Map Overlays`. Pass html for quick easy custom styling of label text. Pass `false` to disable. |
| `swiperButtonStyle` | String | CSS for positioning "Exit Layer Swipe" button in the map. Must include `position:absolute;` and a `z-index`. Default is `position:absolute;top:20px;left:120px;z-index:50;`. |
| `fontAwesome` | Boolean | Load Font Awesome CSS. Because dbootstrap uses FA v3.x it is necessary to load FA v4.x. Default is `true`. This can be set to `false` if FA v4.x is being loaded with a `link` tag in `index.html` or as a font or with xstyle. |
| `fontAwesomeUrl` | String | CDN URL from which to load Font Awesome. Default is FA v4.2.0 from the BootstrapCDN. |

### Layer Options
Additional options can be passed with each layer via the `controlOptions` object. All layer types have common options while some options are specific to certain layer types. All `controlOptions` are Boolean.

| Option | Description | Affects |
| :----: | ----------- | ------- |
| `noZoom` | When `false` removes "Zoom to Layer" menu item. | all layers |
| `noTransparency` | When `false` removes "Transparency" menu item. | all layers |
| `noSwipe` | When `false` removes "Layer Swipe" menu item. | all layers |
| `noLegend` |  When `false` no legend is created. | dynamic and feature |
| `expanded` | When `true` expands top level exposing sublayers or legend. | dynamic and feature |
| `sublayers` | When `false` dynamic folder/sublayer structure is not created. | dynamic |

#### Dynamic Example
``` javascript
{
    type: 'dynamic',
    url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
    title: 'Louisville Public Safety',
    options: {
        //layer options
    },
    controlOptions: {
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
    controlOptions: {
        noLegend: true,
        noZoom: true
    }
}
```

### TODO and such
1. ~~Feature layer legend **!important** (works w/ picture symbols)~~
2. ~~Tiled layer legend~~ (needs tested)
3. Add controls for additional layers (web tiled, wms, csv, etc) - need to add web tiled layer to `Controller.js`
4. ~~Check for `false` value on `vectorLabel` and `overlayLabel` to disable~~
5. ~~Rework legend creation to something maybe a bit more "elegant"~~
6. topic.subscribe to add layers

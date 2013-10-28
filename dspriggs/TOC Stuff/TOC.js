define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/text!./TOC/templates/TOC.html',
	'dijit/tree/dndSource',
	'dojo/dom-construct',
	'./TOC/cbtree/Tree',
	'./TOC/cbtree/extensions/TreeStyling',
	'./TOC/cbtree/model/ForestStoreModel',
	'./TOC/cbtree/store/ObjectStore'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, tocTemplate, dndSource, domConstruct, Tree, TreeStyling, ForestStoreModel, ObjectStore) {

	(function() {
		var css = [
			require.toUrl("gis/dijit/TOC/cbtree/icons/maki.css"),
			require.toUrl("gis/dijit/TOC/cbtree/themes/dbootstrap/dbootstrap.css")
		];
		var head = document.getElementsByTagName("head").item(0),
			link;
		for (var i = 0, il = css.length; i < il; i++) {
			link = document.createElement("link");
			link.type = "text/css";
			link.rel = "stylesheet";
			link.href = css[i].toString();
			head.appendChild(link);
		}
	}());

	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: tocTemplate,
		postCreate: function() {
			this.inherited(arguments);
			console.log(this.layerInfos);
			this.createTOC(this.layerInfos[1]);
			//console.log(this.layerInfos[1].layer);
			//this.layerInfos[1].layer.on('load', this.createTOC);
		},
		_createTree: function(layerInfos) {
			var index = [{
				id: layerInfos.layer.id,
				tocName: layerInfos.title,
				icon: "layers",
				type: "TOC"
			}];

			var store = new ObjectStore({
				data: index
			});
			var model = new ForestStoreModel({
				store: store,
				labelAttr: "tocName",
				checkedAttr: "defaultVisibility",
				query: {
					"type": "TOC"
				}
			});
			// Create the checkbox tree adding DnD support and value to icon mapping.
			var tree = new Tree({
					model: model,
					//dndController: dndSource,
					//betweenThreshold: 5,
					// valueToIconMap: {
					// 	"icon": {
					// 		"*": "* maki"
					// 	}
					// },
					autoExpand: true,
					showRoot: false,
					"style":"overflow:hidden;"
				},
				domConstruct.create("div")).placeAt(this.containerNode);
			tree.startup();
			tree.on("checkBoxClick", this.layerClicked);
			model.on("pasteItem", this.reorderLayers);
			return store;
		},
		createTOC: function(layerInfos) {
			// Layers have been loaded, hide the loading icon add any new layers
			// to the store.
			//dojo.style(dojo.byId("loading"), "display", "none");
			var store = this._createTree(layerInfos);

			if (!layerInfos.hasOwnProperty("dynamicLayerInfos")) {
				var dynLayerInfos = layerInfos.layer.createDynamicLayerInfosFromLayerInfos();
			} else {
				var dynLayerInfos = layerInfos.layer.dynamicLayerInfos
			}
			dynLayerInfos.forEach(function(layerInfo) {
				if (!store.get(layerInfo.id)) {
					layerInfo.tocName = layerInfo.name.split(".").pop();
					layerInfo.icon = layerInfo.tocName.toLowerCase();
					layerInfo.type = "layerInfo";

					store.put(layerInfo, {
						parent: layerInfos.layer.id
					});
				}
			}, this);
		},
		reorderLayers: function(item, insertIndex, before) {
			// Layer was dragged to a new location.

			function getLayers(parent, layers) {
				// Get all the children with type 'layerInfo' for the parent
				var children = store.getChildren(parent);
				layers = layers || [];

				children.forEach(function(child) {
					getLayers(child, layers);
				});
				if (parent.type == "layerInfo") {
					layers.push(parent);
				}
				return layers;
			}

			var layers = getLayers(store.get("layers"));
			if (layers.length) {
				this.map.getLayer("usa").setDynamicLayerInfos(layers);
			}
		},
		layerClicked: function(item, treeNode, event) {
			// A checkbox was clicked, get all layers from the store whose checked
			// state is 'true' and update layer visibility.
			var layers = store.query({
				"type": "layerInfo",
				defaultVisibility: true
			});
			var layerIds = layers.map(function(layer) {
				return layer.id;
			});
			this.map.getLayer("usa").setVisibleLayers(layerIds.length ? layerIds : [-1]);
		}
	});
});
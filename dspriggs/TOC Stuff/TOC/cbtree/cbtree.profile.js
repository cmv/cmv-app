var testResourceRe = /^cbtree\/tests\//;
var excludePath = [ /^cbtree\/((.*)?\/)?tests\//,
									  /^cbtree\/((.*)?\/)?demos\//,
									  /^cbtree\/((.*)?\/)?json\//,
									  /^cbtree\/((.*)?\/)?csv\//
									 ];
var copyOnly = function(filename, mid) {
	var list = {
		"cbtree/cbtree.profile":1,
		"cbtree/package.json":1
	};
	return (mid in list) || 
		(/^cbtree\/themes\//.test(mid) && !/\.css$/.test(filename)) || 
		/(png|jpg|jpeg|gif|tiff)$/.test(filename);
};

// The following profile defines all dojo, dijit and CBTree modules required
// to run all demos included in the CheckBox Tree package.

var profile = {
	releaseDir: "../release",
	releaseName: "cbtree",
	basePath: "..",
	action: "release",
	cssOptimize: "comments",
	optimize: "closure",
	layerOptimize: "closure",
	selectorEngine: "acme",
	mini: true,

	staticHasFeatures: {
		"config-deferredInstrumentation": 0
	},

	packages:[
		{name:"dojo", location: "dojo"},
		{name:"dijit", location: "dijit"},
		{name:"cbtree", location: "cbtree"}	
	],

	layers: {
		"dojo/dojo": {
			include: [
				"dojo/dojo",
				"dojo/data/ItemFileWriteStore",		// Remove with 2.0
				"dojo/dom",
				"dojo/domReady",
				"dojo/dnd/Manager",
				"dojo/fx/Toggler",
				"dojo/i18n",
				"dojo/main",
				"dojo/ready",
				"dojo/store/Memory",
				"dojo/store/Observable"
			],
			customBase: true,
			boot: true
		},

		"dijit/dijit": {
			include: [
				"dijit/dijit",
				"dijit/form/ComboButton",
				"dijit/form/DropDownButton",
				"dijit/form/RadioButton",
				"dijit/tree/dndSource"
			]
		},

		"cbtree/cbtree": {
			include: [
				// Legacy dojo/data store models (remove with dojo 2.0)
				"cbtree/models/FileStoreModel",
				"cbtree/models/ForestStoreModel",
				"cbtree/models/TreeStoreModel",
				"cbtree/models/StoreModel-API",
				"cbtree/data/FileStore",
				// New dojo/store & cbtree/store models
				"cbtree/model/FileStoreModel",
				"cbtree/model/ForestStoreModel",
				"cbtree/model/StoreModel-EXT",
				"cbtree/model/TreeStoreModel",
				// New cbtree/store stores & wrappers
				"cbtree/store/Eventable",
				"cbtree/store/FileStore",
				"cbtree/store/Hierarchy",
				"cbtree/store/Memory",
				"cbtree/store/Natural",
				"cbtree/store/ObjectStore",
				"cbtree/store/extensions/Ancestry",
				"cbtree/store/extensions/CORS",
				// cbtree/store/handlers
				"cbtree/store/handlers/arcGisHandler",
				"cbtree/store/handlers/csvHandler",
				"cbtree/store/handlers/ifrsHandler",
				// cbtree
				"cbtree/CheckBox",
				"cbtree/Tree",
				// extensions
				"cbtree/extensions/TreeStyling",
				// util
				"cbtree/util/QueryEngine",
				"cbtree/util/TOC",
				// misc
				"cbtree/errors/createError"
			]
		}
	},

	resourceTags: {
		test: function(filename, mid){
			var result = testResourceRe.test(mid);
			return testResourceRe.test(mid) || mid=="cbtree/tests" || mid=="cbtree/demos";
		},

		amd: function(filename, mid) {
			return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);
		},

		copyOnly: function(filename, mid) {
			return copyOnly(filename, mid);
		},

		miniExclude: function(filename, mid){
			var result = excludePath.some( function (regex) {
				return regex.test(mid);
			});
			return result;
		}
	}
};

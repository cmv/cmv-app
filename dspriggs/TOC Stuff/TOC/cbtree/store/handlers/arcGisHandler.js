//
// Copyright (c) 2012-2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause								(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License				(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License		(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//

define(["dojo/_base/lang", 
        "../../util/QueryEngine",
        "../../util/shim/Array"
       ], function (lang, QueryEngine) {
	"use strict";
	
	// module:
	//		cbtree/store/handlers/arcGisHandler
	// summary:
	//		This is simple data handler for the popular ArcGIS API for JavaScript
	//    geocoder widget.
	// description:
	//		This handler can be used with the cbtree/store Object Stores or can be
	//		registered directly with dojo/request/handlers.	 The handler converts
	//		a dojo/request response style object, whose data property value is a 
	//		ArcGIS Geocoder results object, into an array of objects ready for
	//		consumption by the cbtree/store Object Stores or dojo/store.
	//
	// example:
	//	| require(["cbtree/store/Hierarchy",
	//	|					 "cbtree/store/handlers/arcGisHandler"
	//	|				 ], function (Hierarchy, arcGisHandler) {
	//	|
	//	|  var geocoder = new esri.dijit.Geocoder({ ... });
	//	|  var symbol   = new esri.symbol.PictureMarkerSymbol({ .. });
	//	|  var template = new esri.InfoTemplate("${name}", "${*}");
	//	|
	//	|  geocoder.on( "findResult", function( response ) {
	//	|	   var store = new Hierarchy(
	//	|									  { data: response,
	//	|										  handleAs:"geocoder",
	//	|										  dataHandler: {
	//	|													handler: arcGisHandler,
	//	|													options: {
	//	|															template: template,
	//	|															symbol: symbol
	//	|													}
	//	|										  }
	//	|									  });
	//	|   });
	//	| });
	//
	//		To register the ArcGIS handler directly with dojo/request/handlers use
	//		the following code sample.
	//
	//	| require(["dojo/request",
	//	|			 		 "dojo/request/handlers",
	//	|					 "cbtree/store/Hierarchy",
	//	|					 "cbtree/store/handlers/arcGisHandler"
	//	|				  ], function (request, handlers, Hierarchy, arcGisHandler) {
	//	|
	//	|  var geocoder = new esri.dijit.Geocoder({ ... });
	//	|  var symbol   = new esri.symbol.PictureMarkerSymbol({ .. });
	//	|  var template = new esri.InfoTemplate("${name}", "${*}");
	//	|
	//	|	 // Register the ArcGIS data handler
	//	|	 var myHandler = new arcGisHandler( {symbol: symbol, template: template} );
	//	|	 handlers.register("geocoder", myHandler.handler);
	//  |
	//	|  geocoder.on( "findResult", function( response ) {
	//	|	   var store = new ObjectStore( {data: response, handleAs:"geocoder" } );
	//	|   });
	//	| });

	function capWords (text) {
		return text.replace(/(^|\W)([a-z])/g, function($0){
			return $0.toUpperCase();
		});
	}

	function getProp ( path, object ) {
		// summary:
		//		Return property value identified by a dot-separated property path
		// path:
		//		Dot separated property path like: feature.attribute.Addr_Type
		// object:
		//		JavaScript object
		var segm = path.split(".");
		var p, i = 0;

		while(object && (p = segm[i++])) {
			object = (p in object ? object[p] : undefined);
		}
		return object;
	}

	function arcGisHandler(/*Object*/ options ) {
		// summary:
		//		Closure for the data handler (e.g this.handler());
		// options:
		// tag:
		//		Public
		var self   = this;

		this._query   = function (d) {return d;};
		this.template = null;			// Info template
		this.symbol   = null;			// Location symbol
		this.type     = "POI";			// Parent address type.
		
		this._querySetter = function (/*Object*/ query, /*queryDirectives?*/ options) {
			// summary:
			//		Create the Geocoder filter function. The filter function is called
			//		prior to the data transformation.
			// query:
			//		The query to use for filter the Geocoder results.
			// options:
			//		The optional arguments to apply to the resultset.
			this._query = QueryEngine(query, options);
		}

		this.handler = function (/*Object*/ response) {
			// summary:
			//		The data handler. The handler is registered with dojo/request/handlers
			//		The response data is converted into an array of JavaScript key:value
			//		pairs objects. On successful completion of a dojo/request this method
			//		is called with the request response.
			// response:
			//		Server style response object
			// tag:
			//		Public
			var esriResp = response ? (response.text || response.data) : null;
			var records  = [];

			if (esriResp) {
				var locations = self._query( esriResp.results );	// Pre-filter results
				var locName   = capWords( esriResp.value );
				var locId     = locName.toLowerCase();
				
				if (locations && locations.length) {
					// Create the parent record for the set of locations.
					var addr_type = getProp("feature.attributes.Addr_Type", locations[0]);
					var features  = {attributes: {Addr_Type: addr_type || self.type}};

					records.push( {id:locId, name:locName, parent: null, type:"parent", features:features} );
					locations.forEach( function(location) {

						var record = lang.clone(location);

						record.feature.attributes.name = location.name;		
						record.feature.setInfoTemplate(self.template);
						record.feature.setSymbol(self.symbol);
						record.parent = locId;
						record.type   = "child";

						records.push( record );
					});
				}
			}
			return records;	// Return record set to the store.
		};

		this.set = function (/*String|Object*/ property, /*any?*/ value) {
			// summary:
			//		 Set a property value
			// property:
			//		Property name or a JavaScript key:value pairs object.
			// value:
			//		The property value.
			// tag:
			//		Public
			if (property) {
				if (typeof property == "object") {
					for (var key in property) {
						this.set(key, property[key]);
					}
				}
				var setter = this["_" + property + "Setter"];
				if (typeof setter == "function") {
					setter.apply(this, Array.prototype.slice.call(arguments, 1));
				} else {
					this[property] = value;
				}
			}
		};

		if (options) {
			this.set(options);
		}
	}
	return arcGisHandler;
});

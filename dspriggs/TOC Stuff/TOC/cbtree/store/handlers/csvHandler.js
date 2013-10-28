//
// Copyright (c) 2012-2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause								(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License			 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License	 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//

define([], function() {
	"use strict";

	// module:
	//		cbtree/store/handlers/csvHandler
	// summary:
	//		Sample CSV data handler.
	// description:
	//		This handler can be used with the cbtree/store Object Stores or can be
	//		registered directly with dojo/request/handlers.	 The handler converts
	//		a dojo/request response type object, whose data property value is a CSV
	//		formatted string, into an array of objects ready for consumption by the
	//		cbtree/store Object Stores or dojo/store.
	//
	//		(See http://datatracker.ietf.org/doc/rfc4180/)
	//
	// example:
	//	| require(["cbtree/store/Memory",
	//	|					"cbtree/store/handlers/csvHandler"
	//	|				 ], function (ObjectStore, csvHandler) {
	//	|
	//	|	 var store = new ObjectStore(
	//	|									{ url: "/some/data/location/myFile.csv",
	//	|										handleAs:"csv",
	//	|										dataHandler: {
	//	|													handler: csvHandler,
	//	|													options: {
	//	|															fieldNames: ["Name", "LastName"],
	//	|															trim: true
	//	|													}
	//	|										}
	//	|									});
	//	| });
	//
	//		To register the CSV handler directly with dojo/request/handlers use the
	//		following code sample.
	//
	//	| require(["dojo/request",
	//	|					"dojo/request/handlers",
	//	|					"dojo/store/Memory",
	//	|					"cbtree/store/Hierarchy",
	//	|					"cbtree/store/handlers/csvHandler"
	//	|				 ], function (request, handlers, Memory, Hierarchy, csvHandler) {
	//	|
	//	|	 var myHandler = new csvHandler( { fieldNames: ["Name", "LastName"],
	//	|																		 trim: true });
	//	|
	//	|	 // Register the CSV data handler
	//	|	 handlers.register("csv", myHandler.handler);
	//	|
	//	|	 var result = request("/some/data/location/myFile.csv", {handleAs:"csv"});
	//	|	 result.then( function (data) {
	//	|		 // Create a dojo/store/Memory store...
	//	|		 var store = new Memory( {data: data} );
	//	|	 });
	//	|
	//	|		// First change the field names
	//	|	 myHandler.set( {fieldNames: ["city", "zipcode", "county", "state"]} );
	//	|	 var ObjStore = new Hierarchy( {url:"/another/location/myCities.csv",
	//	|																	handleAs:"csv"} );
	//	| });
	//
	//		Note: Because the CSV handler was registered before the creation of the
	//					Hierarchy Store we can now simply set the 'handleAs' property to
	//					"csv"

	if (!String.prototype.trim) {
		String.prototype.trim = function () {
			return this.replace(/^\s+|\s+$/g,'');
		};
	}

	if (!String.prototype.occuranceOf) {
		String.prototype.occuranceOf = function (c) {
			return (this.length - this.replace(new RegExp(c,"g"), '').length) / c.length;
		};
	}

	function fieldsToIdentifier(/*String[]*/ values) {
		// summary:
		//		If the field names are extracted from the CSV data convert the fields
		//		to valid JavaScript identifiers.
		// values:
		//		Array of strings
		// tag:
		//		Private
		var i, id;

		for (i=0; i<values.length; i++) {
			if ((id = values[i]) && typeof id == "string") {
				// Camelcase identifier, removing spaces, dashes and underscores
				id = id.trim().replace(/(^[A-Z])|([\s-_]+[A-Z,a-z])/g, function(m, p1, p2, offset){
						return offset ? m.toUpperCase().replace(/[\s-_]*/,'') : m.toLowerCase();
				});
				if (/^\d/.test(id)) {
					values[i] = "$" + id
				}
			} else {
				values[i] = "$column"+i;
			}
		}
		return values;
	}

	function valuesToHash(/*String[]*/ keys, /*any[]*/ values) {
		// summary:
		//		Convert an array of values to a JavaScript key:value pairs object.
		// keys:
		//		Array of strings. Each string represents a property name (key) in
		//		the JavaScript object.
		// values:
		//		Array of values
		// tag:
		//		Private
		var hash = {};
		var i;

		for(i=0; i<keys.length; i++) {
			hash[keys[i]] = values[i];
		}
		return hash;
	}

	function split(/*String*/ str, /*String*/ separator) {
		// summary:
		//		Splits a String object into an array of strings by separating the string
		//		into substrings.	If the separtor is enclosed by double quotes (") it is
		//		ignored.
		// str:
		//		String object
		// separator:
		//		String object
		//returns:
		//		A new array of substrings.
		// tag:
		//		Private
		var tokens = str.split(separator);
		var substr = "", prefix = "";
		var array  = [];
		var i, count = 1;

		for(i=0; i<tokens.length; i++) {
			substr += prefix + tokens[i];
			if (!(substr.occuranceOf('"') % 2)) {
				array.push(substr);
				substr = prefix = "";
				count++;
			} else {
				prefix = separator;
			}
		}
		if (substr.length) {
			var error = new TypeError("Unterminated quoted string at substr: "+count+" {"+tokens[count-1]+"}");
			error.name = "SyntaxError";
			throw error;
		}
		return array;
	}

	function stringToValue(/*String*/ value, /*Boolean*/ trim) {
		// summary:
		//		Convert string value to a native JavaScript type.
		// value:
		//		String value
		// trim:
		//	Indicates if leading and trailing spaces are to be removed.
		// tag:
		//		Private
		var array, args, isQuoted = false;
		var tmpVal = value.trim();
		var newVal = value;

		if (/^".*"$/.test(tmpVal)) {
			newVal = tmpVal.replace(/^"|"$/g,'').replace(/""/g,'"');
			tmpVal = newVal.trim();
			isQuoted = true;
		}

		if (isQuoted) {
			// Array
			if (array = tmpVal.match(/^\[(.*)\]$/)) {
				newVal = [];
				if (args = array[1]) {
					var values = split(args, ",");
					for (var i =0; i<values.length; i++) {
						newVal.push( stringToValue(values[i], trim) );
					}
				}
				return newVal;
			}
		} else {
			// Number
			if (/^[+-]?(((0|[1-9][0-9]*)(\.[0-9]+)?)|\.[0-9]+)([eE][-+]?[0-9]+)?$/.test(tmpVal)) {
				return parseFloat(tmpVal);
			}
			// Boolean
			if (tmpVal == "true" || tmpVal == "false") {
				return (tmpVal == "true");
			}
		}
		return (trim ? tmpVal: newVal);
	}

	function csvHandler(/*Object?*/ options) {
		// summary:
		//		Closure for the data handler (e.g this.handler());
		// options:
		// tag:
		//		Public
		var self = this;

		this.delimiter  = ",";
		this.newline    = "\r\n";
		this.trim       = false;
		this.fieldNames = null;

		this.handler = function (/*Object*/ response) {
			// summary:
			//		The data handler. The handler is registered with dojo/request/handlers
			//		The response data is converted into an array of JavaScript key:value
			//		pairs objects. On successful completion of a dojo/request this method
			//		is called with the request response.
			// response:
			// tag:
			//		Public
			var values = [], data = [];
			var line, tokens, i, j;

			// dojo 1.8 work-around. dojo/request/xhr calls the data handler regardless
			// if a network error occured.
			if (response.status >= 400) {
				return response;
			}

			var csvLines = split( (response.data || response.text), self.newline);
			for(i = 0; i<csvLines.length; i++) {
				if (line = csvLines[i].trim()) {
					tokens = split(line, self.delimiter);
					for (j=0; j<tokens.length; j++) {
						values.push( stringToValue(tokens[j], self.trim) );
					}

					if (!self.fieldNames) {
						self.fieldNames = fieldsToIdentifier( values );
					} else {
						data.push( valuesToHash( self.fieldNames, values ));
					}
					values = [];
				}
			}
			return data;
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
				this[property] = value;
			}
		};

		if (options) {
			this.set(options);
		}
	}
	return csvHandler;
});

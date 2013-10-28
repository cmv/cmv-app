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

define(["module",
				"../errors/createError!../errors/CBTErrors.json",
				"./shim/Array"
			 ], function(module, createError) {
		"use strict";
	// module:
	//		cbtree/util/QueryEngine

	var CBTError = createError( module.id );		// Create the CBTError type.
	
	function contains(/*any[]*/ valueA, /*any|any[]*/ valueB, /*Boolean?*/ ignoreCase) {
		// summary:
		//		Test if an array contains specific value(s) or if array valueA valueB
		//		regular expression(s).
		// valueA:
		//		Array of valueA to search.
		// valueB:
		//		A value or regular expression or an array of the previous types to valueB.
		//		If valueB is an array, all elements in the array must valueB.
		// ignoreCase:
		//		If set to true and the array valueA have a toLowerCase method a case
		//		insensitive valueB is performed.
		// returns:
		//		Boolean true or false
		// tag:
		//		Private
		if (valueB) {
			if (valueB.test) {
				return valueA.some( function (value) {
					return valueB.test(value);
				});
			}
			if (valueB instanceof Array) {
				return valueB.every( function (value) {
					value = (ignoreCase && value.toLowerCase) ? value.toLowerCase() : value;
					return contains(valueA, value, ignoreCase);
				});
			}
			if (ignoreCase) {
				return valueA.some( function (value) {
					value  = (ignoreCase && value.toLowerCase) ? value.toLowerCase() : value;
					return (value == valueB);
				});
			}
			return (valueA.indexOf(valueB) != -1);
		}
		return false;
	}

	function getProp ( path, object ) {
		// summary:
		//		Return property value identified by a dot-separated property path
		// path:
		//		Dot separated property path like: feature.attribute.type
		// object:
		//		JavaScript object
		var segm = path.split(".");
		var p, i = 0;

		while(object && (p = segm[i++])) {
			object = (p in object ? object[p] : undefined);
		}
		return object;
	}

	function hasPropertyPath( query ) {
		// summary:
		//		Returns true is the query object includes dot-separated property name(s)
		//		otherwise false.
		// query:
		//		JavaScript key:value pairs object.
		if (query) {
			for(var key in query) {
				if (/\./.test(key)) {
					return true;
				}
			}
		}
		return false;
	}

	function match(/*any*/ valueA, /*any*/ valueB, /*Boolean?*/ ignoreCase ) {
		// summary:
		//		Test if two values match or, if valueA is an array, if valueA contains
		//		valueB.
		// valueA:
		//		Value or an array of values.
		// valueB:
		//		A value or regular expression or an array for the previous types.
		// ignoreCase:
		//		If true perform case insensitive value matching.
		// returns:
		//		True if there is a match or valueA contains valueB otherwise false.
		// tag:
		//		Private

		if (ignoreCase && valueB && !valueB.test) {
			valueB = valueB.toLowerCase ? valueB.toLowerCase() : valueB;
			valueA = valueA.toLowerCase ? valueA.toLowerCase() : valueA;
		}
		// First, start with a simple base type comparison
		if (valueB == valueA) {
			return true;
		}
		// Second, test for array instance. This must happen BEFORE executing any
		// regular expression because if 'valueB' is a regular expression we must
		// execute the expression on the array elements and not the array itself.
		if (valueA instanceof Array) {
			return contains(valueA, valueB, ignoreCase);
		}
		// Third, check if the object has a test method, which makes it also work
		// with regular expressions (RegExp).
		if (valueB && valueB.test) {
			return valueB.test(valueA);
		}
		// Fourth, check if multiple values are allowed (e.g OR).
		if (valueB instanceof Array) {
			return anyOf(valueA, valueB, ignoreCase);
		}
		return false;
	}

	function anyOf(/*any*/ valueA, /*any[]*/ valueB, /*Boolean*/ ignoreCase ) {
		// summary:
		//		Test if valueA matches any of valueB values.
		// valueA:
		//		Value to match agains all entries in valueB.
		// valueB:
		//		Array of allowed values
		// ignoreCase:
		//		If true perform case insensitive value matching.
		return valueB.some( function (value) {
			return match( valueA, value, ignoreCase );
		});
	}

	var QueryEngine = function (/*Object|Function|String*/ query, /*Store.QueryOptions?*/options) {
		// summary:
		//		Query engine that matches using filter functions, named filter functions
		//		or a key:value pairs objects (hash).
		// query:
		//		- If query is a key:value pairs object, each	key:value pair is matched
		//		with	the corresponding key:value pair of	the store objects unless the
		//		query property value is a function in which case the function is called
		//		as: func(object,key,value).		Query property values can be a string, a
		//		number, a regular expression, an object providing a test() method or an
		//		array of any of the previous types or a function.
		//		- If query is a function, the fuction is called once for every store
		//		object as query(object). The query function must return boolean true
		//		or false.
		//		- If query is a string, the string value is the name of a store method.
		// options:
		//		Optional dojo/store/api/Store.QueryOptions object that contains optional
		//		information such as sort, start or count.	In addition to the standard
		//		QueryOptions properties, this query engine also support the ignoreCase
		//		property.
		// returns:
		//		A function with the property 'matches'. The 'matches' property equates
		//		to the actual query function.
		//
		// example:
		//		Define a store with a reference to this engine, and set up a query method.
		//
		//	| require([ ... ,
		//	|					"./util/QueryEngine",
		//	|					 ...
		//	|				 ], function( ... , QueryEngine, ... ) {
		//	|	 var myStore = function(options) {
		//	|		 //	...more properties here
		//	|		 this.queryEngine = QueryEngine;
		//	|		 //	define our query method
		//	|		 this.query = function(query, options) {
		//	|				return QueryResults(this.queryEngine(query, options)(this.data));
		//	|		 };
		//	|	 };
		//	|	 return myStore;
		//	| });

		var ignoreCase  = options && !!options.ignoreCase;
		var queryFunc   = function () {};
		var hasDotPath  = false;
		
		// create our matching query function
		switch (typeof query) {
			case "undefined":
			case "object":
				// Test query object for dot-separated property names.
				hasDotPath = hasPropertyPath(query);
				queryFunc  = function (object) {
					var key, value, required;
					for(key in query) {
						required = query[key];
						value		 = hasDotPath ? getProp(key,object) : object[key];
						if (!match( value, required, ignoreCase )) {
							if (typeof required == "function") {
								if (required(value, key, object)) {
									continue;
								}
							}
							return false;
						}
					}
					return true;
				};
				break;
			case "string":
				// named query
				if (!this[query] || typeof this[query] != "function") {
					throw new CBTError( "MethodMissing", "QueryEngine", "No filter function " + query + " was found in store");
				}
				queryFunc = this[query];
				break;
			case "function":
				queryFunc = query;
				break;
			default:
				throw new CBTError("InvalidType", "QueryEngine", "Can not query with a " + typeof query);
		} /*end switch() */

		function execute(/*Object[]*/ objects, /*Boolean*/ noFilter) {
			// summary:
			//		Execute the query on	a set of objects and apply pagination	to the
			//		query result.	This function is returned as the result of a call to
			//		function QueryEngine(). The QueryEngine method provides the closure
			//		for this execute() function.
			// objects:
			//		The array of objects on which the query is performed.
			// noFilter:
			//		If true, only sort and pagination is applied to the set of objects.
			// returns:
			//		An array of objects matching the query.
			// tag:
			//		Private
			var objects  = objects || [];  // Make sure we always return something
			var sortSet  = options && options.sort;
			var results  = noFilter ? objects : objects.filter(queryFunc);
			var sortFunc = sortSet;

			if (sortSet) {
				if (typeof sortFunc != "function") {
					sortFunc = function (a, b) {
						var i, sort, prop, valA, valB;

						for(i=0; sort = sortSet[i]; i++) {
							prop = sort.property || sort.attribute;
							valA = getProp(prop,a);
							valB = getProp(prop,b);

							if (sort.ignoreCase) {
								valA = (valA && valA.toLowerCase) ? valA.toLowerCase() : valA;
								valB = (valB && valB.toLowerCase) ? valB.toLowerCase() : valB;
							}
							if (valA != valB) {
								return (!!sort.descending == (valA == null || valA > valB)) ? -1 : 1;
							}
						}
						return 0;
					}
				}
				results.sort( sortFunc );
			}
			// Paginate the query result
			if (options && (options.start || options.count)) {
				var total = results.length;
				results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
				results.total = total;
			}
			return results;
		} /* end execute() */

		execute.matches = queryFunc;
		return execute;

	};	/* end QueryEngine */

	return QueryEngine;
});

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
				"dojo/Deferred",
				"dojo/when",
				"../util/Mutex",
				"../Evented"
			 ], function (lang, Deferred, when, Mutex, Evented) {

	var Eventable = function (/*store*/ store) {
		// summary:
		//		The Eventable store wrapper takes a store and adds advice	like methods
		//		to the store's add, put and remove methods.	As a result, store's add,
		//		put	or remove operations will emit an event the user application can
		//		subscribe to using either store.on() or dojo/on on().
		//		The generated events have at least the following two properties:
		//
		//		type: String
		//			"new" | "delete" | "change"
		//		item:
		//			Store object.
		//
		// store:
		//		Object store implementing the cbtree/store/api/Store API or the native
		//		dojo/store/api/Store API.
		//
		// example:
		//		Create a Memory store that generate events whenever the store content
		//		changes.
		//
		//	|	var store = Eventable( new Memory( {
		//	|		data: [
		//	|			{id: 1, name: "one", prime: false},
		//	|			{id: 2, name: "two", even: true, prime: true},
		//	|			{id: 3, name: "three", prime: true},
		//	|			{id: 4, name: "four", even: true, prime: false},
		//	|			{id: 5, name: "five", prime: true}
		//	|		]
		//	|	}));
		//	|
		//	| function modified( event ) {
		//	|		var id = store.getIdentity( event.item );
		//	|		console.log( "Item: "+id+" was modified.");
		//	|	}
		//	|
		//	|	store.on( "change", modified );

		var orgMethods = {};
		var mutex	= new Mutex();

		// If the original store is already an eventable store just return it.
		if (typeof store.emit == "function") {
			if (store.eventable === true) {
				return store;
			}
		}

		// Create a new store instance, mixin the 'on' and 'emit' methods and mark
		// the object store as being an eventable store. This module is intended to
		// be used with stores that implement the dojo/store/api/Store or extended
		// cbtree/store/api/Store API.

		store = lang.delegate(store, new Evented());
		store.eventable = true;

		function addAdvice(/*String*/ method, /*Function*/ action ) {
			// summary:
			//		Add 'around' advice to a store method. Because of the dojo/advice
			//		calling conventions we can't use it here, this method provides a
			//		different way of wrapping the store methods.
			// method:
			//		Store method the be replaced.
			// action:
			//		Replacement method.
			// tag:
			//		Private
			if (store[method] && typeof store[method] === "function") {
				orgMethods[method] = store[method];
				store[method] = action;
			}
		}

		addAdvice( "add", function (object, options) {
			// TODO: Implement shared mutex (mutex doesn't work with the dojo/store/Memory
			//			 add() method as it calls put())
			var result = orgMethods["add"].apply(store, arguments);
			when( result, function(id) {
				if (id) {
					store.emit("new", {type:"new", detail:{item: object}});
				}
			}, mutex.onError);
			return result;
		});

		addAdvice( "put", function (object, options) {
			var args = arguments;
			return mutex.aquire( function() {
				when( store.get( store.getIdentity(object) ),
					function (storeItem) {
						var orgItem = lang.mixin(null, storeItem);
						var result	= orgMethods["put"].apply(store, args);
						when( result, function(id) {
							mutex.release(id);
							if (storeItem) {
								store.emit("change", {type:"change", detail:{item: object, oldItem: orgItem}});
							} else {
								store.emit("new", {type:"new", detail:{item: object}});
							}
						}, mutex.onError);
					},
					function (err) {
						var result	= orgMethods["put"].apply(store, args);
						when( result, function(id) {
							mutex.release(id);
							store.emit("new", {type:"new", detail:{item: object}});
						}, mutex.onError);
					}
				);
			});
		});

		addAdvice( "remove", function (id, options) {
			var args = arguments;
			return mutex.aquire( function() {
				when( store.get(id), function (storeItem) {
					var orgItem = storeItem ? lang.mixin({},storeItem) : null;
					var result	= orgMethods["remove"].apply(store, args);
					when( result, function(removed) {
						mutex.release(removed);
						if (orgItem) {
							store.emit("delete", {type:"delete", detail:{item: orgItem}});
						}
					});
				}, mutex.onError );
			});
		});

		return store;

	};
	return Eventable;
});

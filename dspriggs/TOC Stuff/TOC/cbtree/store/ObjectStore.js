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
				"dojo/_base/declare",
				"dojo/_base/lang",
				"dojo/store/util/QueryResults",
				"./Hierarchy",
				"../Evented",
				"../errors/createError!../errors/CBTErrors.json"
			 ], function (module, declare, lang, QueryResults, Hierarchy, Evented, createError) {

	// module:
	//		cbtree/store/ObjectStore
	// summary:
	//		This store implements the cbtree/store/api/Store API which is an extension
	//		to the dojo/store/api/Store API.

	var CBTError = createError( module.id );		// Create the CBTError type.
	var undef;
	
	var ObjectStore = declare([Hierarchy, Evented], {
		// summary:
		//		This in-memory store implements the full cbtree/store/api/Store API.
		//		The store combines the functionality of the cbtree/store/Hierarchy
		//		store with the event capabilities of the cbtree/store/Eventable store
		//		wrapper without the extra overhead of having to warp a store. From
		//		a functional stand point the following two examples are the same:
		//
		//			myStore = Eventable( new Hierary( ... ) );
		//			myStore = new ObjectStore( ... );
		//
		//		This store type is the preferred store when multiple models operate
		//		on a single store.

		// eventable: Boolean [read-only]
		//		Indicates this store emits events when the content of the store changes.
		//		This type of store is referred to as an "Eventable" store.
		eventable: true,

		//=========================================================================
		// Public dojo/store/api/store API methods

		add: function (/*Object*/ object,/*PutDirectives?*/ options) {
			// summary:
			//		Creates an object, throws an error if the object already exists
			// object:
			//		The object to store.
			// options:
			//		Additional metadata for storing the data.	Includes an "id"
			//		property if a specific id is to be used.
			// returns:
			//		String or Number
			// tag:
			//		Public
			var id = this.inherited(arguments);
			if (id != undef) {
				this.emit("new", {type:"new", detail:{item: object}});
			}
			return id;
		},

		put: function (/*Object*/ object,/*PutDirectives?*/ options) {
			// summary:
			//		Stores an object
			// object:
			//		The object to store.
			// options:
			//		Additional metadata for storing the data.
			// returns:
			//		String or Number
			// tag:
			//		Public
			var id = this._getObjectId(object, options);
			var at = this._indexId[id];

			var orgObj, exist = false;

			if (at >= 0) {
				if (options && options.overwrite === false) {
					throw new CBTError("ItemExist", "put");
				}
				orgObj = this._data[at];
				exist	= true;
			}
			id = this._writeObject(id, object, at, options);
			if (exist) {
				this.emit("change", {type:"change", detail:{item: object, oldItem: orgObj}});
			} else {
				this.emit("new", {type:"new", detail:{item: object}});
			}
			return id;
		},

		remove: function (/*String|Number*/ id) {
			// summary:
			//		Deletes an object by its identity
			// id:
			//		The identity to use to delete the object
			// returns:
			//		Returns true if an object was removed otherwise false.
			var object = this.get(id);
			if (object) {
				var result = this.inherited(arguments);
				if (result) {
					this.emit("delete", {type:"delete", detail:{item: object}});
				}
				return result;
			}
			return false;
		}

	});	/* end declare() */

	return ObjectStore

});	/*end define() */

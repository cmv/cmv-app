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
define(["dojo/_base/declare",
				"./Memory"
			 ], function (declare, Memory) {

	// module:
	//		cbtree/store/Natural
	// summary:
	//		This store implements the cbtree/store/api/Store API which is an extension
	//		to the dojo/store/api/Store API.

	var Natural = declare([Memory], {
		// summary:
		//		This in-memory store implements the cbtree/store/api/Store API.
		//		The Natural Store provide support for the dojo/store PutDirectives
		//		property 'before'.
		//
		//		 For addional information see cbtree/store/api/Store.PutDirectives

		//=========================================================================
		// Private methods

		_insertBefore: function (/*Object[]*/ dataSet,/*Object*/ object,/*Object?*/ before ) {
			// summary:
			//		Insert an object before a given other object.	This will apply a natural
			//		order to the objects in the store. If the 'before' object does not exist
			//		or is not specified the new object is inserted at the end of the dataset.
			// dataSet:
			//		Array of objects in which the new object is to be inserted.
			// object:
			//		Object to be inserted or relocated.
			// before:
			//		The store object before which the object will be located. After insertion
			//		or relocation	of object, the "before" object will immediately follow the
			//		object in the natural order of the store.
			// tag:
			//		Private
			var beforeAt = dataSet.length;

			if (before) {
				beforeAt = dataSet.indexOf(before);
				if (beforeAt != -1) {
					var objectAt = dataSet.indexOf(object);
					if (objectAt != -1) {
						beforeAt = beforeAt > objectAt ? beforeAt - 1 : beforeAt;
						dataSet.splice(objectAt,1);
					}
				}
			}
			dataSet.splice(beforeAt, 0, object);
			return beforeAt;
		},

		_writeObject: function (id, /*Object*/ object,/*Number*/ index,/*Store.PutDirectives*/ options) {
			// summary:
			//		Store an object.
			// object:
			//		The object to store.
			// index:
			//		Index number of the object in the stores data array. If specified it
			//		indicates an existing object otherwise it's a new store object.
			// options:
			//		Additional metadata for storing the data.
			// returns:
			//		The object ID
			// tag:
			//		Private

			if (options && options.before) {
				var before = this._anyToObject( options.before );
				if (!index || index == -1) {
					// It's a new object.
					this._applyDefaults(id, object);
					this.total++;
				}
				this._insertBefore( this._data, object, before );
				this._indexData();
				return id;
			}
			return this.inherited(arguments);
		},

		toString: function () {
			return "[object NaturalStore]";
		}

	});	/* end declare() */

	return Natural

});

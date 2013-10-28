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
define(["module",               // module.id
				"dojo/_base/declare", 	// declare()
				"dojo/when",						// when()
				"./_base/CheckedStoreModel",
				"./_base/Parents",
				"../errors/createError!../errors/CBTErrors.json"
			 ], function (module, declare, when, CheckedStoreModel, Parents, createError){
	"use strict";

		// module:
		//		cbtree/model/FileStoreModel

	var CBTError = createError( module.id );		// Create the CBTError type.

	var FileStoreModel = declare([CheckedStoreModel], {
		// summary:
		//		Implements cbtree/model/Model API connecting to a cbtree/store/FileStore.
		//		This model can be used with an observable, non-observable or evented File
		//		Store. (See cbtree/store/FileStore)

		constructor: function(/* Object */ kwArgs){
			// summary:
			// tags:
			//		private

			var store = this.store;
			var model = this;

			if (store) {
				if (store.defaultProperties && typeof store.defaultProperties == "object") {
					store.defaultProperties[this.checkedAttr] = this.checkedState;
				}
			}
		},

		// =======================================================================
		// cbtree/model/Model API methods.

		getChildren: function (/*Object*/ parent, /*Function*/ onComplete, /*Function*/ onError) {
			// summary:
			//		Calls onComplete() with array of child items of given parent item,
			//		all loaded. (See cbtree/model/_base/BaseStoreModel.getChildren()
			//		for implementation details).
			// parent:
			//		Object.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argumen: onComplete(children)
			// onError:
			//		Callback function, called in case an error occurred.
			// tags:
			//		public

			this._getChildren( parent, function (parent, id) {
				return this.store.getChildren(parent);
			}, onComplete, onError );
		},

		mayHaveChildren: function(/*Object*/ item){
			// summary:
			//		Tells if an item has or may have children. Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have
			//		children.
			// item:
			//		Object.
			// tags:
			//		public

			return item && !!item.directory;
		},

		// =======================================================================
		// Drag-n-Drop support.

		newItem: function(/*Object*/ args, /*Item*/ parent, /*int?*/ insertIndex, /*Item*/ before){
			// summary:
			// tag:
			//		Private
			throw new CBTError( "InvalidAccess", "newItem", "Operation not allowed on a FileObjectStore");
		},

		pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem) {
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop

			if (newParentItem.directory && (newParentItem.path != oldParentItem.path)) {
				var parentIds	 = new Parents( childItem, this.parentAttr );
				var oldParentId = this.getIdentity(oldParentItem);
				var self				= this;

				var newPath = newParentItem.path + "/" + childItem.name;
				when (this.store.rename(childItem, newPath), function () {
					if (!self.store.evented) {
						self._childrenChanged( [oldParentItem, newParentItem] );
					}
				});
			}
		},

		// =======================================================================
		// Internal event listeners.

		_onDeleteItem: function (/*Object*/ item) {
			// summary:
			//		Handler for delete notifications from the store.
			// item:
			//		The store item that was deleted.
			// tag:
			//		Private
			var id	 = this.getIdentity(item);
			var self = this;

			// Because observable does not provide definitive information if the item
			// was actually deleted or just moved (re-parented) we need to check the
			// store and see if the item still exist.
			when(this.store.get(id, true),
				function(exists) {
					if (!exists) {
						delete self._objectCache[id];
					}
				},
				function(err) {
					delete self._objectCache[id];
				}
			);
			self._deleteCacheEntry(id);
			self.onDelete(item);

			this.getParents(item).then( function (parents) {
				self._childrenChanged( parents );
			});
		},

		toString: function () {
			return "[object FileStoreModel]";
		}

	});

	return FileStoreModel;

});

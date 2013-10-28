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
				"dojo/_base/declare",   // declare()
				"dojo/_base/lang",			// lang.mixin()
				"dojo/Deferred",
				"dojo/when",						// when()
				"./_base/CheckedStoreModel",
				"../errors/createError!../errors/CBTErrors.json"
			 ], function (module, declare, lang, Deferred, when, CheckedStoreModel, createError) {
		// module:
		//		cbtree/model/ForestStoreModel

	var CBTError = createError( module.id );		// Create the CBTError type.

	var ForestStoreModel = declare([CheckedStoreModel], {
		// summary:
		//		Implements the cbtree/model/Model API connecting to a dojo/store or
		//		extended cbtree/store which may have multiple root items, that is,
		//		the root query may return more then one item. All items returned by
		//		the query become children of a fabricated root item.
		//		The model is derived from the CheckedStoreModel class providing the
		//		support for "checked" states.

		//==============================
		// Keyword arguments (kwArgs) to constructor

		// rootId: String
		//		ID of fabricated root item (See also: forest)
		rootId: "$root$",

		// rootLabel: String
		//		Label of the fabricate root item
		rootLabel: "ROOT",

		// End Parameters to constructor
		//==============================

		// =======================================================================
		// Constructor

		constructor: function(/* Object */ kwArgs) {
			// summary:
			//		Passed the arguments listed above (store, etc)
			// tags:
			//		private

			var root  = { id: this.rootId, root: true };
			var store = this.store;
			var model = this;

			// Assemble artificial root item
			root[this.checkedAttr] = this.checkedState;
			root[this.labelAttr]	 = this.rootLabel || this.rootId;

			// Get a query function from the store's Query Engine which we can use to
			// determine if an item is a child of the forest root.
			if (this._methods.queryEngine) {
				this._rootQuery = store.queryEngine( this.query );
			} else {
				throw new CBTError( "MethodMissing", "_createForestRoot", "store has no query engine");
			}
			this._forest = true;
			this.root		= root;
		},

		// =======================================================================

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
				return ((parent == this.root) ? this.store.query(this.query) : this.store.getChildren(parent));
			}, onComplete, onError );
		},

		getParents: function (/*Object*/ storeItem) {
			// summary:
			//		Get the parent(s) of a store item. This model supports both single
			//		and multi parented store objects.	For example: parent:"Homer" or
			//		parent: ["Homer","Marge"]. Multi parented stores must have a query
			//		engine capable of querying properties whose value is an array.
			// storeItem:
			//		The store object whose parent(s) will be returned.
			// returns:
			//		A dojo/promise/Promise	-> Object[]
			// tags:
			//		private

			if (storeItem && storeItem != this.root) {
				var result = this.inherited(arguments);
				var self	 = this;

				return result.then( function (parents) {
					if (self.isChildOf(storeItem, self.root)) {
						parents.push(self.root);
					}
					return parents;
				});
			} else {
				var deferred = new Deferred();
				return deferred.resolve([]);
			}
		},

		mayHaveChildren: function (/*Object*/ item) {
			// summary:
			//		Tells if an item has or may have children. Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have
			//		children.
			// item:
			//		Object.
			// returns:
			//		Boolean
			// tags:
			//		public

			if (item && item == this.root) {
				var itemId = this.getIdentity(item);
				return !!this._childrenCache[itemId];
			}
			return this.inherited(arguments);
		},

		// =======================================================================
		// Inspecting items

		getIdentity: function(/*item*/ item) {
			// summary:
			//		Get the identity of an item.
			return (item == this.root ? this.root.id : this.store.getIdentity(item));
		},

		isChildOf: function (/*Object*/ item, /*Object*/ parent ) {
			// summary:
			//		Test if an item if a child of a given parent.
			// item:
			//		Child object.
			// parent:
			//		The parent object.
			// returns:
			//		Boolean true or false
			// tag:
			//		Public
			if (parent && item) {
				if (parent == this.root) {
					return (this._rootQuery.matches ? this._rootQuery.matches(item)
																					 : !!this._rootQuery([item]).length);

				}
				return this.inherited(arguments);
			}
			return false;
		},

		// =======================================================================
		// Write interface

		_setValue: function (/*Object*/ item, /*String*/ property, /*any*/ value) {
			// summary:
			//		Set the new value of a store item property and fire the 'onChange'
			//		event if the store is not observable, not evented or when the item
			//		is the forest root.
			//item:
			//		Store object
			// property:
			//		Object property name
			// value:
			//		New value to be assigned.
			// tag:
			//		Private

			if (item[property] !== value) {
				if (item == this.root) {
					var orgItem = lang.mixin(null, item);
					item[property] = value;
					this._onChange(item, orgItem);
				} else {
					this.inherited(arguments);
				}
			}
			return value;
	},

		// =======================================================================
		// Internal event listeners.

		_onSetItem: function (/*dojo.store.item*/ storeItem, /*string*/ property, /*AnyType*/ oldValue,
													/*AnyType*/ newValue) {

			// If the property that changed is part of the root query go check if the
			// item attached to or detached from the root.
			if (this.query && property in this.query) {
				var self = this;

				when( this._childrenCache[this.root.id], function (children) {
					var childIndex	 = children ? children.indexOf(storeItem) : -1;
					var isRootChild	= self.isChildOf(storeItem, self.root);
					var wasRootChild = (childIndex > -1);

					// If the children of the tree root changed update the childrens cache
					// BEFORE calling onRootChange(). This will prevents an infinite loop
					// in case any listener changes any of the item's query properties or
					// does a store put() which could result in another call to this
					// _onSetItem() method before _childrenChanged() is called...

					if (isRootChild != wasRootChild) {
						var operation = isRootChild ? "attach" : "detach";
						var children = self._updateChildrenCache( operation, self.root, storeItem );
						when ( children, function() {
							self.onRootChange(storeItem, operation);
							self._childrenChanged(self.root);
						});
					}
				});
			}
			this.inherited(arguments);
		},

		toString: function () {
			return "[object ForestStoreModel]";
		}

	});

	return ForestStoreModel;

});

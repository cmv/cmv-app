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
				"dojo/_base/lang",
				"dojo/when",
				"./_base/BaseStoreModel",
				"./_base/Parents",
				"../errors/createError!../errors/CBTErrors.json"
			 ], function (module, lang, when, BaseStoreModel, Parents, createError) {

	// module:
	//		cbtree/model/StoreModel-EXT
	// summary:
	//		This module extends the cbtree/model/_base/BaseStoreModel API with an
	//		additional set of methods commenly used to query and/or modify store 
	//		objects checked state.

	var CBTError = createError( module.id );		// Create the CBTError type.

	function isObject( object ) {
		// summary:
		//		Returns true if an object is a key:value pairs object.
		return (Object.prototype.toString.call(object) == "[object Object]");
	}

	var ModelExtension = {

		// =======================================================================
		// Private Methods related to checked states

		_checkOrUncheck: function (/*String|Object*/ query, /*Boolean*/ newState, /*Callback*/ onComplete,
																/*thisArg*/ scope) {
			// summary:
			//		Check or uncheck the checked state of all store items that match the
			//		query and have a checked state.
			//		This method is called by either the public methods check() or uncheck()
			//		providing an easy way to programmatically alter the checked state of a
			//		set of store items associated with the tree nodes.
			// query:
			//		A query object or string.	 If query is a string the idProperty attribute
			//		of the store is used as the query attribute and the query string assigned
			//		as the associated value.
			// newState:
			//		New state to be applied to the store items.
			// onComplete:
			//		If an onComplete callback function is provided, the callback function
			//		will be called just once, after the last storeItem has been updated as:
			//		onComplete(matches, updates).
			// scope:
			//		If a scope object is provided, the function onComplete will be invoked
			//		in the context of the scope object. In the body of the callback function,
			//		the value of the "this" keyword will be the scope object. If no scope is
			//		is provided, onComplete will be called in the context of tree.model.
			// tag:
			//		private

			var storeOnly = this.checkedStrict ? true : false,
					matches   = 0,
					updates   = 0;

			this.fetchItemsWithChecked(query, function (storeItems) {
				storeItems.forEach(function (storeItem) {
					if (storeItem[this.checkedAttr] != newState) {
						this.setChecked(storeItem, newState);
						updates += 1;
					}
					matches += 1;
				}, this)
				if (onComplete) {
					onComplete.call((scope ? scope : this), matches, updates);
				}
			}, this, storeOnly);
		},

		// =======================================================================
		// Inspecting and validating items

		fetchItem: function (/*String|Object*/ args, /*Callback?*/ onComplete,/*thisArg?*/ scope) {
			// summary:
			//		Get the store item that matches args. Parameter args is either an
			//		object or a string.
			// args:
			//		An object or string used to query the store. If args is a string its
			//		value is assigned to the store idProperty in the query.
			//	onComplete:
			//		User specified callback method which is called on completion with the
			//		first store item that matched the query argument. Method onComplete()
			//		is called as: onComplete(storeItem) in the context of scope if scope
			//		is specified otherwise in the active context (this).
			//	scope:
			//		If a scope object is provided, the function onComplete will be invoked
			//		in the context of the scope object. In the body of the callback function,
			//		the value of the "this" keyword will be the scope object. If no scope
			//		object is provided, onComplete will be called in the context of tree.model.
			// tag:
			//		public

			var idQuery = this._anyToQuery(args, null);
			var scope   = scope || this;

			if (idQuery && onComplete) {
				when(this.store.query(idQuery), function (queryResult) {
					var items = Array.prototype.slice.call(queryResult);
					onComplete.call(scope, (items.length ? items[0] : undefined));
				});
			}
		},

		fetchItemsWithChecked: function (/*String|Object*/ query, /*Callback?*/ onComplete, /*thisArg?*/ scope,
																			/*Boolean?*/ storeOnly) {
			// summary:
			//		Get the list of store items that match the query and have a checked
			//		state (a checkedAttr property).
			//	query:
			//		A query object or string. If query is a string the identifier attribute
			//		of the store is used as the query attribute and the string assigned as
			//		the associated value.
			//	onComplete:
			//		 User specified callback method which is called on completion with an
			//		array of store items that matched the query argument. Method onComplete
			//		is called as: onComplete(storeItems) in the context of scope if scope
			//		is specified otherwise in the active context (this).
			//	scope:
			//		If a scope object is provided, the function onComplete will be invoked
			//		in the context of the scope object. In the body of the callback function,
			//		the value of the "this" object will be the scope. If no scope object is
			//		provided, onComplete will be called in the context of tree.model.
			// storeOnly:
			//		Indicates if the fetch operation should be limited to the in-memory cache
			//		only. Some stores may fetch data from a back-end server when performing a
			//		deep search. However, when querying attributes, some attributes may only
			//		be available in the in-memory store such is the case with a FileStore
			//		having custom attributes.
			// tag:
			//		public

			var storeQuery = this._anyToQuery( query, null );
			var storeItems = [];
			var cacheOnly  = (storeOnly !== undefined) ? !!storeOnly : true;
			var scope      = scope || this;
			var self       = this;

			if (isObject(storeQuery)) {
				when( this.store.query(storeQuery, {cacheOnly: cacheOnly}), function (items) {
					items.forEach(function (item) {
						if (self.checkedAttr in item) {
							storeItems.push(item);
						} else {
							// If the checked attribute is missing it can be an indication the item
							// has not been rendered yet in any tree. Therefore check if it should
							// have the attribute and, if so, create it and apply the default state.
							if (self.checkedAll) {
								self.setChecked(item, this.checkedState);
								storeItems.push(item);
							}
						}
					});
					if (onComplete) {
						onComplete.call(scope, storeItems);
					}
				}, this.onError);
			} else {
				throw new CBTError( "InvalidObject", "fetchItemsWithChecked", "query must be of type object");
			}
		},

		isRootItem: function (/*AnyType*/ something) {
			// summary:
			//		Returns true if 'something' is a child of the root otherwise false.
			// item:
			//		A valid dojo/store item.
			// tag:
			//		public

			return this.isChildOf( something, this.root );
		},

		// =======================================================================
		// Write interface

		check: function (/*Object|String*/ query, /*Callback*/ onComplete, /*thisArg*/ scope, /*Boolean?*/ storeOnly) {
			// summary:
			//		Check all store items that match the query and have a checked state.
			// description:
			//		See description _checkOrUncheck()
			//	example:
			//		model.check({ name: "John" });
			//	| model.check("John", myCallback, this);
			// tag:
			//		public

			this._checkOrUncheck(query, true, onComplete, scope, storeOnly);
		},

		uncheck: function (/*Object|String*/ query, /*Callback*/ onComplete, /*thisArg*/ scope, /*Boolean?*/ storeOnly) {
			// summary:
			//		Uncheck all store items that match the query and have a checked state.
			// description:
			//		See description _checkOrUncheck()
			//	example:
			//		uncheck({ name: "John" });
			//	| uncheck("John", myCallback, this);
			// tag:
			//		public

			this._checkOrUncheck(query, false, onComplete, scope, storeOnly);
		},

		_changeParents: function (/*Object*/ storeItem, /*Object*/ parent, /*String*/ operation) {
			// summary:
			//		Add a parent to or remove a parent from a store object.
			// storeItem:
			//		A valid (existing) Store object
			// parent:
			//		Parent object.
			// operation:
			//		"attach" | "detach"
			// tag:
			//		Private
			var result, self = this;

			if (storeItem && parent) {
				var parentId = this.getIdentity(parent);
				var itemId   = this.getIdentity(storeItem);
				var isRoot   = (this._forest && this.root.id == itemId);

				if (itemId && parentId && !isRoot) {
					when( this.store.get(itemId), function (item) {
						if (item) {
							var isRootChild = self.isChildOf(item, self.root);
							var parentIds   = new Parents(item, self.parentProperty);
							var forestRoot  = (self._forest && self.root.id == parentId);

							if (forestRoot) {
								if (!parentIds.multiple) {
										item[self.parentProperty] = undefined;
										this.store.put(item);
								}
								if ((!isRootChild && operation == "attach") || (isRootChild && operation == "detach")) {
									var children = self._updateChildrenCache(operation, parent, storeItem );
									when( children, function () {
										self.onRootChange(storeItem, operation);
										self._childrenChanged(self.root);
									});
								}
							} else {
								if (parentIds[operation](parentId)) {
									item[self.parentProperty] = parentIds.toValue();
									itemId = self.store.put(item);
									if (!self._monitored) {
										when( itemId, function () {
											self._childrenChanged(parent);
										});
									}
								}
							}
						} else {
							throw new CBTError( "InvalidObject", "addParent", "Item ["+itemId+"] is not a valid store item");
						}
					});
				}
			}
		},

		addParent: function (/*Object*/ storeItem, /*Object|String*/ parent) {
			// summary:
			//		Add a parent to a store item.
			// storeItem:
			// parent:
			// tag:
			//		Public
			if (typeof parent == "string") {
				var self = this;
				when (this.store.get(parent), function(parent) {
					self._changeParents( storeItem, parent, "attach" );
				});
			} else {
				this._changeParents( storeItem, parent, "attach" );
			}
		},

		removeParent: function (storeItem, parent) {
			// summary:
			//		Remove a parent from a store item.
			// storeItem:
			// parent:
			// tag:
			//		Public
			if (typeof parent == "string") {
				var self = this;
				when (this.store.get(parent), function(parent) {
					self._changeParents( storeItem, parent, "detach" );
				});
			} else {
				this._changeParents( storeItem, parent, "detach" );
			}
		},

		// =======================================================================
		// Misc Private Methods

		_anyToQuery: function (/*String|Object*/ args, /*String?*/ attribute) {
			// summary:
			//		Compose a query object.
			// args:
			//		 Query object, if args is a string it value is assigned to the store
			//		identifier property (idProperty) in the query object.
			// attribute:
			//		Optional attribute name.	If specified, the attribute in args to be
			//		used as its identifier. If an external item is dropped on the tree,
			//		the new item may not have the same identifier property as all store
			//		items do.
			// returns:
			//		A JavaScript key:value pairs object.
			// tag:
			//		private

			var identAttr = this.store.idProperty;

			if (identAttr) {
				var objAttr = attribute || identAttr,
						query   = {};
				if (typeof args == "string") {
					query[identAttr] = args;
					return query;
				}
				if (args && isObject(args)) {
					lang.mixin( query, args );
					if (objAttr in args) {
						query[identAttr] = args[objAttr]
					}
					return query;
				} else {
					query[identAttr] = /.*/;
					return query;
				}
			}
			return null;
		}

	};	/* end ModelExtension {} */

	BaseStoreModel.extend( ModelExtension );
	return true;
	
});	/* end define() */

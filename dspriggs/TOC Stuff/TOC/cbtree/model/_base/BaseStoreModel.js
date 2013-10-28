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

define(["module",								  // module.id
        "dojo/_base/declare",     // declare()
        "dojo/_base/lang",        // lang.hitch()
        "dojo/aspect",            // aspect.before()
        "dojo/Deferred",
        "dojo/promise/all",
        "dojo/promise/Promise",   // instanceof()
        "dojo/Stateful",          // set() & get()
        "dojo/when",              // when()
        "./Parents",
        "./Prologue",             // Store Prologue methods
        "../../Evented",          // on()
        "../../errors/createError!../../errors/CBTErrors.json",
        "../../util/shim/Array"    // ECMA-262 Array shim
       ], function (module, declare, lang, aspect, Deferred, all, Promise, Stateful,
                     when, Parents, Prologue, Evented, createError) {
		// module:
		//		cbtree/model/_base/BaseStoreModel
		// summary:
		//		Implements cbtree/models/model API connecting to any store that exposes
		//		the dojo/store/api/Store API or the extended cbtree/store/api/Store API.
		//		This model supports observable, non-observable and evented stores. Both
		//		synchronous and asynchronous store implementations are supported.
		//
		//		The BaseStoreModel is a base class providing all the functionality
		//		required to create a cbtree or dijit tree model with the following
		//		restrictions:
		//
		//		1 - Each model derived from BaseStoreModel MUST implement their own
		//				getChildren() method.

	var CBTError = createError( module.id );		// Create the CBTError type.
	var undef;

	function returnTrue () {
		// summary:
		//		A placeholder method which returns boolean true. This method may be
		//		called if the store doesn't provide certain capabilities.
		return true;
	}

	// We must include dojo/Stateful here (see dojo ticket #16515)
	var BaseStoreModel = declare([Evented, Stateful], {

		//==============================
		// Keyword arguments (kwArgs) to constructor

		// iconAttr: String
		//		If specified, get the icon from an item using this property name.
		iconAttr: "",

		// labelAttr: String
		//		If specified, get label for tree nodes using this property.
		labelAttr: "name",

		// labelType: [const] String
		//		Specifies how to interpret the labelAttr in the data store items.
		//		Can be "html" or "text".
		labelType: "text",

		// parentProperty: String
		//		The property name of a store object identifying its parent ID(s).
		parentProperty: "parent",

		// query: Object
		//		Specifies the query object used to retrieve children of the tree root.
		//		The query property is a JavaScript key:value pairs type object.
		//		(See also: forest)
		// example:
		//		{type:'continent'}
		query: null,

		// rootLabel: String
		//		Alternative label for the root item
		rootLabel: null,

		// store: cbtree/store
		//		Underlying store. The store MUST implement, at a minimum, the dojo/store
		//		API and preferably the cbtree/store API.	For the best functionality and
		//		performance it is highly recommended to use the cbtree/store/ObjectStore
		store: null,

		// End Parameters to constructor
		//==============================

		// state:
		//		Reflects the current state of the model.
		state: "created",

		// root: [readonly] Object
		//		Pointer to the root item (read only, not a parameter)
		root: null,

		// _forest: Boolean
		//		Indicates if the store data should be handled as a forest or a tree
		//		hierarchy.
		//		If false, the root query must return exactly one store object as the
		//		tree root. If true, a local root item is fabricated which will serve
		//		as the tree root. Please note, the fabricated root does NOT represent
		//		an object in the store.
		_forest: false,

		// _loadRequested: Boolean
		//		Indicate if a store load has been requested.
		_loadRequested: false,

		// =======================================================================
		// Constructor

		constructor: function (/* Object */ kwArgs) {
			// summary:
			//		Passed the arguments listed above (store, etc)
			// kwArgs:
			//		A JavaScript key:value pairs object. The object properties or keys
			//		are defined above.
			// tags:
			//		private

      this._childrenCache = {};
      this._objectCache   = {};
			this._obsHandles    = {};
      this._methods       = {};

      this._eventable     = false;
      this._forest        = false;
      this._loadOptions   = null;
      this._loadRequested = false;
      this._monitored     = false;
      this._observable    = false;
      this._resetPending  = false;
      this._writeEnabled  = true;           // used in StoreModel-API

      this._evtHandles    = { remove: function () {} };
      this._modelReady    = new Deferred();
      this._storeReady    = new Deferred();

			declare.safeMixin(this, kwArgs);

			var props = ["add", "put", "get", "load", "hasChildren", "getChildren", "getParents",
									 "addParent", "query", "removeParent", "queryEngine", 
									 "notify", "emit", "dispatchEvent",
									 "isItem", "ready"
									];
			var store = this.store;

			if (!store) {
				throw new CBTError( "ParameterMissing", "constructor", "Store parameter is required");
			}

			// Prepare the store for usage with this model. Depending on the current
			// store functionality, or lack thereof, the store may be extended with
			// additional methods, advice and/or properties.

			// STEP 1: Exchange the "parentProperty".
			if (store.parentProperty) {
				this.parentProperty = store.parentProperty;
			} else {
				store.parentProperty = this.parentProperty;
			}

			// STEP 2: Check and extend store functionality
			props.forEach( function (prop) {
				if (typeof store[prop] == "function") {
					this._methods[prop] = store[prop];
					switch (prop) {
						case "add":
							if (store.hierarchical !== true) {
								aspect.before( store, "add", Prologue );
							}
							break;
						case "dispatchEvent":
						case "emit":								// Eventable store
							if (store.eventable === true) {
								this._evtHandles = store.on( "change, delete, new", 
																				lang.hitch(this, this._onStoreEvent));
								this._observable = false;	// evented takes precedence
								this._eventable	= true;
							}
							break;
						case "notify":								// Observable store
							if (!this._eventable) {
								this._observable = true;
							}
							break;
						case "put":
							if (store.hierarchical !== true) {
								aspect.before( store, "put", Prologue );
							}
							break;
					}
				} else {
					// Method(s) not supported by the store, extend the store with the
					// required functionality.
					switch (prop) {
						case "getChildren":
							if (typeof store["query"] == "function") {
								var funcBody = "return this.query({"+this.parentProperty+": this.getIdentity(object)});"
								store.getChildren = new Function("object", funcBody);
							} else {
								throw new CBTError( "MethodMissing", "constructor", "store MUST support getChildren()" +
																		" or query() method");
							}
							break;
						case "isItem":
							// NOTE: This will only work for synchronous stores...
							store.isItem = function (/*Object*/ object) {
								if (object && typeof object == "object") {
									return (object == this.get(this.getIdentity(object)));
								}
								return false;
							};
							break;
						case "get":
							// The store must at a minimum support get()
							throw new CBTError( "MethodMissing", "constructor", "store MUST support the get() method");
						case "hasChildren":
						case "load":
						case "ready":
							this._methods[prop] = returnTrue;
							break;
						case "put":
							this._writeEnabled = false;
							break;
					}
				}
			}, this);
			this._monitored = (this._eventable || this._observable);

			// STEP 3: Check for additonal events/callbacks supported by the store.
			aspect.after(store, "onClose", lang.hitch(this, "_onStoreClosed"), true);

		},

		postscript: function () {
			// summary:
			//		Called by dojo/_base/declare after all chained constructors have
			//		been called.
			// tag:
			//		
			// step 4: Finally trigger a store load....
			this.inherited(arguments);
			this._loadStore( this._loadOptions );
		},

		// =======================================================================
		// Model getters and setters (See dojo/Stateful)

		_parentPropertySetter: function (name) {
			// summary:
			//		Set the parentProperty property. The property name must be a string
			//		and can't be a dot separated property name.
			// value:
			//		New parentProperty value.
			// tags:
			//		private
			if (typeof name == "string") {
				if ( /\./.test(name) ) {
					throw new CBTError( "InvalidType", "set", "parentProperty can not be a dot separated string");
				}
			} else {
				throw new CBTError( "InvalidType", "set", "parentProperty value must be a string");
			}
			return this.checkedAttr;
		},
		
		// =======================================================================
		// cbtree/model/Model API methods

		destroy: function () {
			// summary:
			//		Distroy this model releasing memory and handles.
			for(var id in this._childrenCache) {
				this._deleteCacheEntry(id);
			}
			this._evtHandles.remove();	// Remove event listeners if any..

      this._childrenCache = {};
      this._objectCache   = {};
      this.store          = undef;
		},

		getChildren: function (/*Object*/ parent, /*Function*/ onComplete, /*Function*/ onError) {
			// summary:
			//		Calls onComplete() with array of child items of given parent item,
			//		all loaded. Any model derived from BaseStoreModel MUST overwrite
			//		this method with its own specific implementation.
			//
			//		The specific getChildren() implementation MUST call the private method
			//		_getChildren() with the second argument being a method which returns
			//		the children.
			//
			//		(See example below and _getChildren() )
			// parent:
			//		The parent object for which the children will be fetched.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argumen: onComplete(children)
			// onError:
			//		Callback function, called in case an error occurred.
			// example:
			//	|		getchildren: function (parent, onComplete, onError) {
			//	|			function myGetChildren(parent, id) {
			//	|								...
			//	|				return this.store.getChildren(parent);
			//	|			}
			//	|			_getChildren(patent, myGetChildren, onComplete, onError);
			//	|		}
			// tags:
			//		public

			throw new CBTError( "AbstractOnly", "getChildren" );
		},

		getIcon: function (/*Object*/ item) {
			// summary:
			//		Get the icon for item from the store if the iconAttr property of the
			//		model is set.
			// item:
			//		A valid dojo.store item.

			if (this.iconAttr) {
				return this._getProp( this.iconAttr, item );
			}
		},

		getIdentity: function (/*Object*/ item) {
			// summary:
			//		Get the identity of an item.
			// returns:
			//		A string or number.
			// tags:
			//		Public
			return this.store.getIdentity(item);
		},

		getLabel: function (/*Object*/ item) {
			// summary:
			//		Get the label for an item
			if (item === this.root && this.rootLabel) {
				return this.rootLabel;
			}
			return this._getProp( this.labelAttr, item );
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
			var deferred = new Deferred();
			var parents	= [];

			if (storeItem) {
				// Leverage the store if is has a getParents() method.
				if (this._methods.getParents) {
					when( this.store.getParents(storeItem), function (parents) {
						deferred.resolve(parents || []);
					}, deferred.reject );
				} else {
					var parentIds = new Parents( storeItem, this.parentProperty );
					var promises	= [];

					parentIds.forEach(function (id) {
						var parent = this.store.get(id);
						if (parent) {
							when( parent, function (parent) {
								if (parent) {
									parents.push(parent);
								}
							});
							promises.push(parent);
						}
					}, this);
					/// Wait till we have all parents.
					all(promises).always( function () {
						deferred.resolve(parents);
					});
				}
			} else {
				deferred.resolve(parents);
			}
			return deferred.promise;
		},

		getRoot: function (/*Function*/ onItem, /*Function*/ onError) {
			// summary:
			//		Get the tree root. calls onItem with the root item for the tree or
			//		onError on error.
			// onItem:
			//		Function called with the root item for the tree.
			// onError:
			//		Function called in case an error occurred.
			// tag:
			//		Public
			var self = this;

			if (this.root) {
				when( this._storeReady, function () {				
					onItem(self.root);
				});
			} else {
				if (this._methods.query) {
					when( this._storeReady, function () {
						var result = self.store.query(self.query);
						when(result, function (items) {
							if (items.length != 1) {
								throw new CBTError( "InvalidResponse", "getRoot", 
																		 "Root query returned %{0} items, but must return exactly one",
																		 items.length );
							}
							self.root = items[0];
							// Setup listener to detect if root item changes
							if (result.observe) {
								result.observe( function (obj, removedFrom, insertedInto) {
									if (removedFrom == insertedInto) {
										self._onChange( obj, null );
									}
								}, true);	// true to listen for updates to obj
							}
							onItem(self.root);
						}, onError);
					}, onError );
				} else {
					throw new CBTError( "MethodMissing", "getRoot", "store has no query() method" );
				}
			}
		},

		isItem: function (/*any*/ something) {
			// summary:
			//		Validate if an item (something) is an object and under control of
			//		this model and store.	This method is primarily called by the DnD
			//		module dndSource.
			// something:
			//		Any type of object.
			// tag:
			//		Public
			return this.store.isItem(something);
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

			var method = this._methods["hasChildren"];
			var itemId = this.getIdentity(item);
			var result = this._childrenCache[itemId];

			if (result && !(result instanceof Promise) ) {
				return !!result.length;
			}
			return method.call(this.store, item);
		},

		// =======================================================================
		// cbtree/model/Model API extensions

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
				var parents = new Parents(item, this.parentProperty);
				return parents.contains(this.getIdentity(parent));
			}
			return false;
		},

		deleteItem: function (/*Object|Object[]*/ items,/*Boolean?*/ recursive) {
			// summary:
			//		Delete an item from the store. This method is called by the cbtree
			//		when the user selected a node and pressed CTRL+DELETE. Although a
			//		public method, applications should use the store.remove() method
			//		instead.
			// items:
			//		The item, or array of items, to be removed from the store.
			// recursive:
			//		If true, all descendants of the item(s) are delete from the store.
			// tag:
			//		Public
			var items	= items instanceof Array ? items : [items];
			var self	 = this;

			function getDescendants (item) {
				var itemId = self.getIdentity(item);
				if (itemId) {
					if (recursive) {
						// Go remove children first....
						self.getChildren(item, function (children) {
							children.forEach( getDescendants );
						});
					}
					if (self._forest && item == self.root) {
						self._onDeleteItem(item);
					} else {
						var result = self.store.remove( itemId );
						if (!self._monitored) {
							when( result, function () {
								self._onDeleteItem(item);
							});
						}
					}
					if (item == self.root) {
						// entire tree is dropped.....
						self.root = null;
					}
				}
			}
			items.forEach (getDescendants);
		},
		
		ready: function (/*Function?*/ callback,/*Function?*/ errback,/*thisArg*/ scope) {
			// summary:
			//		Execute the callback when the model is ready.  If an error is
			//		detected that will prevent the model from getting ready errback
			//		is called instead.
			// callback:
			//		Function called when the store is ready.
			// errback:
			//		Function called when a condition was detected preventing the model
			//		from getting ready.
			// scope:
			//		The scope/closure in which callback and errback are executed. If
			//		not specified the model is used.
			// returns:
			//		dojo/promise/Promise
			// tag:
			//		Public
			if (callback || errback) {
				return this._modelReady.then(
					callback ? lang.hitch( (scope || this), callback) : null, 
					errback  ? lang.hitch( (scope || this), errback)  : null
				);
			}
			return this._modelReady.promise;
		},

		// =======================================================================
		// Drag-n-Drop support

		newItem: function (/*Object*/ args, /*Object*/ parent, /*int?*/ insertIndex, /*Object*/ before) {
			// summary:
			//		Creates a new item.	 See `dojo/data/api/Write` for details on args.
			//		Used in drag & drop when an item from an external source is dropped
			//		onto tree.		Whenever this method is called by Drag-n-Drop it is a
			//		clear indication that DnD determined the item to be external to the
			//		model and tree however, that doesn't mean there isn't a similar item
			//		in our store. If the item exist the multi-parent mode will determine
			//		the appropriate operation. (insert or move)
			// args:
			//		A javascript object defining the initial content of the item as a set
			//		of JavaScript key:value pairs object.
			// parent:
			//		A valid store item that will serve as the parent of the new item.
			// insertIndex:
			//		Not used.
			// before:
			//		The tree item before which the new item is to be inserted. Note: the
			//		underlaying store must provide support for the 'before' property of
			//		the Store.PutDirectives. (see dojo/store/api/Store)
			// returns:
			//		A dojo/promise/Promise	--> Object
			// tag:
			//		Public

			var mpStore = parent[this.parentProperty] instanceof Array;
			var itemId	= this.getIdentity(args);
			var self		= this;
			var result;

			parent = (this._forest && parent == this.root) ? undef : parent;

			if (itemId != undef) {
				result = when( this.store.get(itemId), function (item) {
					if (item) {
						// An item in the store with the same identification already exists.
						var parentIds = new Parents(item, self.parentProperty);

						// If the store is multi-parented add the new parent otherwise just
						// move the item to its new parent.
						if (mpStore) {
							parentIds.add( self.getIdentity(parent), true );
							item[self.parentProperty] = parentIds.toValue();
							itemId = self.store.put(item);
							if (!self._monitored) {
								when (itemId, function () {
									self._childrenChanged( parent );
								});
							}
						} else {
							// Single parented store, move the item.
							self.getParents(item).then( function (oldParents) {
								if (oldParents.length) {
									self.pasteItem( item, oldParents[0], parent, false, insertIndex, before );
								}
							});
						}
						return item;
					} else {
						// It's a new item to the store so just add it.
						result = self.store.put(args, { parent: parent, before: before });
						return when( result, function (itemId) {
							return when (self.store.get(itemId), function (item) {
								if (item) {
									if (!self._monitored) {
										when( result, function () { self._onNewItem(item); });
									}
								}
								return item;
							});
						});
					}
				});
				return result;
			}
			// It's a new item without a predefined identification, just add it and the store
			// should generate a unique id.
			result = this.store.put(args, { parent: parent, before: before });
			return when( result, function (itemId) {
				return when (self.store.get(itemId), function (item) {
					if (item) {
						if (parent == this.root) {
							self.onRootChange(item, "new");
						}
						if (!this._monitored) {
							when( result, function () { self._onNewItem(item); });
						}
					}
					return item;
				});
			});
		},

		pasteItem: function (/*Object*/ childItem, /*Object*/ oldParentItem, /*Object*/ newParentItem,
												 /*Boolean*/ bCopy, /*int?*/ insertIndex, /*Object*/ before) {
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop

      var parentIds   = new Parents( childItem, this.parentProperty );
      var newParentId = this.getIdentity(newParentItem);
      var oldParentId = this.getIdentity(oldParentItem);
      var updParents  = [newParentItem];
      var model = this;

			if (oldParentId != newParentId) {
				var wasRoot = (oldParentItem == this.root);
				var isRoot	= (newParentItem == this.root);
				if (!bCopy) {
					updParents.push(oldParentItem);
					parentIds.remove(oldParentId);
				}
				if (isRoot || wasRoot) {
					this.onRootChange(childItem, (isRoot ? "attach" : "detach"));
				}
				if (!this._forest || !isRoot) {
					parentIds.add(newParentId);
				}
			}
			// Set the new parent(s) on the object and write it to the store. In order
			// to drag an object amongst its siblings the store MUST support the put
			// directive 'before'.
			childItem[this.parentProperty] = parentIds.toValue();
			var itemId = this.store.put( childItem, {before: before});

			if (!this._monitored || (this._eventable && before)) {
				when( itemId, function () {
					model._childrenChanged( updParents );
				});
			}
			this.onPasteItem( childItem, insertIndex, before );
		},

		// =======================================================================
		// Private event listeners.

		_onChange: function (/*Object*/ newItem, /*Object?*/ oldItem) {
			// summary:
			//		Test which of the item properties changed, if an existing property was
			//		removed or if a new property was added.
			// newItem:
			//		An updated store item.
			// oldItem:
			//		The original store item, that is, before the store update. If oldItem
			//		is not specified the cache is search for a	match.
			// tag:
			//		Private
			var itemId = this.getIdentity(newItem);

			oldItem = oldItem || this._objectCache[itemId];
			if (oldItem) {
				var key;
				//	First, test if an existing property has changed value or if it was
				//	removed.
				for (key in oldItem) {
					if (key in newItem) {
						if (oldItem[key] != newItem[key]) {
							this._onSetItem(newItem, key, oldItem[key], newItem[key]);
						}
					} else {
						this._onSetItem(newItem, key, oldItem[key], undef);
					}
				}
				// Second, test if a new property was added.
				for (key in newItem) {
					if ( !(key in oldItem) ) {
						this._onSetItem(newItem, key, undef, newItem[key]);
					}
				}
			}
			// Keep a shallow copy of the item for later property comparison.
			this._objectCache[itemId] = lang.mixin(null, newItem);
		},

		_onChildrenChange: function (/*Object*/ parent, /*Object[]*/ newChildrenList) {
			// summary:
			//		Callback to do notifications about new, updated, or deleted child
			//		items.	Models that inherit for BaseStoreModel may overwrite this
			//		method to add any additional functionality.
			// parent:
			//		The parent Object
			// newChildrenList:
			// tags:
			//		callback

			this.onChildrenChange(parent, newChildrenList);
		},

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
			when(this.store.get(id),
				function (exists) {
					if (!exists) {
						delete self._objectCache[id];
					}
				},
				function (err) {
					delete self._objectCache[id];
				}
			);
			this._deleteCacheEntry(id);
			this.onDelete(item);
			
			this.getParents(item).then( function (parents) {
				if (self.isChildOf(item, self.root)) {
					self.onRootChange(item, "delete");
				}
				self._childrenChanged( parents );
			});
		},

		_onNewItem: function (/*Object*/ item) {
			// summary:
			//		Mimic the dojo/data/ItemFileReadStore onNew event.
			// item:
			//		The store item that was added.
			// tag:
			//		Private
			var self = this;

			this.getParents(item).then( function (parents) {
				if (self.isChildOf(item, self.root)) {
					self.onRootChange(item, "new");
				}
				self._childrenChanged( parents );
			});
		},

		_onSetItem: function (/*Object*/ storeItem, /*String*/ property, /*any*/ oldValue,
													 /*any*/ newValue) {
			// summary:
			//		Updates the tree view according to changes in the data store.
			// storeItem:
			//		Store item
			// property:
			//		property-name-string
			// oldValue:
			//		Old property value
			// newValue:
			//		New property value.
			// tags:
			//		extension

			var parentProp = this.parentProperty;
			if (property === parentProp) {
				var np = new Parents(newValue, parentProp);
				var op = new Parents(oldValue, parentProp);
				var self = this;
				var dp = [];

				np.forEach( function (parent) {
				var a =self;
				var b = op;
					if (!op.contains(parent) && self._objectCache[parent]) {
						dp.push(self._objectCache[parent]);
					}
				});

				op.forEach( function (parent) {
					if (!np.contains(parent) && self._objectCache[parent]) {
						dp.push(self._objectCache[parent]);
					}
				});
				if (dp.length) {
					self._childrenChanged( dp );
					this.onChange(storeItem, property, newValue, oldValue);
				}
			} else {
				this.onChange(storeItem, property, newValue, oldValue);
			}
			return true;
		},

		_onStoreClosed: function (cleared, count) {
			// summary:
			//		Handler for close notifications from the store.	A reset event
			//		is generated only in case the store was explicitly cleared and
			//		we don't have a reset pending.
			// cleared:
			//		Indicates if the store was cleared.
			// count:
			//		Number of objects left in the store.
			// tag:
			//		Private
			if (!this._resetPending) {
				var reset = !(count && cleared);
				if (reset) {
					for(var id in this._childrenCache) {
						this._deleteCacheEntry(id);
					}
					this._childrenCache = {};
					this._objectCache	 = {};
				}
				// Inform the tree about the store closure.
				if (cleared) {
					var model = this;
					if (!this._modelReady.isFulfilled()) {
						this._modelReady.cancel( new CBTError( "RequestCancel", "_onStoreClosed") );
					}
					this._modelReady		= new Deferred();
					this._storeReady		= new Deferred();
					this._loadRequested = false;
					this._resetPending	= true;
					this.state					= "reset";
					// Trigger 'resetStart' event
					this.onReset();

					if (!this._forest) {
						this.root = null;
					}

					this._loadStore().then( function() {
						model._resetPending = false;
					});
				}
			}
		},

		_onStoreEvent: function (event) {
			// summary:
			//		Common store event listener for eventable stores.	An eventable store
			//		typically dispatches three types of events: 'change', 'delete' or
			//		'new'.
			// event:
			//		Event recieved from the store.
			// tag:
			//		Private

			var detail = event;
			// See if this is a DOM4 style CustomEvent
			if (event.detail) {
				detail = event.detail;
			}
			switch (event.type) {
				case "change":
					this._onChange( detail.item, null );
					if (detail.from && detail.from != detail.at) {
						when ( this.getParents(detail.item), lang.hitch( this, "_childrenChanged" ) );
					}
					break;
				case "close":
					this._onStoreClose(detail.count, detail.cleared);
					break;
				case "delete":
					this._onDeleteItem(detail.item);
					break;
				case "new":
					this._onNewItem(detail.item);
					break;
			}
		},

		// =======================================================================
		// Callbacks/Events

		onChange: function (/*Object*/ item,/*String*/ property,/*any*/ newValue,/*any*/ oldValue) {
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.
			// tags:
			//		callback
		},

		onChildrenChange: function (/*Object*/ parent, /*Object[]*/ newChildrenList) {
			// summary:
			//		Callback to do notifications about new, updated, or deleted child items.
			// parent:
			// newChildrenList:
			// tags:
			//		callback
		},

		onPasteItem: function (/*Object*/ storeItem,/*Number*/ insertIndex,/*Object*/ before) {
			// summary:
			//		Callback when an item was pasted onto the tree.
			// storeItem:
			// insertIndex:
			// before:
			// tags:
			//		callback
		},

		onDelete: function (/*Object*/ storeItem) {
			// summary:
			//		Callback when an item is removed.
			// storeItem:
			// tags:
			//		callback
		},


		onReset: function () {
			// summary:
			//		Callback when the store was closed and explictly cleared. As a 
			//		result the model is reset.
		},

		onRootChange: function (/*Object*/ storeItem, /*String*/ action) {
			// summary:
			//		Handler for any changes to the tree root children.
			// description:
			//		Users can extend this method to modify the new item that's being added
			//		to the root of the tree, for example to make sure the new item matches
			//		the tree root query. Remember, even though the item is dropped on the
			//		tree root it does not quarentee it matches the tree root query unless
			//		the query is simply the store identifier.
			// storeItem:
			//		The store item that was attached to, or detached from, the forest root.
			// action:
			//		String detailing the type of event: "new", "delete", "attach" or
			//		"detach"
			// tag:
			//		callback
		},

		//=========================================================================
		// Private methods

		_childrenChanged: function (/*Object|Object[]*/ parents) {
			// summary:
			//		Notify the tree the children of parents have changed. This method is
			//		called by the internal event listeners and the model API.
			// parents:
			//		Store object or an array of store objects.
			// tag:
			//		Private
			var parentId, self = this;

			parents = parents instanceof Array ? parents : [parents];
			if (parents && parents.length) {
				parents.forEach(function (parent) {
					parentId = self.getIdentity(parent);
					self._deleteCacheEntry(parentId);					
					self.getChildren(parent, function (children) {
						self._onChildrenChange(parent, children.slice(0) );
					}, 
					function (err) {
						console.error(err);		// At least log the error condition
					});
				});
			}
		},

		_deleteCacheEntry: function (/*String|Number*/ id) {
			// summary:
			//		Delete an entry from the childrens cache and remove the associated
			//		observer if any.
			// id:
			//		Store item identification.
			// tag:
			//		Private
			if (this._childrenCache[id]) {
				var handle = this._obsHandles[id];
				handle && handle.remove();
				delete this._childrenCache[id];
				delete this._obsHandles[id];
			}
		},

		_getChildren: function (/*Object*/ parent,/*Function*/ method,/*Function*/ onComplete,
														 /*Function*/ onError) {
			// summary:
			//		The generic dispatcher for all instances of the getChildren() method.
			//		The public getChildren() method is model and/or store specific however,
			//		the caching and dispatching of the result (the children) is common to
			//		all models.
			// parent:
			//		Parent Object.
			// method:
			//		Function to call if no children are found in the children cache for
			//		the given parent.	The function is called in the scope of the model
			//		as method(parent,id) and must return a Promise or an array or array
			//		like object with the parent's children. If a Promise is returned it
			//		MUST resolve to an array or array-like object.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argumen: onComplete(children)
			// onError:
			//		Callback function, called in case an error occurred.
			// tags:
			//		public
			var id	   = this.getIdentity(parent);
			var self   = this;
			var result = null;

			if (parent && id != undef) {
				if (this._observable && this._childrenCache[id]) {
					when(this._childrenCache[id], onComplete, onError);
					return;
				}
				// Call user specified method to fetch the children
				self._childrenCache[id] = result = method.call(self, parent, id);
				
				if (!this._objectCache[id]) {
					this._objectCache[id] = lang.mixin(null, parent);
				}
				// Normalize the children cache. If a store returns a Promise instead of a
				// store.QueryResults, wait for it to resolve so the children cache entries
				// are always of type store.QueryResults.
				when( result, function (queryResult) {
					queryResult.forEach( function (child) {
						self._objectCache[self.getIdentity(child)] = lang.mixin(null, child);
					});
					self._childrenCache[id] = queryResult;
				});

				// Setup listener in case the list of children changes, or the item(s) in
				// the children list are updated in some way. (Only applies to observable
				// stores).

				if (this._observable && result.observe) {
					var handle = result.observe( function (obj, removedFrom, insertedInto) {
						if (insertedInto == -1) {
							when( result, lang.hitch(self, "_onDeleteItem", obj ));
						} else if (removedFrom == -1) {
							when( result, lang.hitch(self, "_onNewItem", obj ));
						} else if (removedFrom == insertedInto) {
							when( result, lang.hitch(self, "_onChange", obj, null));
						} else {
							// insertedInto != removedFrom, this condition indicates the item
							// moved within the tree.
							when(result, function (children) {
								children = Array.prototype.slice.call(children);
							});
						}
					}, true);	// true means to notify on item changes
					this._obsHandles[id] = handle;		// Save the Observer handle.
				}
			} else {
				// No parent or id.
				result = new Deferred();
				result.reject( new CBTError("ParameterMissing", "_getChildren", "No parent object or Id") );
			}
			// Call User callback AFTER registering any listeners.
			when(result, onComplete, onError);
		},

		_getProp: function (/*String*/ propPath,/*Object*/ item ) {
			// summary:
			//		Return property value identified by a dot-separated property propPath
			// propPath:
			//		A dot (.) separated property name like: feature.attribute.type
			// item:
			//		JavaScript item
			// tag:
			//		Private
			var segm = propPath.split(".");
			var p, i = 0;

			while(item && (p = segm[i++])) {
				item = (p in item ? item[p] : undefined);
			}
			return item;
		},

		_loadStore: function (/*Object?*/ options) {
			// summary:
			//		Issue a store load request and then wait for the store to get ready.
			//		The load request is issued just in case the store is configured for
			//		deferred loading (e.g. autoLoad:false)
			// options:
			//		Arbitrary JavaScript key:value pairs object which is passed to the
			//		store load() method.
			// tag:
			//		Private

			if (!this._loadRequested) {
				var ready	= this._methods.ready;
				var loader = this._methods.load;
				var promList, model = this;

				this._loadRequested = true;
				this.state = "loading";
				
				promList = [
					loader.call(this.store, options), 
					ready.call(this.store)
				];
				
				this._loadPromise = all(promList).always( function() {
					return when (ready.call(model.store), function () {
						model._storeReady.resolve();
						//	Go validate the store
						model._validateStore().then ( 
							function () {
								model._modelReady.resolve();
								model.state = "active";
							},
							function (err) {
								model._modelReady.reject(err);
								model.state = "in-active";
							});
						return true;
					},
					// Store failed to get ready.
					function(err) {
						model._modelReady.reject(err);
						model._storeReady.reject(err);
					})
				});
			}
			return this._loadPromise;
		},

		_setProp: function (/*String*/ propPath,/*Object*/ item,/*any*/ value ) {
			// summary:
			//		Set the property value
			// propPath:
			//		A dot (.) separated property name like: feature.attribute.type
			// item:
			// value:
			// tag:
			//		Private
			var segm = propPath.split(".");
			var prop = segm.pop();

			if (segm.length) {
				var p, i = 0;

				while(item && (p = segm[i++])) {
					item = (p in item) ? item[p] : item[p] = {};
				}
			}
			item[prop] = value;
			return value;
		},

		_setValue: function (/*Object*/ item, /*String*/ property, /*any*/ value) {
			// summary:
			//		Set the new value of a store item property and fire the 'onChange'
			//		event if the store is not observable or eventable.
			//item:
			//		Store object
			// property:
			//		Object property name
			// value:
			//		New value to be assigned.
			// returns:
			//		value.
			// tag:
			//		Private
			if (item[property] !== value) {
				if (this._writeEnabled) {
					var orgItem = lang.mixin(null, item);
					var result	= null;
					var self		= this;
					this._setProp( property, item, value );
					result = this.store.put( item, {overwrite: true});
					if (!this._monitored) {
						when( result, function () { self._onChange(item, orgItem); });
					}
				} else {
					throw new CBTError("AccessError", "_setValue", "store is not writable.");
				}
			}
			return value;
		},

		_updateChildrenCache: function (/*String*/ operation, /*Object*/ parent,/*Object*/ child) {
			// summary:
			//		Add or remove a child from the parent children cache.
			// operation:
			//		String, "add" | "attach" | "delete" | "detach"
			// parent:
			//		The parent object.
			// child:
			//		Child object to be added or removed.
			// returns:
			//		store.QueryResult. (an array-like object).
			// tag:
			//		Private
			var parentId = this.getIdentity(parent);
			var self = this;

			// Note: The childrens cache may hold a promise...
			return when( this._childrenCache[parentId], function (children) {
				var childCache = children || [];
				var index = childCache.indexOf(child);
				var total = childCache.total || 0;

				if (operation == "add" || operation == "attach") {
					if (index == -1) {
						childCache.push(child);
						total++;
					}
				} else {
					if (index > -1) {
						childCache.splice(index,1);
						total--;
					}
				}
				childCache["total"] = total;
				self._childrenCache[parentId] = childCache;
				return childCache;
			});
		},

		_validateStore: function () {
			// summary:
			//		Function called from _loadStore() as soon as the store is ready.
			//		Models derived from the BaseStoreModel may override this function.
			// returns:
			//		dojo/Promise/promise
			// tag:
			//		Private

			var defer = new Deferred();
			return defer.resolve();
		}

	});	/* end declare() */

	return BaseStoreModel;

});	/* end define() */

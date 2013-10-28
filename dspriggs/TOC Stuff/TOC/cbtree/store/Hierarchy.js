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
				"./Natural",
				"../errors/createError!../errors/CBTErrors.json"
			 ], function (module, declare, lang, QueryResults, Natural, createError) {

	// module:
	//		cbtree/store/Hierarchy
	// summary:
	//		This store implements the cbtree/store/api/Store API which is an extension
	//		to the dojo/store/api/Store API.

	var CBTError = createError( module.id );
	var undef;

	var Hierarchy = declare([Natural], {
		// summary:
		//		This in-memory store implements the full cbtree/store/api/Store API.
		//		The Hierarchy Store provide support for the dojo/store PutDirectives
		//		property 'parent'. Objects loaded into the store will automatically
		//		get a "parent" property if they don't have one already.
		//		The object's parent property value is the identifier, or an array of
		//		identifiers, of the object's parent(s). (see also: multiParented).
		//
		//		 For addional information see cbtree/store/api/Store.PutDirectives
		//
		// NOTE:
		//		To maintain the object hierarchy both store properties idProperty and
		//		parentProperty MUST be set otherwise object parents and children can
		//		only be retrieved using the store query() method.

		//=========================================================================
		// Additional constructor keyword arguments:

		//	indexChildren: Boolean
		//		Indicates if the store is to maintain a separate index for children.
		//		If true the store will use this index to fetch the children of any
		//		given parent.
		indexChildren: true,

		// multiParented: Boolean|String
		//		Indicates if the store is to support multi-parented objects. If true
		//		the parent property	of store objects is stored as an array allowing
		//		for any object to have multiple parents.	If "auto", multi-parenting
		//		will be determined by the data loaded into the store.
		multiParented: "auto",

		// parentProperty: String
		//		 The property name of an object whose value represents the object's
		//		parent id(s).
		parentProperty: "parent",

		// End constructor keyword arguments
		//=========================================================================

		// hierarchical: Boolean [read-only]
		//		Indicates this store is capable of maintaining an object hierarchy.
		//		The cbtree Models tests for the presence of this property in order to
		//		determine if it has to set the parent property of an object or if the
		//		store will handle it.
		hierarchical: true,

		//=========================================================================

		_indexParent: {},
		_indexChild: {},

		constructor: function () {
			// summary:
			//		Store constructor
			this.indexChildren = this._indexStore ? this.indexChildren : false;
		},

		destroy: function () {
			//summary:
			//		Release all memory and handles, if any
			this._indexParent = {};
			this._indexChild  = {};

			this.inherited(arguments);
		},

		//=========================================================================
		// Private methods

		_getParentArray: function (/*Object*/ object) {
			// summary:
			//		Return the parent(s) of an object as an array of identifiers.
			// object: Object
			//		Store object
			// returns:
			//		An array of parent Ids.
			// tag:
			//		Private
			var parentIds = object[this.parentProperty];
			return (parentIds != undef ? (this.multiParented ? parentIds : [parentIds]) : []);
		},

		_getParentIds: function (/*String|Number*/ objectId,/*any*/ parents) {
			// summary:
			//		Extract the parent ids from a list of parents.
			// objectId:
			//		The object identification.
			// parents:
			//		The parent(s) of an object. The parents arguments can be an id,
			//		an object or an array of objects or ids.
			// returns:
			//		An array of parent Ids.
			// tag:
			//		Private
			var parentIds = [];

			if (parents) {
				parents = (parents instanceof Array ? parents : [parents]);
				parents.forEach( function (parent) {
					switch (typeof parent) {
						case "object":
							parent = this.getIdentity(parent);
							/* NO BREAK HERE */
						case "string":
						case "number":
							if (parent != undef) {
								// Make sure we don't parent ourself or return duplicates.
								if (parent != objectId && parentIds.indexOf(parent) == -1) {
									parentIds.push(parent);
								}
							}
							break;
						default:
							throw new CBTError("InvalidType", "_getParentId");
					}
				}, this);
			}
			return parentIds;
		},

		_loadData: function (data) {
			// summary:
			//		Load an array of data objects into the store and indexes it. If the
			//		store property 'multiParented' is set to "auto" test if any object
			//		has a parent property whose value is an array.
			// data:
			//		An array of objects.
			// tag:
			//		Private

			// Reset indexes...
			this._indexParent = {};
			this._indexChild  = {};

			if (data instanceof Array && this.multiParented == "auto") {
				// Detect the multi parent mode.
				this.multiParented = data.some( function (object) {
					return (object[this.parentProperty] instanceof Array);
				}, this);
			}
			// Load the store
			this.inherited(arguments);
		},

		_parentIdsChanged: function (/*id[]*/ newIds, /*id[]*/ oldIds) {
			// summary:
			//		Test if the content of two sets of parent ids differ. The order in
			//		which the ids appear in a set is irrelavant.
			// newIds:
			// oldIds:
			// returns:
			//		Boolean true if the two sets differ otherwise false
			// tag:
			//		Private
			if (newIds.length == oldIds.length) {
				return !oldIds.every( function (oldIds) {
					return (newIds.indexOf(oldIds) != -1);
				});
			}
			return true;
		},

		_setParentType: function (/*id|id[]*/ parentId) {
			// summary:
			//		Convert the parent(s) from a single value to an array or vice versa
			//		depending on the value of the store multiParented property.
			// parentId:
			//		Parent Id or an array of parent ids.
			// tag:
			//		Private
			if (this.multiParented === true) {
				if (!(parentId instanceof Array)) {
					parentId = (parentId ? [parentId] : []);
				}
			} else if (this.multiParented === false) {
				if (parentId instanceof Array) {
					parentId = (parentId.length ? parentId[0] : undef);
				}
			} else if (this.multiParented === "auto") {
				this.multiParented = (parentId instanceof Array);
			}
			return parentId;
		},

		_updateHierarchy: function (/*Object*/ object, /*Object*/ before, /*Number?*/ index) {
			// summay:
			//		Update the store hierarchy. Whenever the parents of object have changed
			//		or the object needs to be located at a specific predefined location the
			//		store hierarchy and/or natural order is automatically updated.
			// object:
			//		Object whose hierarchical relationship is evaluated.
			// before:
			//		If specified, determines the location at which a new object is inserted
			//		or, if the object already exists, to where the object is relocated.
			// index:
			// tag:
			//		Private
			if (!this.indexChildren) {
				return;
			}
			var objectId = this.getIdentity(object);
			var oldIds   = this._indexParent[objectId] || [];
			var newIds   = this._getParentArray(object);

			var changed = this._parentIdsChanged( newIds, oldIds );
			if (changed) {
				oldIds.forEach( function (parentId) {
					// If a previous parent is no longer present in the new list of parents
					// remove the object from that previous parent.
					if (newIds.indexOf(parentId) == -1) {
						var children = this._indexChild[parentId];
						var childAt	= children.indexOf(object);
						if (childAt > -1) {
							children.splice(childAt,1);
							if (children.length == 0) {
								delete this._indexChild[parentId];
							}
						}
					}
				}, this);
			}

			if (changed || before) {
				newIds.forEach( function (parentId) {
					var children = this._indexChild[parentId] || [];
					if (before) {
						// Apply natural order to the children.
						this._insertBefore( children, object, before );
					} else {
						// Make sure we don't create duplicate references
						if (children.indexOf(object) == -1) {
							children.push(object);
						}
					}
					this._indexChild[parentId] = children;
				}, this);
				this._indexParent[objectId] = newIds.slice(0);
				if (!newIds.length) {
					delete this._indexParent[objectId];
				}
			}
		},

		_validParents: function (/*Object*/ child) {
			// summary:
			//		Validate if the parent ids of a given child object reference existing
			//		objects in the store.
			// child:
			//		Object whose parent ids are evaluated.
			// returns:
			//		Boolean true if all parents are valid store objects otherwise false.
			// tag:
			//		Private
			var parentIds = this._getParentArray(child);
			return parentIds.every( function (parentId) {
				return this._indexId[parentId];
			}, this);
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

			var before, result;
			if (options) {
				if (options.parent) {
					object[this.parentProperty] = this._getParentIds(id, options.parent);
				}
				if (options.before) {
					before = this._anyToObject( options.before );
				}
			}
			// Convert the 'parent' property to the correct format.
			object[this.parentProperty] = this._setParentType(object[this.parentProperty]);
			result = this.inherited(arguments);

			this._updateHierarchy(object, before);
			return result;
		},

		//=========================================================================
		// Public cbtree/store/api/store API methods

		addParent: function(/*Object*/ child,/*any*/ parents) {
			// summary:
			//		Add parent(s) to the list of parents of child.
			// parents: any
			//		Id or Object or an array of those types to be added as the parent(s)
			//		of child.
			// child: Object
			//		Store object to which the parent(s) are added
			// returns: Boolean
			//		true if parent id was successfully added otherwise false.

			var childId = this.getIdentity(child);
			var newIds  = this._getParentIds(childId, parents);
			if (newIds.length) {
				// Clone the store object so evented stores can clearly distinguish
				// between an old and a new object.
				var updObj	= lang.clone(child);
				var currIds = this._getParentArray(updObj);
				newIds.forEach( function (id) {
					if (currIds.indexOf(id) == -1) {
						currIds.unshift(id);
					}
				});
				updObj[this.parentProperty] = this._setParentType(currIds);
				// Call put() making the event observable..
				this.put(updObj);
				return true;
			}
			return false;
		},

		close: function (/*Boolean?*/ clear) {
			// summary:
			//		Closes the store and optionally clears it.
			// clear:
			//		If true, the store is reset. If not specified the store property
			//		'clearOnClose' is used instead.
			// tag:
			//		Public

			var clearStore = clear || this.clearOnClose;
			if (!!clearStore) {
				this._indexParent = {};
				this._indexChild  = {};
			}
			this.inherited(arguments);
		},


		getChildren: function (/*Object*/ parent, /*Store.QueryOptions?*/ options) {
			// summary:
			//		Retrieves the children of an object.
			// parent:
			//		The object to find the children of.
			// options:
			//		Additional options to apply to the retrieval of the children.
			// returns:
			//		dojo/store/api/Store.QueryResults: A result set of the children of
			//		the parent object.
			// tag:
			//		Public

			var parentId = this.getIdentity(parent);
			var query    = {};
			var dataSet;

			// If a childrens index is available use it instead of querying all store
			// objects.
			if (this.indexChildren) {
				var children = this._indexChild[parentId] || [];
				var dataSet	= children.slice(0);
			}
			// Call the query() method so the result can be made observable.
			query[this.parentProperty] = parentId;
			return this.query( query, options, dataSet );
		},

		getParents: function (/*Object*/ child) {
			// summary:
			//		Retrieve the parent(s) of an object
			// child:
			//		Child object to retrieve the parents for.
			// returns:
			//		An array of objects or void if the child is not a valid object.
			// tag:
			//		Public

			if (child) {
				var parentIds = this._getParentArray(child);
				var parents   = [];

				parentIds.forEach( function (parentId) {
					var parent = this.get(parentId);
					if (parent) {
						parents.push(parent);
					}
				}, this);
				return parents;
			}
		},

		hasChildren: function(/*Object*/ parent) {
			// summary:
			//		Test if a parent object has known children.	Whenever the store has a
			//		childrens index use it otherwise search the store for the first object
			//		that has a parent reference to parent.
			// parent: Object
			// returns: Boolean
			//		 true if the parent object has known children otherwise false.

			var parentId = this.getIdentity(parent);
			if (this.indexChildren) {
				var children = this._indexChild[parentId] || [];
				return !!children.length;
			} else {
				// Note: search the store, we only need one child...
				return this._data.some( function (object) {
					var parentIds = this._getParentArray(object);
					return (parentIds.indexOf(parentId) != -1);
				}, this);
			}
		},

		query: function (/*Object*/ query,/*QueryOptions?*/ options /*Object[]? _dataSet */) {
			// summary:
			//		Queries the store for objects.
			// query: Object
			//		The query to use for retrieving objects from the store.
			// options:
			//		The optional arguments to apply to the resultset.
			// _dataSet: (INTERNAL USE ONLY)
			//		If specified this array of objects is used instead of the full store
			//		data object array. In addition, no filtering is applied by the query
			//		function returned by QueryEngine.
			// returns: dojo/store/api/Store.QueryResults
			//		The results of the query, extended with iterative methods.

			var _dataSet = (arguments.length == 3 ?	arguments[2] : null);
			var data     = _dataSet || this._data;
			var self     = this;

			if (this._loadDeferred.isFulfilled() || _dataSet) {
				return QueryResults( this.queryEngine(query, options)(data, !!_dataSet) );
			} else {
				// If the store data isn't loaded yet defer the query until it is...
				return QueryResults( this._loadDeferred.then( function () {
					return self.queryEngine(query, options)(self._data, false)
				}));
			}
		},

		remove: function (/*String|Number*/ id) {
			// summary:
			//		Deletes an object by its identity
			// id:
			//		The identity to use to delete the object
			// returns:
			//		Returns true if an object was removed otherwise false.
			var at = this._indexId[id];
			if (at >= 0) {
				var object  = this._data[at];
				var parents = object[this.parentProperty];	// Save current parents
				// Clear its list of parents.
				object[this.parentProperty] = undef;
				this._updateHierarchy(object, null);
				this._data.splice(at, 1);
				// now we have to reindex
				this._indexData();
				// Restore the parent property so any external entity that relies on
				// presence of this property will have it available.
				object[this.parentProperty] = parents;
				return true;
			}
			return false;
		},

		removeParent: function(/*Object*/ child,/*any*/ parents) {
			// summary:
			//		Remove a parent from the list of parents of child.
			// parents: any
			//		Id or Object or an array of the those types to be removed from the
			//		list of parent(s) of child.
			// child:
			//		Store object from which the parent(s) are removed
			// returns: Boolean
			//		true if the parent id was successfully removed otherwise false.

			var childId = this.getIdentity(child);
			var remIds  = this._getParentIds(childId, parents);
			if (remIds.length) {
				var updObj	= lang.clone(child);
				var currIds = this._getParentArray(updObj);
				currIds = currIds.filter( function (id) {
					return (remIds.indexOf(id) == -1);
				});
				updObj[this.parentProperty] = this._setParentType(currIds);
				// Call put() making the event observable..
				this.put(updObj);
				return true;
			}
			return false;
		},

		toString: function () {
			return "[object HierarchyStore]";
		}

	});	/* end declare() */

	return Hierarchy

});

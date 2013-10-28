//
// Copyright (c) 2010-2012, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree), also known as the 'Dijit Tree with Multi State Checkboxes'
//	is released under to following three licenses:
//
//	1 - BSD 2-Clause							 (http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License			 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License	 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
//	In case of doubt, the BSD 2-Clause license takes precedence.
//
define([
	"dojo/_base/array",	  // array.indexOf array.some
	"dojo/_base/declare", // declare
	"dojo/_base/lang",    // lang.hitch
	"dojo/_base/window",  // win.global
	"dojo/aspect",				// aspect.after
	"./TreeStoreModel"
], function(array, declare, lang, win, aspect, TreeStoreModel){

		// module:
		//		cbtree/models/FileStoreModel
		// summary:
		//		Interface between a CheckBox Tree and a cbtree File store that doesn't have a
		//		root item, a.k.a. a store that can have multiple "top level" items.

	return declare([TreeStoreModel], {
		// summary:
		//		Interface between a cbTree.Tree and a cbtree FileStore
		//

		//=================================
		// Parameters to constructor

		// deferItemLoadingUntilExpand: Boolean
		//		Setting this to true will cause the FileStoreModel to defer calling loadItem
		//		on nodes until they are expanded. This allows for lazying loading where only
		//		one loadItem (and generally one network call) per expansion rather than one
		//		for each child.
		deferItemLoadingUntilExpand: true,

		// queryOptions: Object
		//		A set of JS 'property:value' pairs use to assist in querying the File Store.
		//		Properties supported are: 'deep' and 'ignoreCase'. If deep is true a recursive
		//		search is performed on the stores basePath and path combination. If ignoreCase
		//		is true matching filenames and paths is done case insensitive.
		queryOptions: null,

		// sort: Object[]
		//		An array of sort fields, each sort field is a JavaScript 'property:value' pair
		//		object. The sort field properties supported are: 'attribute', 'descending' and
		//		'ignoreCase'.
		//		Each sort field object must at least have the 'attribute' property defined, the
		//		default value for both 'descending' and 'ignoreCase' is false.
		//		The sort operation is performed in the order in which the sort field objects
		//		appear in the sort array.
		//
		//		Example: [ {attribute:'directory', descending:true}, {attribute:'name', ignoreCase: true} ]
		sort: null,

		// rootLabel: String
		//		Label of fabricated root item
		rootLabel: "ROOT",

		// rootId: String
		//		ID of fabricated root item
		rootId: "$rootDir$",

		// validateStore: Boolean

		// End of parameters to constructor
		//=================================

		moduleName: "cbTree/models/FileStoreModel",

		constructor: function (params) {
			// summary:
			//		Sets up variables, etc.
			// tags:
			//		private

			var store = this.store;

			// Make dummy root item
			this.root = {
				store: this,
				root: true,
				id: this.rootId,
				label: this.rootLabel,
				children: params.rootChildren	// optional param
			};
			this.root[this.checkedAttr] = this.checkedState;
			this.hasFakeRoot    = true;

			// Because a File Store does not provide any initial checked state information
			// there is no need to validate the store at startup.
			this._validateStore = false;

			if (params.queryOptions) {
				this._setQueryOptions(params.queryOptions);
			}
			if (params.sort) {
				this._setSortFields(params.sort);
			}

			// if the store supports Notification, subscribe to the notification events
			if(store.getFeatures()['dojo.data.api.Notification']){
				this.connects = this.connects.concat([
					aspect.after(store, "onClose", lang.hitch(this, "onStoreClose"), true)
				]);
			}
			console.warn("cbTree/models/FileStoreModel has been deprecated and will be removed with dojo 2.0 !!");
		},

		// =======================================================================
		// Methods to set model properties

		_setQueryOptions: function (/*object*/ queryOptions ) {
			if (lang.isObject(queryOptions)) {
				this.queryOptions = queryOptions;
			}
		},

		_setSortFields: function (/*array*/ sort ) {
			if (lang.isArray(sort)) {
				var isArrayOfObjects = true;
				array.forEach( sort, function (field) {
						if (!lang.isObject(field)) {
							isArrayOfObjects = false;
						}
					} )
				if (isArrayOfObjects) {
					this.sort = sort;
				}
			}
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getChildren: function(/*dojo.data.Item*/ parentItem, /*function(items)*/ onComplete, /*function*/ onError ) {
			// summary:
			//		 Calls onComplete() with array of child items of given parent item, all loaded.
			var store = this.store;
			var scope = this;

			if(parentItem === this.root){
				if(this.root.children){
					// already loaded, just return
					onComplete(this.root.children);
				} else {
					this.store.fetch( { query: this.query,
															queryOptions: this.queryOptions,
															sort: this.sort,
															onComplete: lang.hitch(this, function(items){
																this.root.children = items;
																onComplete(items);
															}),
															onError: onError
														}	);
				}
			} else {
				store.fetchChildren( { item: parentItem,
															 query: this.query,
															 queryOptions: this.queryOptions,
															 sort: this.sort,
															 onError: onError,
															 scope: scope,
															 onComplete: function (items) {
																 onComplete(items);
															 }
														 } );
			}
			return;
		},

		getParents: function (/*dojo.data.item*/ storeItem) {
			// summary:
			//		Get the parent(s) of a store item.
			// storeItem:
			//		The dojo.data.item whose parent(s) will be returned.
			// tags:
			//		private
			var parents = [];

			if (storeItem) {
				if (storeItem !== this.root) {
					parents = this.store.getParents(storeItem);
					if (!parents.length) {
						return [this.root];
					}
				}
				return parents;
			}
		},

		mayHaveChildren: function(/*dojo.data.Item*/ item){
			// summary:
			//		Tells if an item has or may have children.	Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have children.
			//		(For efficiency reasons we may not want to check if an element actually
			//		has children until user clicks the expando node)
			// tags:
			//		extension
			return item === this.root || this.inherited(arguments);
		},

		// =======================================================================
		// Inspecting items

		fetchItemByIdentity: function(/* object */ keywordArgs){
			if(keywordArgs.identity == this.root.id){
				var scope = keywordArgs.scope ? keywordArgs.scope : win.global;
				if(keywordArgs.onItem){
					keywordArgs.onItem.call(scope, this.root);
				}
			}else{
				this.inherited(arguments);
			}
		},

		getIcon: function(/* item */ item){
			if (this.iconAttr) {
				if (item !== this.root) {
					return this.store.getValue(item, this.iconAttr);
				}
				return this.root[this.iconAttr];
			}
		},

		getIdentity: function(/* item */ item){
			return (item === this.root) ? this.root.id : this.inherited(arguments);
		},

		getLabel: function(/* item */ item){
			return	(item === this.root) ? this.root.label : this.inherited(arguments);
		},

		isItem: function(/* anything */ something){
			return (something === this.root) ? true : this.inherited(arguments);
		},

		isChildOf: function (/*dojo.data.item*/ parent,/*dojo.data.item*/ item) {
			if (parent === this.root) {
				if (array.indexOf(this.root.children,item) !== -1) {
					return true;
				}
			} else {
				return this.inherited(arguments);
			}
		},

		// =======================================================================
		// Write interface

		deleteItem: function(/*item*/ item, /*Callback*/ onBegin, /*Callback*/ onComplete,
													/*Callback*/ onError, /*Context*/ scope) {
			// summary:
			//		Delete an item from the file store.
			// item:
			//		A valid File Store item
			// onBegin:
			//		If an onBegin callback function is provided, the callback function
			//		will be called just once, before the XHR DELETE request is issued.
			//		The onBegin callback MUST return true in order to proceed with the
			//		deletion, any other return value will abort the operation.
			// onComplete:
			//		If an onComplete callback function is provided, the callback function
			//		will be called once on successful completion of the delete operation
			//		with the list of deleted file store items: onComplete(items)
			// onError:
			//		The onError parameter is the callback to invoke when the item load
			//		encountered an error. It takes only one parameter, the error object
			// scope:
			//		If a scope object is provided, all of the callback functions (onBegin,
			//		onError, etc) will be invoked in the context of the scope object. In
			//		the body of the callback function, the value of the "this" keyword
			//		will be the scope object otherwise window.global is used.
			// tag:
			//		Public
			var scope = scope || window.global;

			if (item === this.root) {
				var children = this.root.children || [];
				var i;

				if (children.length > 0) {
					if (onBegin) {
						if (!onBegin.call(scope, item)) {
							return;
						}
					}
					for(i=0;i<children.length; i++) {
						this.store.deleteItem( children[i], null, onComplete, onError, scope );
					}
				}
			} else {
				return this.store.deleteItem(item, onBegin, onComplete, onError, scope);
			}
		},

		newItem: function(/* dojo.dnd.Item */ args, /*Item*/ parent, /*int?*/ insertIndex, /*String?*/ childrenAttr){
			throw new Error(this.moduleName+"::newItem(): Operation not allowed on a File Store.");
		},

		pasteItem: function (/*dojo.data.item*/ childItem, /*dojo.data.item*/ oldParentItem, /*dojo.data.item*/ newParentItem,
												 /*Boolean*/ bCopy, /*int?*/ insertIndex, /*String?*/ childrenAttr){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop
			// tags:
			//		extension
			var newParentDir = "",
					childItemDir = "";

			// The child item MUST be an existing item in this.store
			if (this.store.isItem(childItem)) {
				childItemDir = this.store.getDirectory(childItem);
				if (newParentItem !== this.root){
					if (newParentItem.directory) {
						newParentDir = this.store.getPath(newParentItem);
					} else {
						newParentDir = this.store.getDirectory(newParentItem);
					}
				}
				if (childItemDir !== newParentDir) {
					var newPath = newParentDir + "/" + this.store.getLabel(childItem);
					this.store.renameItem( childItem, newPath );
				}
			}
		},

		// =======================================================================
		// Events from data store

		onDeleteItem: function(/*Object*/ item){
			// summary:
			//		Handler for delete notifications from underlying store

			// check if this was a child of root, and if so send notification that root's children
			// have changed
			if(array.indexOf(this.root.children, item) != -1){
				this._requeryTop();
			}
			this.inherited(arguments);
		},

		onNewItem: function(/* dojo.data.item */ item, /* Object */ parentInfo){
			// summary:
			//		Handler for when new items appear in the store, either from a drop operation
			//		or some other way.	 Updates the tree view (if necessary).
			// description:
			//		If the new item is a child of an existing item,
			//		calls onChildrenChange() with the new list of children
			//		for that existing item.
			//
			// tags:
			//		extension

			// Call onChildrenChange() on parent (ie, existing) item with new list of children
			// In the common case, the new list of children is simply parentInfo.newValue or
			// [ parentInfo.newValue ], although if items in the store has multiple
			// child attributes (see `childrenAttr`), then it's a superset of parentInfo.newValue,
			// so call getChildren() to be sure to get right answer.
			if(parentInfo){
				this.getChildren(parentInfo.item, lang.hitch(this, function(children){
					this.onChildrenChange(parentInfo.item, children);
				}));
				this._updateCheckedParent(item, true);
			} else {
				this._requeryTop();
			}
		},

		onSetItem: function (/*dojo.data.item*/ storeItem, /*string*/ attribute, /*AnyType*/ oldValue,
													/*AnyType*/ newValue){
			// summary:
			//		Updates the tree view according to changes in the data store.
			// description:
			//		Handles updates to a store item's children by calling onChildrenChange(), and
			//		other updates to a store item by calling onChange().
			// storeItem:
			//		Store item
			// attribute:
			//		attribute-name-string
			// oldValue:
			//		Old attribute value
			// newValue:
			//		New attribute value.
			// tags:
			//		extension

			if (this._queryAttrs.length && array.indexOf(this._queryAttrs, attribute) != -1) {
				this._requeryTop();
			}
			this.inherited(arguments);
		},

		onStoreClose: function (/*boolean*/ reset ) {
		// Summary:
		//		Handler for when the store is closed.
		// reset:
		//		Indicates if th store was reset to its original state.
		},

		_requeryTop: function (){
			// summary:
			//		Reruns the query for the children of the root node, sending out an
			//		onChildrenChange notification if those children have changed.
			// tags:
			//		private

			var oldChildren = this.root.children || [];
			this.store.fetch(	{	query: this.query,
													queryOptions: this.queryOptions,
													sort: this.sort,
													onComplete: lang.hitch(this, function (newChildren){
														this.root.children = newChildren;
														// If the list of children or the order of children has changed...
														if (oldChildren.length != newChildren.length ||
															array.some(oldChildren, function (item, idx){
																	return newChildren[idx] != item;
																})) {
															this.onChildrenChange(this.root, newChildren);
															this._updateCheckedParent(newChildren[0], true);
														}
													}) /* end hitch() */
												}); /* end fetch() */
		}

	});

});

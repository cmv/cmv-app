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
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/has",
	"./TreeStoreModel"
], function (array, lang, has, TreeStoreModel) {

	// Add cbTree model API to the available features list
	has.add("cbtree-storeModel-API", true);

	lang.extend(TreeStoreModel, {

		// =======================================================================
		// Private Methods related to checked states

		_checkOrUncheck: function (/*String|Object*/ query, /*Boolean*/ newState, /*Callback*/ onComplete,
																/*Context*/ scope, /*Boolean*/ storeOnly) {
			// summary:
			//		Check or uncheck the checked state of all store items that match the
			//		query and have a checked state.
			//		This method is called by either the public methods 'check' or 'uncheck'
			//		providing an easy way to programmatically alter the checked state of a
			//		set of store items associated with the tree nodes.
			//
			// query:
			//		A query object or string. If query is a string the label attribute of
			//		the store is used as the query attribute and the query string assigned
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
			// storeOnly:
			//		See fetchItemsWithChecked()
			// tag:
			//		private

			var matches = 0,
					updates = 0;

			this.fetchItemsWithChecked(query, function (storeItems) {
				array.forEach(storeItems, function (storeItem) {
					if (this.store.getValue(storeItem, this.checkedAttr) != newState) {
						this._ItemCheckedSetter(storeItem, newState);
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
		// Data store item getters and setters

		_ItemCheckedGetter: function (/*dojo.data.Item*/ storeItem) {
			// summary:
			//		Get the current checked state from the data store for the specified item.
			//		This is the hook for getItemAttr(item,"checked")
			// description:
			//		Get the current checked state from the dojo.data store. The checked state
			//		in the store can be: 'mixed', true, false or undefined. Undefined in this
			//		context means no checked identifier (checkedAttr) was found in the store
			// storeItem:
			//		The item in the dojo.data.store whose checked state is returned.
			// tag:
			//		private
			// example:
			//		var currState = model.get(item,"checked");

			return this.getChecked(storeItem);
		},

	 _ItemCheckedSetter: function (/*dojo.data.Item*/ storeItem, /*Boolean*/ newState) {
			// summary:
			//		Update the checked state for the store item and the associated parents
			//		and children, if any. This is the hook for setItemAttr(item,"checked",value).
			// description:
			//		Update the checked state for a single store item and the associated
			//		parent(s) and children, if any. This method is called from the tree if
			//		the user checked/unchecked a checkbox. The parent and child tree nodes
			//		are updated to maintain consistency if 'checkedStrict' is set to true.
			//	storeItem:
			//		The item in the dojo.data.store whose checked state needs updating.
			//	newState:
			//		The new checked state: 'mixed', true or false
			// tags:
			//		private
			//	example:
			//		model.set(item,"checked",newState);

			this.setChecked(storeItem, newState);
		},

		_ItemIdentityGetter: function (storeItem){
			// summary:
			//		Provide the hook for getItemAttr(storeItem,"identity") calls. The
			//		getItemAttr() interface is the preferred method over the legacy
			//		getIdentity() method.
			// storeItem:
			//		The store or root item whose identity is returned.
			// tag:
			//		private

			if (this.store.isItem(storeItem)) {
				return this.store.getIdentity(storeItem);	// Object
			} else {
				if (storeItem === this.root){
					return this.root.id;
				}
			}
			throw new TypeError(this.moduleName+"::getIdentity(): invalid item specified.");
		},

		_ItemIdentitySetter: function (storeItem, value){
			// summary:
			//		Hook for setItemAttr(storeItem,"identity",value) calls. However, changing
			//		the identity of a store item is NOT allowed.
			// tags:
			//		private
			throw new Error(this.moduleName+"::setItemAttr(): Identity attribute cannot be changed");
		},

		_ItemLabelGetter: function (storeItem){
			// summary:
			//		Provide the hook for getItemAttr(storeItem,"label") calls. The getItemAttr()
			//		interface is the preferred method over the legacy getLabel() method.
			// storeItem:
			//		The store item whose label is returned.
			// tag:
			//		private

			if (storeItem !== this.root){
				if (this.labelAttr){
					return this.store.getValue(storeItem,this.labelAttr);	// String
				}else{
					return this.store.getLabel(storeItem);	// String
				}
			}
			return this.root.label;
		},

		_ItemLabelSetter: function (storeItem, value){
			// summary:
			//		Hook for setItemAttr(storeItem,"label",value) calls. However, changing
			//		the label value is only allowed if the label attribute isn't the same
			//		as the store identity attribute.
			// storeItem:
			//		The store item whose label is being set.
			// value:
			//		New label value.
			// tags:
			//		private

			var labelAttr = this.get("labelAttr");

			if (labelAttr){
				if (labelAttr != this.store.getIdentifierAttr()){
					return this.store.setValue(storeItem, labelAttr, value);
				}
				throw new Error(this.moduleName+"::setItemAttr(): Label attribute {"+labelAttr+"} cannot be changed");
			}
		},

		_ItemParentsGetter: function (storeItem) {
			// summary:
			// storeItem:
			//		The store item whose parent(s) are returned.
			return this.getParents(storeItem);
		},

		getItemAttr: function (/*dojo.data.Item*/ storeItem , /*String*/ attribute){
			// summary:
			//		Provide the getter capabilities for store items thru the model.
			//		The getItemAttr() method strictly operates on store items not
			//		the model itself.
			// storeItem:
			//		The store item whose property to get.
			// attribute:
			//		Name of property to get
			// tag:
			//		public

			var attr = (attribute == this.checkedAttr ? "checked" : attribute);

			if (this.isItem(storeItem) || storeItem === this.root) {
				var func = this._getFuncNames("Item", attr);
				if (lang.isFunction(this[func.get])) {
					return this[func.get](storeItem);
				} else {
					if (storeItem === this.root && this.hasFakeRoot) {
						return this.root[attr];
					}
					return this.store.getValue(storeItem, attr)
				}
			}
			throw new Error(this.moduleName+"::getItemAttr(): argument is not a valid store item.");
		},

		setItemAttr: function (/*dojo.data.item*/ storeItem, /*String*/ attribute, /*anytype*/ value) {
			// summary:
			//		Provide the setter capabilities for store items thru the model.
			//		The setItemAttr() method strictly operates on store items not
			//		the model itself.
			// storeItem:
			//		The store item whose property is to be set.
			// attribute:
			//		Property name to set.
			// value:
			//		Value to be applied.
			// tag:
			//		public

			if (this._writeEnabled) {
				var attr = (attribute == this.checkedAttr ? "checked" : attribute);
				if (this.isItem(storeItem)) {
					var func = this._getFuncNames("Item", attr);
					if (lang.isFunction(this[func.set])) {
						return this[func.set](storeItem,value);
					} else {
						return this.store.setValue(storeItem, attr, value);
					}
				} else {
					throw new Error(this.moduleName+"::setItemAttr(): argument is not a valid store item.");
				}
			} else {
				throw new Error(this.moduleName+"::setItemAttr(): store is not write enabled.");
			}
		},

		// =======================================================================
		// Inspecting nad validating items

		fetchItem: function (/*String|Object*/ args, /*String?*/ identAttr){
			// summary:
			//		Get the store item that matches args. Parameter args is either an
			//		object or a string.
			// args:
			//		An object or string used to query the store. If args is a string its
			//		value is assigned to the store identifier property in the query.
			// identAttr:
			//		Optional attribute name. If specified, the attribute in args to be
			//		used as the identifier otherwise the default store identifier is
			//		used.
			// tag:
			//		public

			var identifier = this.store.getIdentifierAttr();
			var idQuery		= this._anyToQuery(args, identAttr);

			if (idQuery){
				if (idQuery[identifier] != this.root.id){
					return this.store.itemExist(idQuery);
				}
				return this.root;
			}
		},

		fetchItemsWithChecked: function (/*String|Object*/ query, /*Callback?*/ onComplete, /*Context?*/ scope,
																			/*Boolean?*/ storeOnly) {
			// summary:
			//		Get the list of store items that match the query and have a checked
			//		state, that is, a checkedAttr property.
			// description:
			//		Get the list of store items that match the query and have a checked
			//		state. This method provides a simplified interface to the data stores
			//		fetch() method.
			//	 query:
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
			//		the value of the "this" keyword will be the scope object. If no scope
			//		object is provided, onComplete will be called in the context of tree.model.
			// storeOnly:
			//		Indicates if the fetch operation should be limited to the in-memory store
			//		only. Some stores may fetch data from a back-end server when perfroming a
			//		deep search. However, when querying attributes, some attributes may only
			//		be available in the in-memory store such is the case with a FileStore
			//		having custom attributes. (See FileStore.fetch() for additional details).
			// tag:
			//		public

			var storeQuery = this._anyToQuery( query, null );
			var storeItems = [];
			var storeOnly  = (storeOnly !== undefined) ? storeOnly : true;
			var scope      = scope || this;

			if (lang.isObject(storeQuery)){
				this.store.fetch({
					query: storeQuery,
					//	Make sure ALL items are searched, not just top level items.
					queryOptions: { deep: true, storeOnly: storeOnly },
					onItem: function (storeItem, request) {
						// Make sure the item has the appropriate attribute so we don't inadvertently
						// start adding checked state properties unless 'checkedAll' is true.
						if (this.store.hasAttribute(storeItem, this.checkedAttr)) {
							storeItems.push(storeItem);
						} else {
							// If the checked attribute is missing it can be an indication the item
							// has not been rendered yet in any tree. Therefore check if it should
							// have the attribute and, if so, create it and apply the default state.
							if (this.checkedAll) {
								this.setChecked(storeItem, this.checkedState);
								storeItems.push(storeItem);
							}
						}
					},
					onComplete: function () {
						if (onComplete) {
							onComplete.call(scope, storeItems);
						}
					},
					onError: this.onError,
					scope: this
				});
			} else {
				throw new Error(this.moduleName+"::fetchItemsWithChecked(): query must be of type object.");
			}
		},

		isRootItem: function (/*AnyType*/ something){
			// summary:
			//		Returns true if 'something' is a top level item in the store otherwise false.
			// item:
			//		A valid dojo.data.store item.
			// tag:
			//		public

			if (something !== this.root){
				return this.store.isRootItem(something);
			}
			return true;
		},

		// =======================================================================
		// Write interface

		addReference: function (/*dojo.data.item*/ childItem, /*dojo.data.item*/ parentItem, /*String?*/ childrenAttr){
			// summary:
			//		Add an existing item to the parentItem by reference.
			// childItem:
			//		Child item to be added to the parents childrens list by reference.
			// parentItem:
			//		Parent item.
			// childrenAttr:
			//		Property name of the parentItem identifying the childrens list to
			//		which the reference is added.
			// tag:
			//		public

			var listAttr = childrenAttr || this.childrenAttrs[0];
			if (this.store.addReference(childItem, parentItem, listAttr)){
				this._updateCheckedParent(childItem);
			}
		},

		attachToRoot: function (/*dojo.data.item*/ storeItem){
			// summary:
			//		Promote a store item to a top level item.
			// storeItem:
			//		A valid dojo.data.store item.
			// tag:
			//		public

			if (storeItem !== this.root){
				this.store.attachToRoot(storeItem);
			}
		},

		check: function (/*Object|String*/ query, /*Callback*/ onComplete, /*Context*/ scope, /*Boolean?*/ storeOnly) {
			// summary:
			//		Check all store items that match the query and have a checked state.
			// description:
			//		See description _checkOrUncheck()
			//	example:
			//		model.check({ name: "John" });
			//	| model.check("John", myCallback, this);
			// tag:
			//		public

			// If in strict checked mode the store is already loaded and therefore no
			// need to fetch the store again.
			if (this.checkedStrict) {
				storeOnly = true;
			}
			this._checkOrUncheck(query, true, onComplete, scope, storeOnly);
		},

		detachFromRoot: function (/*dojo.data.item*/ storeItem) {
			// summary:
			//		Detach item from the root by removing it from the stores top level item
			//		list
			// storeItem:
			//		A valid dojo.data.store item.
			// tag:
			//		public

			if (storeItem !== this.root){
				this.store.detachFromRoot(storeItem);
			}
		},

		newReferenceItem: function (/*dojo.dnd.Item*/ args, /*dojo.data.item*/ parent, /*int?*/ insertIndex){
			// summary:
			//		Create a new top level item and add it as a child to the parent.
			// description:
			//		In contrast to the newItem() method, this method ALWAYS creates the
			//		new item as a top level item regardsless if a parent is specified or
			//		not.
			// args:
			//		A javascript object defining the initial content of the item as a set
			//		of JavaScript 'property name: value' pairs.
			// parent:
			//		Optional, a valid store item that will serve as the parent of the new
			//		item. (see also newItem())
			// insertIndex:
			//		If specified the location in the parents list of child items.
			// tag:
			//		public

			var newItem;

			newItem = this.newItem(args, parent, insertIndex);
			if (newItem) {
				this.store.attachToRoot(newItem); // Make newItem a top level item.
			}
			return newItem;
		},

		removeReference: function (/*dojo.data.item*/ childItem, /*dojo.data.item*/ parentItem, /*String?*/ childrenAttr){
			// summary:
			//		Remove a child reference from its parent. Only the references are
			//		removed, the childItem is not delete.
			// childItem:
			//		Child item to be removed from parents children list.
			// parentItem:
			//		Parent item.
			// childrenAttr:
			// tag:
			//		public

			var listAttr = childrenAttr || this.childrenAttrs[0];
			if (this.store.removeReference(childItem, parentItem, listAttr)){
				// If any children are left get the first and update the parent checked state.
				this.getChildren(parentItem, lang.hitch(this,
					function (children){
						if (children.length) {
							this._updateCheckedParent(children[0]);
						}
					})
				); /* end getChildren() */
			}
		},

		uncheck: function (/*Object|String*/ query, /*Callback*/ onComplete, /*Context*/ scope, /*Boolean?*/ storeOnly) {
			// summary:
			//		Uncheck all store items that match the query and have a checked state.
			// description:
			//		See description _checkOrUncheck()
			//	example:
			//		uncheck({ name: "John" });
			//	| uncheck("John", myCallback, this);
			// tag:
			//		public

			// If in strict checked mode the store is already loaded and therefore no
			// need to fetch the store again.
			if (this.checkedStrict) {
				storeOnly = true;
			}
			this._checkOrUncheck(query, false, onComplete, scope, storeOnly);
		},

		// =======================================================================
		// Misc Private Methods

		_anyToQuery: function (/*String|Object*/ args, /*String?*/ attribute){
			// summary:
			// args:
			//		 Query object, if args is a string it value is assigned to the store
			//		identifier property in the query.
			// attribute:
			//		Optional attribute name.	If specified, the attribute in args to be
			//		used as its identifier. If an external item is dropped on the tree,
			//		the new item may no have the same identifier property as all store
			//		items do.
			// tag:
			//		private

			var identAttr = this.store.getIdentifierAttr();

			if (identAttr){
				var objAttr = attribute ? attribute : identAttr,
						query = {};
				if (lang.isString(args)) {
					query[identAttr] = args;
					return query;
				}
				if (lang.isObject(args)){
					lang.mixin( query, args );
					if (args[objAttr]) {
						query[identAttr] = args[objAttr]
					}
					return query;
				}
			}
			return null;
		},

		_getFuncNames: function (/*String*/ prefix, /*String*/ name) {
			// summary:
			//		Helper function for the get() and set() methods. Returns the function names
			//		in lowerCamelCase for the get and set functions associated with the 'name'
			//		property.
			// name:
			//		Attribute name.
			// tags:
			//		private

			if (lang.isString(name)) {
				var cc = name.replace(/^[a-z]|-[a-zA-Z]/g, function (c){ return c.charAt(c.length-1).toUpperCase(); });
				var fncSet = { set: "_"+prefix+cc+"Setter", get: "_"+prefix+cc+"Getter" };
				return fncSet;
			}
			throw new Error(this.moduleName+"::_getFuncNames(): get"+prefix+"/set"+prefix+" attribute name must be of type string.");
		}

	});	/* end lang.extend() */

});	/* end define() */

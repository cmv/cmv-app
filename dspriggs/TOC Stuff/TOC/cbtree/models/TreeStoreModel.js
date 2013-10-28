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
	"dojo/_base/array",	  // array.filter array.forEach array.indexOf array.some
	"dojo/_base/declare", // declare
	"dojo/_base/lang",		// lang.hitch
	"dojo/aspect",				// aspect.after
	"dojo/has",						// has.add
	"dojo/json",					// json.stringify
	"dojo/Stateful",			// get() and set()
	"./ItemWriteStoreEX"	// ItemFileWriteStore extensions.
], function(array, declare, lang, aspect, has, json, Stateful, ItemWriteStoreEX){

		// module:
		//		cbtree/models/TreeStoreModel
		// summary:
		//		Implements cbtree.models.model connecting to a dojo.data store with a
		//		single root item.

	return declare([Stateful], {

		//==============================
		// Parameters to constructor

		// checkedAll: Boolean
		//		If true, every store item will receive a 'checked' state property regard-
		//		less if the 'checked' attribute is specified in the dojo.data.store
		checkedAll: true,

		// checkedState: Boolean
		//		The default state applied to every store item unless otherwise specified
		//		in the dojo.data.store (see also: checkedAttr)
		checkedState: false,

		// checkedRoot: Boolean
		//		If true, the root node will receive a checked state eventhough it's not
		//		a true entry in the store. This attribute is independent of the showRoot
		//		attribute of the tree itself. If the tree attribute 'showRoot' is set to
		//		false the checked state for the root will not show either.
		checkedRoot: false,

		// checkedStrict: Boolean
		//		If true, a strict parent-child relation is maintained. For example,
		//		if all children are checked the parent will automatically recieve the
		//		same checked state or if any of the children are unchecked the parent
		//		will, depending if multi state is enabled, recieve either a mixed or
		//		unchecked state.
		//		If set to true it overwrites deferItemLoadingUntilExpand.
		checkedStrict: true,

		// checkedAttr: String
		//		The attribute name (property of the store item) that holds the 'checked'
		//		state. On load it specifies the store items initial checked state.	 For
		//		example: { name:'Egypt', type:'country', checked: true } If a store item
		//		has no 'checked' attribute specified it will depend on the model property
		//		'checkedAll' if one will be created automatically and if so, its initial
		//		state will be set as specified by 'checkedState'.
		checkedAttr: "checked",

		// childrenAttrs: String[]
		//		One or more attribute names (attributes in the dojo.data item) that specify
		//		that item's children
		childrenAttrs: ["children"],

		// deferItemLoadingUntilExpand: Boolean
		//		Setting this to true will cause the TreeStoreModel to defer calling loadItem
		//		on nodes until they are expanded. This allows for lazying loading where only
		//		one loadItem (and generally one network call, consequently) per expansion
		//		(rather than one for each child).
		//		This relies on partial loading of the children items; each children item of a
		//		fully loaded item should contain the label and info about having children.
		deferItemLoadingUntilExpand: false,

		// enabledAttr: String (1.8)
		//		The attribute name (property of the store item) that holds the 'enabled'
		//		state of the checkbox or alternative widget.
		//		Note: Eventhough it is referred to as the 'enabled' state the tree will
		//		only use this property to enable/disable the 'ReadOnly' property of a
		//		checkbox. This because disabling a widget may exclude it from HTTP POST
		//		operations.
		enabledAttr:"",

		// excludeChildrenAttrs: String[]
		//		If multiple childrenAttrs have been specified excludeChildrenAttrs determines
		//		which of those childrenAttrs are excluded from: a) getting a checked state.
		//		b) compiling the composite state of a parent item.
		excludeChildrenAttrs: null,

		// iconAttr: String
		//		If specified, get the icon from an item using this attribute name.
		iconAttr: "",

		// labelAttr: String
		//		If specified, get label for tree node from this attribute, rather
		//		than by calling store.getLabel()
		labelAttr: "",

		// multiState: Boolean
		//		Determines if the checked state needs to be maintained as multi state or
		//		or as a dual state. ({"mixed",true,false} vs {true,false}).
		multiState: true,

		// newItemIdAttr: String
		//		Name of attribute in the Object passed to newItem() that specifies the id.
		//
		//		If newItemIdAttr is set then it's used when newItem() is called to see if an
		//		item with the same id already exists, and if so just links to the old item
		//		(so that the old item ends up with two parents).
		//
		//		Setting this to null or "" will make every drop create a new item.
		newItemIdAttr: "id",

		// normalize: Boolean
		//		When true, the checked state of any non branch checkbox is normalized, that
		//		is, true or false. When normalization is enabled checkboxes associated with
		//		tree leafs can never have a mixed state.
		normalize: true,

		// query: String
		//		Specifies the set of children of the root item.
		// example:
		//		{type:'continent'}
		query: null,

		// store: dojo.data.Store
		//		Underlying store
		store: null,

		// End Parameters to constructor
		//==============================

		moduleName: "cbTree/models/TreeStoreModel",

		// hasFakeRoot: Boolean
		//		Indicates if the model has a fabricated root item. (this is not a constructor
		//		parameter).	Typically set by models like the ForestStoreModel.
		hasFakeRoot: false,

		 // root: [readonly] dojo.data.item
		//		Pointer to the root item (read only, not a parameter)
		root: null,

		// _checkedChildrenAttrs: string[]
		//		The list of childrenAttrs to be included in any of the checked state operations.
		//		Only store items which are a member of any of the _checkedChildrenAttrs will get
		//		a checked state and are included in compiling the composite parent state.
		//		_checkedChildrenAttrs is defined as (childrenAttrs - excludeChildrenAttrs)
		_checkedChildrenAttrs: null,

		// _queryAttrs: String[]
		//		A list of attribute names included in the query. The list is used to determine
		//		if a re-query of the store is required after a property of a store item has
		//		changed value.
		_queryAttrs: [],

		// _validateStore: Boolean
		_validateStore: true,

		// _validating: [private] Number
		//		If not equal to zero it indicates store validation is on going.
		_validating: 0,

		constructor: function(/* Object */ args){
			// summary:
			//		Passed the arguments listed above (store, etc)
			// tags:
			//		private

			declare.safeMixin(this, args);

			this.connects = [];

			var store = this.store;

			if(!store.getFeatures()['dojo.data.api.Identity']){
				throw new Error(this.moduleName+"constructor(): store must support dojo.data.Identity");
			}

			has.add("tree-model-getChecked", 1);
			if (!store.getFeatures()['dojo.data.api.Write']){
				console.warn(this.moduleName+"::constructor(): store is not write enabled.");
				this._writeEnabled = false;
			} else {
				has.add("tree-model-setChecked", 1);
				this._writeEnabled = true;
			}

			// if the store supports Notification, subscribe to the notification events
			if(store.getFeatures()['dojo.data.api.Notification']){
				this.connects = this.connects.concat([
					aspect.after(store, "onLoad", lang.hitch(this, "onStoreLoaded"), true),
					aspect.after(store, "onNew", lang.hitch(this, "onNewItem"), true),
					aspect.after(store, "onDelete", lang.hitch(this, "onDeleteItem"), true),
					aspect.after(store, "onSet", lang.hitch(this, "onSetItem"), true),
					aspect.after(store, "onRoot", lang.hitch(this, "onRootChange"), true)
				]);
			}
			this._checkedChildrenAttrs = this._diffArrays( this.childrenAttrs, this.excludeChildrenAttrs );
			// Compose a list of attribute names included in the store query.
			if (this.query) {
				var attr;
				for (attr in this.query) {
					this._queryAttrs.push(attr);
				}
			}
			dojo.deprecated("{cbtree/models/TreeStoreModel}", "Migrate to the new models in cbtree/model/", "2.0");
		},

		destroy: function(){
			var h;
			while(h = this.connects.pop()){ h.remove(); }
			// TODO: should cancel any in-progress processing of getRoot(), getChildren()

			this.store = null;
		},

		// =======================================================================
		// Model getters and setters (See dojo/Stateful)

		_checkedStrictSetter: function (value){
			// summary:
			//		Hook for the set("checkedStrict",value) calls. Note: A full store
			//		re-evaluation is only kicked off when the current value is false
			//		and the new value is true.
			// value:
			//		New value applied to 'checkedStrict'. Any value is converted to a boolean.
			// tag:
			//		private

			value = value ? true : false;
			if (this.checkedStrict !== value) {
				this.checkedStrict = value;
				if (this.checkedStrict) {
					this.getRoot( lang.hitch(this, function (rootItem) {
							this.getChildren(rootItem, lang.hitch(this, function(children) {
									this._validateChildren(rootItem, children);
								}))
						}))
				}
			}
			return this.checkedStrict;
		},

		_enabledAttrSetter: function (/*String*/ value) {
			// summary:
			//		Set the enabledAttr property. This method is the hook for set("enabledAttr", ...)
			//		The enabledAttr value can only be set once during the model instantiation.
			// value:
			//		New enabledAttr value.
			// tags:
			//		private

			if (lang.isString(value)) {
				if (this.enabledAttr !== value) {
					throw new Error(this.moduleName+"::set(): enabledAttr property is read-only.");
				}
			} else {
				throw new Error(this.moduleName+"::set(): enabledAttr value must be a string");
			}
			return this.enabledAttr;
		},

		_labelAttrGetter: function() {
			// summary:
			//		Return the label attribute associated with the store, if available.
			//		This method is the hook for get("labelAttr");
			// tag:
			//		private

			return this.getLabelAttr();
		},

		_labelAttrSetter: function (/*String*/ value) {
			// summary:
			//		Set the labelAttr property. This method is the hook for set("labelAttr", ...)
			// value:
			//		New labelAttr value.
			// tags:
			//		private

			return this.setLabelAttr(value);
		},

		_querySetter: function (value) {
			// summary:
			//		Hook for the set("query",value) calls.
			// value:
			//		New query object.
			// tag:
			//		private

			if (lang.isObject(value)){
				if (this.query !== value){
					this.query = value;
					this._requeryTop();
				}
				return this.query;
			} else {
				throw new Error(this.moduleName+"::set(): query argument must be of type object");
			}
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getChildren: function(/*dojo.data.item*/ parentItem, /*Function*/ onComplete, /*Function*/ onError,
													 /*String[]?*/ childrenLists ){
			// summary:
			//		 Calls onComplete() with array of child items of given parent item,
			//		all loaded.
			// parentItem:
			//		dojo.data.item.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argument.
			// onError:
			//		Callback function, called in case an error occurred.
			// childrenLists:
			//		Specifies the childrens list(s) from which the children are retrieved.
			//		If ommitted, childrenAttrs is used instead returning all children.
			// tags:
			//		public

			var store = this.store;
			var scope = this;

			if(!store.isItemLoaded(parentItem)){
				// The parent is not loaded yet, we must be in deferItemLoadingUntilExpand
				// mode, so we will load it and just return the children (without loading each
				// child item)
				var getChildren = lang.hitch(this, arguments.callee);
				store.loadItem( scope._mixinFetch(
					{
						item: parentItem,
						onItem: function(parentItem) {
											getChildren(parentItem, onComplete, onError);
										},
						onError: onError
					})
				);
				return;
			}
			// get children of specified item
			var childItems = [], vals, i;
			if (!childrenLists) {
				for(i=0; i<this.childrenAttrs.length; i++){
					vals = store.getValues(parentItem, this.childrenAttrs[i]);
					childItems = childItems.concat(vals);
				}
			}
			else // Get children from specfied list(s) only.
			{
				var lists = lang.isArray(childrenLists) ? childrenLists : [childrenLists];
				for(i=0; i<lists.length; i++){
					vals = store.getValues(parentItem, lists[i]);
					childItems = childItems.concat(vals);
				}
			}
			// count how many items need to be loaded
			var _waitCount = 0;
			if(!this.deferItemLoadingUntilExpand){
				array.forEach(childItems, function(item){ if(!store.isItemLoaded(item)){ _waitCount++; } });
			}

			if(_waitCount == 0){
				// all items are already loaded (or we aren't loading them).	proceed...
				onComplete(childItems);
			}else{
				// still waiting for some or all of the items to load
				array.forEach(childItems, function(item, idx){
					if (!store.isItemLoaded(item)) {
						store.loadItem( scope._mixinFetch(
							{
								item: item,
								onItem: function(item){
									childItems[idx] = item;
									if(--_waitCount == 0){
										// all nodes have been loaded, send them to the tree
										onComplete(childItems);
									}
								},
								onError: onError
							} )
						);
					}
				});
			}
		},

		getParents: function (/*dojo.data.item*/ storeItem) {
			// summary:
			//		Get the parent(s) of a store item.
			// storeItem:
			//		The dojo.data.item whose parent(s) will be returned.
			// tags:
			//		private
			if (storeItem) {
				return this.store.getParents(storeItem);
			}
		},

		getRoot: function(/*Function*/ onItem, /*Function*/ onError){
			// summary:
			//		Calls onItem with the root item for the tree, possibly a fabricated item.
			//		Calls onError on error.
			// onItem:
			//		Function called with the root item for the tree.
			// onError:
			//		Function called in case an error occurred.

			if(this.root){
				onItem(this.root);
			}else{
				this.store.fetch( this._mixinFetch(
					{
						query: this.query,
						onComplete: lang.hitch(this, function(items){
							if(items.length != 1){
								throw new Error(this.moduleName + ": query " + json.stringify(this.query) + " returned " + items.length +
									 " items, but must return exactly one item");
							}
							this.root = items[0];
							onItem(this.root);
						}),
						onError: onError
					})
				);
			}
		},

		mayHaveChildren: function(/*dojo.data.item*/ item){
			// summary:
			//		Tells if an item has or may have children.	Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have children.
			//		(For efficiency reasons we may not want to check if an element actually
			//		has children until user clicks the expando node)
			// item:
			//		dojo.data.item.
			// tags:
			//		public

			return array.some(this.childrenAttrs, function(attr){
				return this.store.hasAttribute(item, attr);
			}, this);
		},

		// =======================================================================
		// Private Checked state handling

		_getCompositeState: function (/*dojo.data.item[]*/ children) {
			// summary:
			//		Compile the composite state based on the checked state of a group
			//		of children.	If any child has a mixed state, the composite state
			//		will always be mixed, on the other hand, if none of the children
			//		has a checked state the composite state will be undefined.
			// children:
			//		Array of dojo.data items
			// tags:
			//		private

			var hasChecked	 = false,
					hasUnchecked = false,
					isMixed			= false,
					newState,
					state;

			array.some(children, function (child) {
				state = this.getChecked(child);
				isMixed |= (state == "mixed");
				switch(state) {	// ignore 'undefined' state
					case true:
						hasChecked = true;
						break;
					case false:
						hasUnchecked = true;
						break;
				}
				return isMixed;
			}, this);
			// At least one checked/unchecked required to change parent state.
			if (isMixed || hasChecked || hasUnchecked) {
				isMixed |= !(hasChecked ^ hasUnchecked);
				newState = (isMixed ? "mixed" : hasChecked ? true: false);
			}
			return newState;
		},

		_normalizeState: function (/*dojo.data.item*/ storeItem, /*Boolean|String*/ state) {
			// summary:
			//		Normalize the checked state value so we don't store an invalid state
			//		for a store item.
			//	storeItem:
			//		The store item whose checked state is normalized.
			//	state:
			//		The checked state: 'mixed', true or false.
			// tags:
			//		private

			if (typeof state == "boolean") {
				return state;
			}
			if (this.multiState && state == "mixed") {
				if (this.normalize && !this.mayHaveChildren(storeItem)){
						return true;
				}
				return state;
			}
			return state ? true : false;
		},

		_setChecked: function (/*dojo.data.item*/ storeItem, /*Boolean|String*/ newState) {
			// summary:
			//		Set/update the checked state on the dojo.data store. Returns true if
			//		the checked state changed otherwise false.
			// description:
			//		Set/update the checked state on the dojo.data.store.	Retreive the
			//		current checked state	and validate if an update is required, this
			//		will keep store updates to a minimum. If the current checked state
			//		is undefined (ie: no checked attribute specified in the store) the
			//		'checkedAll' attribute is tested to see if a checked state needs to
			//		be created.	In case of the root node the 'checkedRoot' attribute
			//		is checked.
			//
			//		NOTE: The store.setValue() method will add the attribute for the
			//					item if none exists.
			//
			//	storeItem:
			//		The item in the dojo.data.store whose checked state is updated.
			//	newState:
			//		The new checked state: 'mixed', true or false.
			//	tag:
			//		private

			var forceUpdate = false,
					normState;

			normState		= this._normalizeState(storeItem, newState);
			forceUpdate = (normState != newState);
			if (this.store.isItem(storeItem)) {
				var currState = this.store.getValue(storeItem, this.checkedAttr);
				if ((currState !== undefined || this.checkedAll) && (currState != normState || forceUpdate)) {
					this.store.setValue(storeItem, this.checkedAttr, normState);
					return true;
				}
			}
			else // Test for fabricated root.
			{
				if (storeItem === this.root && this.hasFakeRoot) {
					if (this.checkedRoot && ((this.root[this.checkedAttr] != normState) || forceUpdate)) {
						this.root[this.checkedAttr] = normState;
						this.onChange(storeItem, this.checkedAttr, normState);
						return true;
					}
				} else {
					throw new TypeError(this.moduleName+"::_setChecked(): invalid item specified.");
				}
			}
			return false;
		},

		_updateCheckedChild: function (/*dojo.data.item*/ storeItem, /*Boolean*/ newState) {
			//	summary:
			//		Set the parent (the storeItem) and all childrens states to true/false.
			//	description:
			//		If a parent checked state changed, all child and grandchild states are
			//		updated to reflect the change. For example, if the parent state is set
			//		to true, all child and grandchild states will receive that same 'true'
			//		state.
			//
			//	storeItem:
			//		The parent store item whose child/grandchild states require updating.
			//	newState:
			//		The new checked state.
			//	tag:
			//		private

			// Set the (maybe) parent first. The order in which any child checked states
			// are set is important to optimize _updateCheckedParent() performance.
			this._setChecked(storeItem, newState);

			if (this.mayHaveChildren(storeItem)) {
				this.getChildren(storeItem, lang.hitch(this,
						function (children) {
							array.forEach(children, function (child) {
									this._updateCheckedChild(child, newState);
								},
							this
							);
						}
					), // end hitch()
					this.onError,
					this._checkedChildrenAttrs); // end getChildren()
			}
		},

		_updateCheckedParent: function (/*dojo.data.item*/ storeItem, /*Boolean*/ forceUpdate) {
			//	summary:
			//		Update the parent checked state according to the state of all its
			//		children checked states.
			//	storeItem:
			//		The store item (child) whose parent state requires updating.
			//	forceUpdate:
			//		Force an update of the parent(s) regardless of the current checked
			//		state of the child.
			//	tag:
			//		private

			if (!this.checkedStrict || !storeItem) {
				return;
			}
			var parents		= this.getParents(storeItem),
					childState = this.getChecked(storeItem),
					newState;

			array.forEach(parents, function (parentItem) {
				// Test if the storeItem is actually a child in the context of this model.
				// The child may have been added to a different childrens list in another
				// model.
				if( this.isChildOf(parentItem, storeItem)) {
					// Only process a parent update if the current child state differs from
					// its parent otherwise the parent is already up-to-date.
					if ((childState !== this.getChecked(parentItem)) || forceUpdate) {
						this.getChildren(parentItem, lang.hitch(this,
							function (children) {
								newState = this._getCompositeState(children);
								if(newState !== undefined) {
									this._setChecked(parentItem, newState);
								}
							}),
							this.onError,
							this._checkedChildrenAttrs); /* end getChildren() */
					}
				}
			}, this); /* end forEach() */
		},

		_validateChildren: function ( parent, children, childrenLists) {
			// summary:
			//		Validate/normalize the parent(s) checked state in the dojo.data store.
			// description:
			//		All parent checked states are set to the appropriate state according to
			//		the actual state(s) of their children. This will potentionally overwrite
			//		whatever was specified for the parent in the dojo.data store. This will
			//		garantee the tree is in a consistent state after startup.
			//	parent:
			//		The parent item of children.
			//	children:
			//		Either the tree root or a list of child children
			//	childrenLists:
			//		Array of list attributes to be included in the validation. See definition
			//		of _checkedChildrenAttrs for details.
			//	tag:
			//		private

			var children,	currState, newState;
			this._validating += 1;

			children	= lang.isArray(children) ? children : [children];
			array.forEach(children,
				function (child) {
					if (this.mayHaveChildren(child)) {
						this.getChildren( child, lang.hitch(this, function(children) {
								this._validateChildren( child, children, childrenLists);
							}),
							this.onError,
							childrenLists);
					} else {
						currState = this.getChecked(child);
						if (currState && typeof currState !== "boolean") {
							child[this.checkedAttr] = [this._normalizeState(child, currState)];
						}
					}
				},
				this
			);
			newState	= this._getCompositeState(children);
			currState = this.getChecked(parent);

			if (currState !== undefined && newState !== undefined) {
				this._setChecked(parent, newState);
			}

			// If the validation count drops to zero we're done.
			this._validating -= 1;
			if (!this._validating) {
				this.store.setValidated(true);
				this.onDataValidated();
			}
		},

		// =======================================================================
		// Checked and Enabled state

		getChecked: function (/*dojo.data.item*/ storeItem) {
			// summary:
			//		Get the current checked state from the data store for the specified item.
			// description:
			//		Get the current checked state from the dojo.data store. The checked state
			//		in the store can be: 'mixed', true, false or undefined. Undefined in this
			//		context means no checked identifier (checkedAttr) was found in the store
			//		Depending on the checked attributes as specified above the following will
			//		take place:
			//
			//		a)	If the current checked state is undefined and the checked attribute
			//				'checkedAll' or 'checkedRoot' is true one will be created and the
			//				default state 'checkedState' will be applied.
			//		b)	If the current state is undefined and 'checkedAll' is false the state
			//				undefined remains unchanged and is returned. This will prevent a tree
			//				node from creating a checkbox or other widget.
			//
			// storeItem:
			//		The item in the dojo.data.store whose checked state is returned.
			// tag:
			//		private

			var checked;

			if (this.excludeChildrenAttrs) {
				if (this.isMemberOf(storeItem, this.excludeChildrenAttrs)) {
					return;
				}
			}
			if (this.store.isItem(storeItem)) {
				checked = this.store.getValue(storeItem, this.checkedAttr);
				if (checked === undefined)
				{
					if (this.checkedAll) {
						this._setChecked(storeItem, this.checkedState);
						return this.checkedState;
					}
				}
			}
			else // Test for fabricated root.
			{
				if (storeItem === this.root && this.hasFakeRoot) {
					if (this.checkedRoot) {
						return this.root[this.checkedAttr];
					}
				} else {
					throw new TypeError(this.moduleName+"::getChecked(): invalid item specified.");
				}
			}
			return checked;	// the current checked state (true/false or undefined)
		},

		getEnabled: function (/*item*/ item) {
			// summary:
			//		Returns the current 'enabled' state of an item as a boolean.
			// item:
			//		Store or root item
			// tag:
			//		Public
			var enabled = true;

			if (this.enabledAttr) {
				if (this.store.isItem(item)) {
					enabled = this.store.getValue(item, this.enabledAttr);
				} else {
					if (item === this.root) {
						enabled = item[this.enabledAttr];
					} else {
						throw new TypeError(this.moduleName+"::getEnabled(): invalid item specified.");
					}
				}
			}
			return (enabled === undefined) || Boolean(enabled);
		},

		getItemState: function (/*item*/ item) {
			// summary:
			//		Returns the state of a item, the state is an object with two properies:
			//		'checked' and 'enabled'.
			// item:
			//		The store or root item.
			// tag:
			//		Public
			return { checked: this.getChecked(item),
								enabled: this.getEnabled(item) };
		},

		setChecked: function (/*dojo.data.item*/ storeItem, /*Boolean*/ newState) {
			// summary:
			//		Update the checked state for the store item and the associated parents
			//		and children, if any.
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

			if (!this.checkedStrict) {
				this._setChecked(storeItem, newState);		// Just update the checked state
			} else {
				this._updateCheckedChild(storeItem, newState); // Update children and parent(s).
			}
		},

		setEnabled: function (/*item*/ item, /*Boolean*/ value) {
			// summary:
			//		Sets the new 'enabled' state of an item.
			// item:
			//		Store or root item
			// tag:
			//		Public
			if (this.enabledAttr) {
				if (this.store.isItem(item)) {
					return this.store.setValue(item, this.enabledAttr, Boolean(value));
				} else {
					if (item === this.root) {
						return this.root[this.enabledAttr] = Boolean(value);
					} else {
						throw new TypeError(this.moduleName+"::setEnabled(): invalid item specified.");
					}
				}
			}
		},

		validateData: function () {
			// summary:
			//		Validate/normalize the parent-child checked state relationship. If the
			//		attribute 'checkedStrict' is true this method is called as part of the
			//		post creation of the Tree instance.	First we try a forced synchronous
			//		load of the Json dataObject dramatically improving the startup time.
			//	tag:
			//		private

			if (this.checkedStrict) {
				// In case multiple models operate on the same store, the store may have
				// already been validated.
				if (!this.store.isValidated()) {
					// Force a store load.
					this.store.loadStore( {
						onComplete: function (count) {
													if (has("tree-model-setChecked")) {
														if (this._validateStore) {
															this.getRoot( lang.hitch(this, function (rootItem) {
																	this.getChildren(rootItem, lang.hitch(this, function(children) {
																			this._validateChildren(rootItem, children, this._checkedChildrenAttrs);
																		}), this.onError)
																}), this.onError)
														}
													} else {
														console.warn(this.moduleName+"::validateData(): store is not write enabled.");
													}
												},
						onError: function (err) {},
						scope: this
					});
				}
				else	// Store already validated.
				{
					if (this.hasFakeRoot) {
						// Make sure the fabricated root gets updated.
						this.getChildren(this.root, lang.hitch(this, function (children){
							this._updateCheckedParent(children[0], true);
						}), this.onError, this._checkedChildrenAttrs);
					}
					this.onDataValidated();
				}
			}
			else
			{
				this.store.setValidated(false);
			}
		},

		// =======================================================================
		// Inspecting items

		fetchItemByIdentity: function(/*object*/ keywordArgs){
			// summary:
			//		Fetch a store item by identity
			this.store.fetchItemByIdentity(keywordArgs);
		},

		getIcon: function(/*item*/ item){
			// summary:
			//		Get the icon for item from the store if the iconAttr property of the
			//		model is set.
			// item:
			//		A valid dojo.data.store item.

			if (this.iconAttr) {
				return this.store.getValue(item, this.iconAttr);
			}
		},

		getIdentity: function(/*item*/ item){
			return this.store.getIdentity(item);	// Object
		},

		getLabel: function(/*dojo.data.item*/ item){
			// summary:
			//		Get the label for an item
			if(this.labelAttr){
				return this.store.getValue(item,this.labelAttr);	// String
			}else{
				this.setLabelAttr(this.getLabelAttr());
				return this.store.getLabel(item);	// String
			}
		},

		isItem: function(/*anything*/ something){
			return this.store.isItem(something);	// Boolean
		},

		isTreeRootChild: function (/*dojo.data.item*/ item) {
			// summary:
			//		Returns true if the item is a tree root child.
			if (this.root) {
				return this.isChildOf(this.root, item);
			}
		},

		isChildOf: function (/*dojo.data.item*/ parent,/*dojo.data.item*/ item) {
			// summary:
			//		Returns true if item is a child of parent in the context of this model
			//		otherwise false.
			//
			//		Note: An item may have been added as a child by another model with
			//					a different set of 'childrenAttrs'. Therefore, item may be a
			//					valid child in the other model it does not quarentee it is a
			//					valid child in the context of this model.
			var i;
			for(i=0; i<this.childrenAttrs.length; i++) {
				if (array.indexOf(parent[this.childrenAttrs[i]],item) !== -1) {
					return true;
				}
			}
			return false;
		},

		isMemberOf: function (/*dojo.data.item*/ item, /*string|string[]*/childrenLists ) {
			// summary:
			//		Returns true if the item is a member of any of the childrenLists.
			//		(See isChildOf() note)
			if (this.isItem(item)) {
				var parents	= this.getParents(item);
				var lists		= childrenLists ? (lang.isArray(childrenLists) ? childrenLists : [childrenLists]) : [];
				var isMember = false;
				var i;
				array.some(parents, function(parent){
						for (i=0; i<lists.length; i++) {
							if (array.indexOf(parent[lists[i]],item) != -1) {
								return (isMember = true);
							}
						}
					}, this);
			}
			return isMember;
		},

		// =======================================================================
		// Write interface

		deleteItem: function (/*dojo.data.Item*/ storeItem){
			// summary:
			//		Delete a store item.
			// storeItem:
			//		The store item to be delete.
			// tag:
			//		public

			return this.store.deleteItem(storeItem);
		},

		newItem: function (/*dojo.dnd.Item*/ args, /*dojo.data.item*/ parent, /*int?*/ insertIndex, /*String?*/ childrenAttr){
			// summary:
			//		Creates a new item.	 See `dojo.data.api.Write` for details on args.
			//		Used in drag & drop when item from external source dropped onto tree
			//		or can be called programmatically.
			//
			//		NOTE: Whenever a parent is specified the underlaying store method
			//					newItem() will NOT create args as a top level item a.k.a a
			//					root item.
			// args:
			//		A javascript object defining the initial content of the item as a set
			//		of JavaScript 'property name: value' pairs.
			// parent:
			//		Optional, a valid store item that will serve as the parent of the new
			//		item.	 If ommitted,	the new item is automatically created as a top
			//		level item in the store. (see also: newReferenceItem())
			// insertIndex:
			//		If specified the location in the parents list of child items.
			// childrenAttr:
			//		If specified the childrens list attribute to which the new item will
			//		be added.	 If ommitted, the first entry in the models childrenAttrs
			//		property is used.

			var pInfo = {parent: parent, attribute: (childrenAttr ? childrenAttr : this.childrenAttrs[0])},
					newItem;

			this._mapIdentifierAttr(args, false);
			try {
				newItem = this.store.itemExist(args);	 // Write store extension...
				if (newItem) {
					this.pasteItem(newItem, null, parent, true, insertIndex);
				} else {
					newItem = this.store.newItem(args, pInfo);
					if (newItem && (insertIndex!=undefined)){
						// Move new item to desired position
						this.pasteItem(newItem, parent, parent, false, insertIndex);
					}
				}
			} catch(err) {
				throw new Error(this.moduleName+"::newItem(): " + err);
			}
			return newItem;
		},

		pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem, /*Boolean*/ bCopy,
												 /*int?*/ insertIndex, /*String?*/ childrenAttr){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop
			var parentAttr = childrenAttr ? childrenAttr : this.childrenAttrs[0],	// name of "children" attr in parent item
					store = this.store,
					firstChild;

			// remove child from source item, and record the attribute that child occurred in
			if(oldParentItem){
				array.forEach(this.childrenAttrs, function(attr){
					if(store.containsValue(oldParentItem, attr, childItem)){
						if(!bCopy){
							store.removeReference(childItem, oldParentItem, attr);
						}
						parentAttr = attr;
					}
				}, this);
			}
			// modify target item's children attribute to include this item
			if(newParentItem){
				store.addReference(childItem, newParentItem, parentAttr, insertIndex);
			}
		},

		// =======================================================================
		// Label Attribute

		getLabelAttr: function () {
			// summary:
			//		Returns the labelAttr property.
			// tags:
			//		public
			if (!this.labelAttr) {
				var labels = this.store.getLabelAttributes();
				if (labels) {
					this.setLabelAttr(labels[0]);
				}
			}
			return this.labelAttr;
		},

		setLabelAttr: function (/*String*/ newValue) {
			// summary:
			//		Set the labelAttr property.
			// newValue:
			//		New labelAttr newValue.
			// tags:
			//		public
			if (lang.isString(newValue) && newValue.length) {
				if (this.labelAttr !== newValue) {
					var oldValue	 = this.labelAttr;
					this.labelAttr = newValue;
					// Signal the event.
					this.onLabelChange(oldValue, newValue);
				}
				return this.labelAttr;
			}
		},

		// =======================================================================
		// Callbacks

		onChange: function(/*===== item, attribute, newValue =====*/){
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.	 Note that changes
			//		to an item's children or parent(s) will trigger an
			//		onChildrenChange() so you can ignore those changes here.
			// tags:
			//		callback
		},

		onChildrenChange: function(/*===== parent, newChildrenList =====*/){
			// summary:
			//		Callback to do notifications about new, updated, or deleted items.
			// parent: dojo.data.item
			// newChildrenList: dojo.data.item[]
			// tags:
			//		callback
		},

		onDataValidated: function(){
			// summary:
			//		Callback when store validation completion. Only called if strict
			//		parent-child relationship is enabled.
			// tag:
			//		callback
		},

		onDelete: function(/*===== item =====*/){
			// summary:
			//		Callback when an item has been deleted.
			// description:
			//		Note that there will also be an onChildrenChange() callback for the parent
			//		of this item.
			// tags:
			//		callback
//			this.store.save();
		},

		onLabelChange: function (/*===== oldValue, newValue =====*/){
			// summary:
			//		Callback when label attribute property changed.
			// tags:
			//		callback
		},

		// =======================================================================
		// Events from data store

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
			if(parentInfo) {
				this.getChildren(parentInfo.item, lang.hitch(this, function(children){
					this.onChildrenChange(parentInfo.item, children);
				}));
			}
			this._updateCheckedParent(item, true);
		},

		onDeleteItem: function (/*dojo.data.item*/ storeItem){
			// summary:
			//		Handler for delete notifications from the store.
			// storeItem:
			//		The store item that was deleted.

			this.onDelete(storeItem);
		},

		onError: function (/*Object*/ err) {
			// summary:
			//		Callback when an error occurred.
			// tags:
			//		callback
			console.error(this, err);
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

			if (array.indexOf(this.childrenAttrs, attribute) != -1){
				// Store item's children list changed
				this.getChildren(storeItem, lang.hitch(this, function (children){
					// See comments in onNewItem() about calling getChildren()
					if (children[0]) {
						this._updateCheckedParent(children[0], true);
					} else {
						// If no children left, set the default checked state.
						this._setChecked( storeItem, this.checkedState);
					}
					this.onChildrenChange(storeItem, children);
				}));
			}else{
				// If the attribute is the attribute associated with the checked state
				// go update the store items parent.
				if (attribute == this.checkedAttr) {
					this._updateCheckedParent(storeItem, false);
				}
				this.onChange(storeItem, attribute, newValue);
			}
		},

		onStoreLoaded: function( count ) {
			// summary:
			//		Update the current labelAttr property by fetching it from the store.
			// tag:
			//		callback

			this.getLabelAttr();
		},

		onRootChange: function (/*dojo.data.item*/ storeItem, /*String*/ action) {
			// summary:
			//		Handler for any changes to the stores top level items.
			// description:
			//		Users can extend this method to modify a new element that's being
			//		added to the root of the tree, for example to make sure the new item
			//		matches the tree root query. Remember, even though the item is added
			//		as a top level item in the store it does not quarentee it will match
			//		your tree query unless your query is simply the store identifier.
			//		Therefore, in case of a store root detach event (evt.detach=true) we
			//		only require if the item is a known child of the tree root.
			// storeItem:
			//		The store item that was attached to, or detached from, the root.
			// action:
			//		String detailing the type of event: "new", "delete", "attach" or
			//		"detach"
			// tag:
			//		callback
		},

		// =======================================================================
		// Misc helper functions

		_mapIdentifierAttr: function (/*Object*/ args, /*Boolean?*/ delMappedAttr) {
			// summary:
			//		Map the 'newItemIdAttr' property of a new item to the store identifier
			//		attribute. Return true if the mapping was made.
			// description:
			//		If a store has an identifier attribute defined each new item MUST have
			//		at least that same attribute defined otherwise the store will reject
			//		the item to be inserted. This method handles the conversion from the
			//		'newItemIdAttr' to the store required identifier attribute.
			// args:
			//		Object defining the new item properties.
			// delMappedAttr:
			//		If true, it determines when a mapping was made, if the mapped attribute
			//		is to be removed from the new item properties.
			// tags:
			//		private

			var identifierAttr = this.store.getIdentifierAttr();

			if (identifierAttr) {
				if (!args[identifierAttr] && (this.newItemIdAttr && args[this.newItemIdAttr])) {
					args[identifierAttr] = args[this.newItemIdAttr];
					if (delMappedAttr) {
						delete args[this.newItemIdAttr];
					}
					return true;
				}
			}
			// Check if checked state needs adding.
			if (this.checkedAll && args[this.checkedAttr] === undefined) {
				args[this.checkedAttr] = this.checkedState;
			}
			return false;
		},

		_diffArrays: function (/*array*/ orgArray, /*array*/ elements) {
			// summary:
			//		Returns a new array which is 'orgArray' with all 'elements' removed.
			// tags:
			//		private

			var elemList = elements ? (lang.isArray(elements) ? elements : [elements]) :[];
			var newArray = orgArray.slice(0);
			var index, i;

			if (newArray.length && elemList.length) {
				for(i=0; i<elemList.length; i++) {
					index = array.indexOf(newArray, elemList[i]);
					if (index != -1) {
						newArray.splice(index,1);
					}
				}
			}
			return newArray;
		},

		_mixinFetch: function (/*object*/ fetchArgs ) {
			// summary:
			//		Any model that inherits from this model (TreeStoreModel) and requires
			//		additional parameters to be passed in a store fetch(), loadStore() or
			//		loadItem() call must overwrite this method.
			return fetchArgs;
		}

	});
});

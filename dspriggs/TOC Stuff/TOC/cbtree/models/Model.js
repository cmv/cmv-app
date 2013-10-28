
/*=====
declare("cbtree.models.model", null,
{
	// summary:
	//		Contract for any data provider object for the Dijit CheckBox Tree.
	// description:
	//		Tree passes in values to the constructor to specify the callbacks.
	//		In a store implementation "item" is typically a dojo.data.Item but
	//		it's just a black box so it could be anything. The generic type of
	//		an item is therefore referred to as 'data.Item'
	//
	//		This (like `dojo.data.api.Read`) is just documentation, and not
	//		meant to be used.

	destroy: function(){
		// summary:
		//		Destroys this object, releasing connections to the store
		// tags:
		//		public
	},

	// =======================================================================
	// Methods for traversing hierarchy

	getChildren: function(parentItem, onComplete){
		// summary:
		// 		Calls onComplete() with array of child items of given parent item, all loaded.
		//		Throws exception on error.
		// parentItem: data.Item
		// onComplete: function(items)
		// tags:
		//		public
	},

	getRoot: function(onItem){
		// summary:
		//		Calls onItem with the root item for the tree, possibly a fabricated item.
		//		Throws exception on error.
		// onItem: function(item)
		// tags:
		//		public
	},

	mayHaveChildren: function(item){
		// summary:
		//		Tells if an item has or may have children.	Implementing logic here
		//		avoids showing +/- expando icon for nodes that we know don't have children.
		//		(For efficiency reasons we may not want to check if an element actually
		//		has children until user clicks the expando node)
		// item: data.Item
		// tags:
		//		public
	},

	// =======================================================================
	// Inspecting items

	fetchItemByIdentity: function(keywordArgs){
		// summary:
		//		Given the identity of an item, this method returns the item that has
		//		that identity through the onItem callback.	Conforming implementations
		//		should return null if there is no item with the given identity.
		//		Implementations of fetchItemByIdentity() may sometimes return an item
		//		from a local cache and may sometimes fetch an item from a remote server.
		// tags:
		//		public
	},

	getIdentity: function(item){
		// summary:
		//		Returns identity for an item
		// item: data.Item
		// tags:
		//		public
	},

	getLabel: function(item){
		// summary:
		//		Get the label for an item
		// item: data.Item
		// tags:
		//		public
	},

	getIcon: function(item){
		// summary:
		//		Returns the custom icon for an item if available. This method is only
		//		required when Tree Styling and the iconAttr property of the model are
		//		supported.
		// item: data.Item
		// tags:
		//		public
	},

	isItem: function(something){
		// summary:
		//		Returns true if *something* is an item and came from this model instance.
		//		Returns false if *something* is a literal, an item from another model instance,
		//		or is any object other than an item.
		// tags:
		//		public
	},

	// =======================================================================
	// checked state handling

	getChecked: function (item) {
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
		// item:
		//		The item in the dojo.data.store whose checked state is returned.
		// tag:
		//		public
	},

	setChecked: function (item, newState) {
		// summary:
		//		Update the checked state for the store item and the associated parents
		//		and children, if any.
		// description:
		//		Update the checked state for a single store item and the associated
		//		parent(s) and children, if any. This method is called from the tree if
		//		the user checked/unchecked a checkbox.
		//	item:
		//		The item in the dojo.data.store whose checked state needs updating.
		//	newState:
		//		The new checked state: 'mixed', true or false
		// tags:
		//		public
		},

	validateData: function () {
		// summary:
		//		Validate/normalize the parent-child checked state relationship. This
		//		method is called as part of the post creation of the Tree instance.
		//	tag:
		//		public
		},

	// =======================================================================
	// Write interface

	newItem: function(args, parent, insertIndex, before){
		// summary:
		//		Creates a new item.	 See `dojo.data.api.Write` for details on args.
		// args:
		//		dojo.dnd.Item
		// parent:
		//		Item
		// insertIndex: int?
		// before: boolean?
		// tags:
		//		public
	},

	pasteItem: function(childItem, oldParentItem, newParentItem, bCopy,  insertIndex, before){
		// summary:
		//		Move or copy an item from one parent item to another.
		//		Used in drag & drop.
		//		If oldParentItem is specified and bCopy is false, childItem is removed from oldParentItem.
		//		If newParentItem is specified, childItem is attached to newParentItem.
		// childItem: Item
		// oldParentItem: Item
		// newParentItem: Item
		// bCopy: Boolean
		// insertIndex: int?
		// before: boolean?
		// tags:
		//		public
	},

	// =======================================================================
	// Callbacks

	onChange: function(item, attribute, newValue){
		// summary:
		//		Callback whenever an item has changed, so that Tree can update the label,
		//		icon, etc. Note that changes to an item's children or parent(s) will
		//		trigger an onChildrenChange() so you can ignore those changes here.
		// item: data.Item
		// attribute: string
		// newValue: any type allowed for an object property.
		// tags:
		//		callback
	},

	onChildrenChange: function(parent, newChildrenList){
		// summary:
		//		Callback to do notifications about new, updated, or deleted items.
		// parent: data.Item
		// newChildrenList: data.Item[]
		// tags:
		//		callback
	},

	onDataValidated: function(){
		// summary:
		//		Callback for store validation completion.
		// tag:
		//		callback
	},

	onDelete: function(item){
		// summary:
		//		Callback when an item has been deleted.
		// description:
		//		Note that there will also be an onChildrenChange() callback for the parent
		//		of this item.
		// item: data.Item
		// tags:
		//		callback
	},

	onLabelChange: function (oldValue, newValue){
		// summary:
		//		Callback when label attribute changed.
		// oldValue: string
		// newValue: string
		// tags:
		//		callback
	}

});
=====*/
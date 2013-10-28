define(["dojo/_base/declare"], function (declare) {

	function throwAbstract() {
		throw new TypeError("Abstract method only - implementation required");
	}

	declare(null, {
		// summary:
		//		Declare the CheckBox Tree Model API.
		//
		//		All references to the generic data type 'Item' indicate a JavaScript
		//		key:value pairs object (hash) unless otherwise stated.
		//
		// description:

		destroy: function () {
			// summary:
			//		Destroys this object, releasing connections to the store, delete
			//		any local cache, etc, etc
			// tags:
			//		Public
			throwAbstract();
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getChildren: function (parentItem, onComplete) {
			// summary:
			//		Calls onComplete() with array of child items of given parent item, all loaded.
			//		Throws exception on error.
			// parentItem: Item
			// onComplete: function (items)
			// tags:
			//		Public
			throwAbstract();
		},

		getRoot: function (onItem) {
			// summary:
			//		Calls onItem with the root item for the tree, possibly a fabricated item.
			//		Throws exception on error.
			// onItem: function (item)
			// tags:
			//		Public
			throwAbstract();
		},

		mayHaveChildren: function (item) {
			// summary:
			//		Tells if an item has or may have children. Implementing logic here
			//		avoids showing	+/- expando icon for nodes that we know don't have
			//		children.	 (For efficiency reasons we may not want to check if an
			//		element actually has children until user clicks the expando node)
			// item: Item
			// returns: Boolean
			// tags:
			//		Public
			throwAbstract();
		},

		// =======================================================================
		// Inspecting items

		getEnabled: function (item) {
			// summary:
			//		Returns the current 'enabled' state of an item as a boolean. The state
			//		returned is the value of the checked widget "readOnly" property.
			// item: Item
			// returns: Boolean
			// tag:
			//		Public, Optional
		},

		getIdentity: function (item) {
			// summary:
			//		Returns identity for an item
			// item: Item
			// returns: String | Number
			// tags:
			//		Public
			throwAbstract();
		},

		getLabel: function (item) {
			// summary:
			//		Get the label for an item
			// item: Item
			// returns: String
			// tags:
			//		Public
			throwAbstract();
		},

		getIcon: function (item) {
			// summary:
			//		Returns the custom icon for an item if available. This method is only
			//		required when Tree Styling and the iconAttr property of the model are
			//		supported.
			// item: Item
			// returns: String
			//		A space separated list of css classnames.
			// tags:
			//		Public, Optional
		},

		isItem: function (something) {
			// summary:
			//		Returns true if *something* is an item and came from this model instance.
			//		Returns false if *something* is a literal, an item from another model instance,
			//		or is any object other than an item.
			// Something: Item
			// returns: Boolean
			// tags:
			//		Public
			throwAbstract();
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
			// item: Item
			// returns: Boolean | String
			//		Current checked state: true, false or "mixed"
			// tag:
			//		Public
			throwAbstract();
		},

		setChecked: function (item, newState) {
			// summary:
			//		Update the checked state for the store item and the associated parents
			//		and children, if any.
			// description:
			//		Update the checked state for a single store item and the associated
			//		parent(s) and children, if any. This method is called from the tree if
			//		the user checked/unchecked a checkbox.
			//	item: Item
			//	newState: Boolean | String
			//		The new checked state: true, false or "mixed"
			// tags:
			//		Public
			throwAbstract();
		},

		// =======================================================================
		// Drag-n-Drop support

		newItem: function (args, parent, insertIndex, before) {
			// summary:
			//		Creates a new item. This method is required if tree Drag-n-Drop
			//		functionality is to be supported.
			// args: dojo.dnd.Item
			// parent: Item
			// insertIndex: int?
			// before: Item?
			// tags:
			//		Public, Optional
		},

		pasteItem: function (childItem, oldParentItem, newParentItem, bCopy, insertIndex, before) {
			// summary:
			//		Move or copy an item from one parent item to another. This method
			//		is required if tree Drag-n-Drop functionality is to be supported.
			//
			//		If oldParentItem is specified and bCopy is false, childItem is removed
			//		from oldParentItem.	If newParentItem is specified, childItem is attached
			//		to newParentItem.
			//
			// childItem: Item
			// oldParentItem: Item
			// newParentItem: Item
			// bCopy: Boolean
			// insertIndex: int?
			// before: Item?
			// tags:
			//		Public, Optional
		},

		// =======================================================================
		// Callbacks

		onChange: function (item, property, newValue) {
			// summary:
			//		Callback whenever an item has changed, so that Tree can update the label,
			//		icon, etc. Note that changes to an item's children or parent(s) will
			//		trigger an onChildrenChange() so you can ignore those changes here.
			// item: Item
			// property: String
			// newValue: any type allowed for an object property.
			// tags:
			//		callback
		},

		onChildrenChange: function (parent, newChildrenList) {
			// summary:
			//		Callback to do notifications about new, updated, or deleted items.
			// parent: Item
			// newChildrenList: Object[]
			// tags:
			//		callback
		},

		onDataValidated: function () {
			// summary:
			//		Callback for store validation completion.
			// tag:
			//		callback
		},

		onLabelChange: function (oldValue, newValue) {
			// summary:
			//		Callback when label attribute changed.
			// oldValue: String
			// newValue: String
			// tags:
			//		callback
		},

		// =======================================================================
		// Misc

		toString: function () {
			// returns: String
			//		Returns "[object cbTreeModel]"
			return "[object cbTreeModel]";
		}

	});
});
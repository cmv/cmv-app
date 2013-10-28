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

define(["module",                  // module.id
        "dojo/_base/declare",      // declare()
        "dojo/_base/lang",         // lang.hitch()
        "dojo/Deferred",           // Deferred()
        "dojo/when",               // when()
        "./BaseStoreModel",
        "../../errors/createError!../../errors/CBTErrors.json"
       ], function (module, declare, lang, Deferred, when, BaseStoreModel, createError) {
		// module:
		//		cbtree/model/_base/CheckedStoreModel
		// summary:
		//		The CheckedStoreModel extends the BaseStoreModel with the capability
		//		of maintaining a so called "checked" state on a per store item basis.
		//		This capability is required when you want to create a tree with, for
		//		example: CheckBoxes.

	var CBTError = createError( module.id)		// Create the CBTError type
	
	var undef;

	var CheckedStoreModel = declare([BaseStoreModel], {

		//==============================
		// Keyword arguments (kwArgs) to constructor

		// checkedAll: Boolean
		//		If true, every store item will receive a 'checked' state property regard-
		//		less if the 'checked' property is specified in the dojo.store
		checkedAll: true,

		// checkedAttr: String
		//		The property name of a store object that holds the 'checked' state. On
		//		load it specifies the store items initial checked state.	For example:
		//				{ name:'Egypt', type:'country', checked: true }
		//		If a store item has no 'checked' property specified it will depend on
		//		the model property checkedAll if one will be created automatically and
		//		if so, its initial state will be set as specified by 'checkedState'.
		checkedAttr: "checked",

		// checkedRoot: Boolean
		//		If true, the root node will receive a checked state. This property is
		//		independent of	the showRoot property of the tree itself. If the tree
		//		property showRoot is set to false the checked state for the root will
		//		not show either.
		checkedRoot: false,

		// checkedState: Boolean
		//		The default state applied to every store item unless otherwise specified
		//		in the dojo.store (see also: checkedAttr)
		checkedState: false,

		// checkedStrict: Boolean
		//		If true, a strict parent-child relation is maintained.	 For example,
		//		if all children are checked the parent will automatically recieve the
		//		same checked state or if any of the children are unchecked the parent
		//		will, depending if multi state is enabled, recieve either a mixed or
		//		unchecked state.
		checkedStrict: true,

		// enabledAttr: String
		//		The property name of a store object that holds the 'enabled' state of
		//		the checkbox or alternative widget.
		//		Note: Eventhough it is referred to as the 'enabled' state the tree will
		//		only use this property to enable/disable the 'ReadOnly' property of a
		//		checkbox. This because disabling a widget may exclude it from HTTP POST
		//		operations.
		enabledAttr:"",

		// multiState: Boolean
		//		Determines if the checked state needs to be maintained as multi state
		//		or as a dual state. ({"mixed",true,false} vs {true,false}).
		multiState: true,

		// normalize: Boolean
		//		When true, the checked state of any non branch checkbox is normalized,
		//		that is, true or false.		When normalization is enabled any checkbox
		//		associated with tree leafs can never have a mixed state.
		normalize: true,

		// End Parameters to constructor
		//==============================

		// _validating: Number
		//		If not equal to zero it indicates store validation is in progress.
		_validating: 0,

		// _checkedInherit: Boolean
		//		Indicate if children inherit the checked state from its parent. If the
		//		property "checkedStrict" is true then _checkedInherit will be true by
		//		default.
		_checkedInherit: true,

		// =======================================================================
		// Constructor

		constructor: function (/*Object*/ kwArgs) {
			// summary:
			//		If the model property "checkedStrict" is NOT specified as part of
			//		keyword arguments (kwArgs) explicitly set the property using its
			//		default value.	This will quarentee the validateData() method is
			//		called at least once.
			// kwArgs:
			//		A JavaScript key:value pairs object. The object properties or keys
			//		are defined above.
			// tags:
			//		private

			if (!this._writeEnabled) {
				throw new CBTError( "MethodMissing", "constructor", "Store must be write enabled, no put() supported");
			}

			// Set 'checkedStrict' explicitly so BaseStoreModel.postscript() has the
			// _loadOptions property set.  This because dojo/Stateful isn't called
			// until AFTER BaseStoreModel.postscript().
			
			this.set("checkedStrict", this.checkedStrict);
			if (this.checkedStrict === true) {
				this._loadOptions = {all:true};
			}
			this._validateDefer = new Deferred();
		},

		// =======================================================================
		// Model getters and setters (See dojo/Stateful)

		_checkedAttrSetter: function (name) {
			// summary:
			//		Set the checkedAttr property. The property name must be a string and
			//		can't be a dot separated property name.
			// value:
			//		New checkedAttr value.
			// tags:
			//		private
			if (typeof name == "string") {
				if ( /\./.test(name) ) {
					throw new CBTError( "InvalidType", "set", "checkedAttr can not be a dot separated string");
				}
			} else {
				throw new CBTError( "InvalidType", "set", "checkedAttr value must be a string");
			}
			return this.checkedAttr;
		},
		
		_checkedStrictSetter: function (value) {
			// summary:
			//		Hook for the set("checkedStrict",value) calls. See also constructor().
			// value:
			//		New value applied to 'checkedStrict'.
			// returns:
			//		Boolean, updated "checkedStrict" value.
			// tag:
			//		private

			value = value.toLowerCase ? value.toLowerCase() : !!value;
			this._checkedInherit = true;

			switch (value) {
				case false:
					this._checkedInherit = false;
					break;
				case true:
					break;
				case "inherit":
					value = false;
					break;
				default:
					throw new CBTError( "InvalidType", "set", "invalid checkedStrict value");
			}
			this.checkedStrict = value;
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

			if (typeof value === "string") {
				if (this.enabledAttr !== value) {
					throw new CBTError( "ReadOnly", "set", "property enabledAttr is read-only");
				}
			} else {
				throw new CBTError( "InvalidType", "set", "enabledAttr value must be a string");
			}
			return this.enabledAttr;
		},

		// =======================================================================
		// cbtree/model/Model API methods

		getChecked: function (/*Object*/ storeItem) {
			// summary:
			//		Get the current checked state from the data store for the specified
			//		item.
			// description:
			//		Get the current checked state from the store. The checked state of
			//		an object can be either 'mixed', boolean true or false or undefined.
			//		Undefined in this context means the object does not have the checked
			//		property (checkedAttr).
			//		Depending on the checked state as specified above the following will
			//		take place:
			//
			//		a)	If the current checked state is undefined and the model property
			//				'checkedAll' or 'checkedRoot' is true one will be created and
			//				the default state 'checkedState' will be applied.
			//		b)	If the current state is undefined and model property checkedAll
			//				is false the state 'undefined' is returned. This will prevent a
			//				tree node from creating a checkbox or other widget.
			//
			// storeItem:
			//		The item in the dojo.store whose checked state is returned.
			// returns:
			//		Boolean or string: true, false, "mixed" or undefined
			// tag:
			//		private

			if (storeItem == this.root && !this.checkedRoot) {
				return;
			}
			var checked = storeItem[this.checkedAttr];
			if (checked == undef)
			{
				if (this.checkedAll) {
					this._setChecked(storeItem, this.checkedState);
					return this.checkedState;
				}
			}
			return checked;	// the current checked state (true/false/'mixed' or undefined)
		},

		getEnabled: function (/*Object*/ object) {
			// summary:
			//		Returns the current 'enabled' state of an item as a boolean.
			// item:
			//		Store or root item
			// returns:
			//		Boolean, true or false
			// tag:
			//		Public
			var enabled = true;

			if (this.enabledAttr) {
				enabled = object[this.enabledAttr];
			}
			return (enabled == undef) || !!enabled;
		},

		setChecked: function (/*Object*/ storeItem, /*Boolean*/ newState) {
			// summary:
			//		Update the checked state for the store item and the associated parents
			//		and children, if any.
			// description:
			//		Update the checked state for a single store item and the associated
			//		parent(s) and children, if any. This method is called from the tree if
			//		the user checked/unchecked a checkbox. The parent and child tree nodes
			//		are updated to maintain consistency if 'checkedStrict' is set to true.
			//	storeItem:
			//		The item in the dojo.store whose checked state needs updating.
			//	newState:
			//		The new checked state: 'mixed', true or false
			// tags:
			//		private

			if (!this.checkedStrict && !this._checkedInherit) {
				this._setChecked(storeItem, newState);		// Just update the checked state
			} else {
				this._updateCheckedChild(storeItem, newState); // Update the children.
			}
		},

		setEnabled: function (/*Object*/ object, /*Boolean*/ value) {
			// summary:
			//		Sets the new 'enabled' state of an item.
			// item:
			//		Store or root item
			// tag:
			//		Public
			if (this.enabledAttr) {
				this._setValue(object, this.enabledAttr, !!value);
			}
		},

		validateData: function () {
			// summary:
			//		Deprecated, see _validateStore() description instaed.
			// TODO:
			//		Remove with dojo 2.0
			// tag:
			//		Public
		},

		// =======================================================================
		// Private Checked state handling

		_getCompositeState: function (/*Object[]*/ children) {
			// summary:
			//		Compile the composite state based on the checked state of a group
			//		of children.	If any child has a mixed state, the composite state
			//		will always be mixed, on the other hand, if none of the children
			//		has a checked state the composite state will be undefined.
			// children:
			//		Array of dojo/store items
			// returns:
			//		Boolean or string: true, false, "mixed" or undefined
			// tags:
			//		private

			var hasChecked   = false,
					hasUnchecked = false,
					isMixed      = false,
					newState,
					state;

			children.some(function (child) {
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

		_normalizeState: function (/*Object*/ storeItem, /*Boolean|String*/ state) {
			// summary:
			//		Normalize the checked state value so we don't store an invalid state
			//		for a store item.
			//	storeItem:
			//		The store item whose checked state is normalized.
			//	state:
			//		The checked state: 'mixed', true or false.
			// tags:
			//		private

			if (this.multiState && state == "mixed") {
				if (this.normalize && !this.mayHaveChildren(storeItem)) {
						return true;
				}
				return state;
			}
			return !!state;
		},

		_setChecked: function (/*Object*/ storeItem, /*Boolean|String*/ newState) {
			// summary:
			//		Set/update the checked state on the dojo/store item. Returns true if
			//		the checked state changed otherwise false.
			// description:
			//		Set/update the checked state on the dojo.store.	Retreive the
			//		current checked state	and validate if an update is required, this
			//		will keep store updates to a minimum. If the current checked state
			//		is undefined (ie: no checked property specified in the store) the
			//		'checkedAll' property is tested to see if a checked state needs to
			//		be created.
			//
			//		NOTE: The _setValue() method will add the property for the
			//					item if none exists.
			//
			//	storeItem:
			//		The item in the dojo.store whose checked state is updated.
			//	newState:
			//		The new checked state: 'mixed', true or false.
			//	returns:
			//		Boolean, true or false;
			//	tag:
			//		private

			var forceUpdate = false,
					normState;

			normState   = this._normalizeState(storeItem, newState);
			forceUpdate = (normState != newState);

			var currState = storeItem[this.checkedAttr];
			if ((currState !== undef || this.checkedAll) && (currState != normState || forceUpdate)) {
				this._setValue(storeItem, this.checkedAttr, normState);
				return true;
			}
			return false;
		},

		_updateCheckedChild: function (/*Object*/ parent, /*Boolean*/ newState) {
			//	summary:
			//		Set the parent, and all of its childrens, state to either true or false.
			//	description:
			//		If a parent checked state changed, all child and grandchild states are
			//		updated to reflect the change. For example, if the parent state is set
			//		to true, all child and grandchild states will receive that same 'true'
			//		state.
			//
			//	parent:
			//		The parent store item whose child/grandchild states require updating.
			//	newState:
			//		The new checked state.
			//	tag:
			//		private

			// Set the parent state first. The order in which any child checked states
			// are set is important to optimize _updateCheckedParent() performance.
			var model = this;

			this._setChecked(parent, newState);
			this.getChildren(parent, function (children) {
					children.forEach(function (child) {
						model._updateCheckedChild(child, newState);
					});
				},
				function (err) {
					console.error(err);
				} );
		},

		_updateCheckedParent: function (/*Object*/ child, /*Boolean*/ forceUpdate) {
			//	summary:
			//		Update the parent checked state according to the state of all its
			//		children checked states.
			//	child:
			//		The store item whose parent state requires updating.
			//	forceUpdate:
			//		Force an update of the parent(s) regardless of the current checked
			//		state of the child.
			//	tag:
			//		private

			if (!this.checkedStrict || !child) {
				return;
			}
			var promise    = this.getParents(child),
					childState = this.getChecked(child),
					model      = this,
					newState;

			promise.then( function (parents) {
				parents.forEach(function (parentItem) {
					// Only process a parent update if the current child state differs from
					// its parent otherwise the parent is already up-to-date.
					if ((childState !== model.getChecked(parentItem)) || forceUpdate) {
						model.getChildren(parentItem, function (children) {
								newState = model._getCompositeState(children);
								if (newState !== undef) {
									model._setChecked(parentItem, newState);
								}
							},
							model.onError);
					}
				}, this); /* end forEach() */
			});
		},

		_validateChildren: function ( parent, children) {
			// summary:
			//		Validate/normalize the parent(s) checked state in the dojo/store.
			// description:
			//		All parent checked states are set to the appropriate state according to
			//		the actual state(s) of their children. This will potentionally overwrite
			//		whatever was specified for the parent in the dojo/store.
			//		This will garantee the tree is in a consistent state after startup.
			//	parent:
			//		The parent item.
			//	children:
			//		Either the tree root or a list of child children
			//	tag:
			//		private

			var children, currState, newState;
			this._validating += 1;

			children = children instanceof Array ? children : [children];
			children.forEach(function (child) {
				if (this.mayHaveChildren(child)) {
					this.getChildren( child, lang.hitch(this, function (children) {
							this._validateChildren(child, children);
						}),
						function (err) {
							console.error(err);
						});
				} else {
					currState = this.getChecked(child);
					if (currState) {
						// Because we know this is a leaf we can simply transform the state
						// to a boolean instead of calling _normalizeState()
						newState = this.normalize ? !!currState : currState;
						if (currState != newState) {
							this._setValue(child, this.checkedAttr, newState);
						}
					}
				}
			}, this );
			currState = this.getChecked(parent);
			newState  = this._getCompositeState(children);

			if (currState !== undef && newState !== undef && currState != newState) {
				this._setChecked(parent, newState);
			}
			// If the validation count drops to zero we're done.
			this._validating--;
			if (!this._validating) {
				this._onDataValidated();
			}
		},

		_validateStore: function () {
			// summary:
			//		Function called from _loadStore() as soon as the store is ready.
			//		Validate/normalize the parent-child checked state relationship.
			//		If the property 'checkedStrict' is true this method is called as
			//		part of the	post creation of the Tree instance.
			// returns:
			//		dojo/Promise/promise
			// tag:
			//		Private
			var model = this;

			this._validateDefer = new Deferred();
			if (this.checkedStrict) {
				if (!this.store.isValidated) {
					if (!this._validating) {
						this.getRoot( function (rootItem) {
							model.getChildren(rootItem, function (children) {
								model._validateChildren(rootItem, children);
							}, model.onError);
						}, model.onError);
					}
				} else {
					// Fire onDataValidated
					this._onDataValidated();		// Trigger event.
				}
			} else {
				this._validateDefer.resolve();
			}
			return this._validateDefer.promise;
		},

		// =======================================================================
		// Private event listeners.

		_onChildrenChange: function (/*Object*/ parent, /*Object[]*/ newChildrenList) {
			// summary:
			//		Listener to do notifications about new, updated, or deleted child
			//		items.
			// parent:
			//		The parent object
			// newChildrenList:
			//		Array of children objects.
			//
			// NOTE:
			//		Because dojo/store/observable uses 'inMethod' to determine if a store
			//		method is called from within another store method we MUST schedule the
			//		update of the parent item as a separate task otherwise observable will
			//		not fire any events associated with the parent update.
			//
			// tags:
			//		callback
			var first = newChildrenList[0] || null;
			var self  = this;

			if (this.checkedStrict) {
				if (first) {
					if (this._observable) {
						setTimeout( function () {
							self._updateCheckedParent(first, true);
						}, 0);
					} else {
						self._updateCheckedParent(first, true);
					}
				} else {
					// If no more children, normalize the parent state.
					if (this._observable) {
						setTimeout( function () {
							self._setChecked( parent, parent[self.checkedAttr]);
						}, 0);
					} else {
						this._setChecked( parent, parent[this.checkedAttr]);
					}
				}
			}
			this.onChildrenChange(parent, newChildrenList);
		},

		_onDataValidated: function () {
			// summary:
			// tag:
			//		Private
			this.store.isValidated = true;
			this.onDataValidated();
			this._validateDefer.resolve();
		},

		_onSetItem: function (/*Object*/ storeItem, /*string*/ property, /*any*/ oldValue,
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
			var self = this;

			if (this.checkedStrict) {
				if (property === this.checkedAttr) {
					// (See note @ _onChildrenChange)
					if (this._observable) {
						setTimeout( function () {
							self._updateCheckedParent(storeItem, false);
						}, 0);
					} else {
						self._updateCheckedParent(storeItem, false);
					}
				}
			}
			return this.inherited(arguments);
		},

		_onStoreClosed: function (cleared, count) {
			// summary:
			//		Handler for close notifications from the store.  A reset event
			//		is generated only in case the store was explicitly cleared and
			//		we don't already have a reset pending.
			// cleared:
			//		Indicates if the store was cleared.
			// count:
			//		Number of objects left in the store.
			// tag:
			//		Private
			if (!this._resetPending) {
				if (!!cleared) {
					delete this.store.isValidated;
				}
				this.inherited(arguments);
			}
		},
		
		// =======================================================================
		// Callbacks

		onDataValidated: function () {
			// summary:
			//		Callback when store validation completion. Only called if strict
			//		parent-child relationship is enabled.
			// tag:
			//		callback
		}

	});	/* end declare() */

	return CheckedStoreModel;

});

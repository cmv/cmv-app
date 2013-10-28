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
	"dojo/data/ItemFileWriteStore"
], function (array, lang, ItemFileWriteStore){

		// module:
		//		cbtree/models/ItemWriteStoreEX
		// summary:
		//		Implements a set of extensions to the dojo.data.ItemFileWriteStore to
		//		provide support to the cbtree/models/TreeStoreModel API,

	lang.extend( ItemFileWriteStore, {

		// _validated: [private] Boolean
		//		Indicates if the store has been validated. This property has no real
		//		value to the store itself but is used by the model(s) operating on
		//		the store. It is as a shared variable amongst models.
		_validated: false,

		addReference: function (/*dojo.data.item*/ refItem, /*dojo.data.item*/ parentItem, /*String*/ attribute, /*Number?*/ index) {
			// summary:
			//		Add an existing item to the parentItem by reference.
			// refItem:
			//		Item being referenced to be added to the parents list of children.
			// parentItem:
			//		Parent item.
			// attribute:
			//		List attribute of the parent to which the refItem it added.
			// index:
			//		The location at which the refItem is inserted in the list (optional)
			// returns:
			//		Returns true if successful otherwise false
			// tag:
			//		public

			if (!this.isItem(refItem) || !this.isItem(parentItem)) {
				throw new Error( "ItemWriteStoreEX::addReference(): refItem and/or parentItem is not a valid store item");
			}
			// Prevent recursive referencing..
			if (refItem !== parentItem){
				var oldValue;
				if (parentItem[attribute]){
					oldValue = parentItem[attribute];
					this._addReferenceToMap( refItem, parentItem, attribute );
					if (typeof index === "number") {
						parentItem[attribute].splice(index,0,refItem);
					} else {
						parentItem[attribute].push(refItem);
					}
				} else {
					this._addReferenceToMap( refItem, parentItem, attribute );
					parentItem[attribute] = [refItem];
				}
				// Fire off an event..
				this.onSet( parentItem, attribute, oldValue, parentItem[attribute] );
				return true;
			}
			throw new Error( "ItemWriteStoreEX::addReference(): parent and reference items are identical" );
		},

		attachToRoot: function (/*dojo.data.item*/ item, insertIndex ) {
			// summary:
			//		Promote a store item to a top level item.
			// item:
			//		A valid dojo.data.store item.
			// tag:
			//		public

			if ( !this.isRootItem(/*dojo.data.item*/ item) ) {
				item[this._rootItemPropName] = true;
				if (insertIndex !== undefined) {
					this._arrayOfTopLevelItems.splice(insertIndex, 0, item);
				} else {
					this._arrayOfTopLevelItems.push(item);
				}
				this.onRoot( item, "attach" );
			}
		},

		detachFromRoot: function (/*dojo.data.item*/ item) {
			// summary:
			//		Detach item from the root by removing it from the top level item list
			//		and removing its '_rootItemPropName' property.
			// item:
			//		A valid dojo.data.store item.
			// tag:
			//		public

			if ( this.isRootItem(item) ) {
				this._removeArrayElement(this._arrayOfTopLevelItems, item);
				delete item[this._rootItemPropName];
				this.onRoot( item, "detach" );
			}
		},

		getIdentifierAttr: function() {
			// summary:
			//		Returns the store identifier attribute is defined.
			// tag:
			//		public

			if (!this._loadFinished) {
				this._forceLoad();
			}
			return this._getIdentifierAttribute();
		},

		getParents: function (/*dojo.data.item*/ item) {
			// summary:
			//		Get the parent(s) of a dojo.data.item.
			// description:
			//		Get the parent(s) of a dojo.data item.	Either the '_reverseRefMap' or
			//		'backup_reverseRefMap' property is used to fetch the parent(s). In the
			//		latter case the item is pending deletion.
			// storeItem:
			//		The dojo.data.item whose parent(s) will be returned.
			// tags:
			//		private

			var parents = [],
					itemId;

			if (item) {
				var	references = item[this._reverseRefMap] || item["backup_" + this._reverseRefMap];
				if (references) {
					for(itemId in references) {
						parents.push(this._getItemByIdentity(itemId));
					}
				}
				return parents;
			}
		},

		isRootItem: function (/*dojo.data.item*/ item) {
			// summary:
			//		Returns true if the item has the '_rootItemPropName' property defined
			//		and its value is true, otherwise false is returned.
			// item:
			//		A valid dojo.data.store item.
			// returns:
			//		True if the item is a root item otherwise false
			// tag:
			//		public

			this._assertIsItem(item);
			return item[this._rootItemPropName] ? true : false;
		},

		isValidated: function () {
			// summary:
			//		Returns true if a model has signalled the store has successfully been
			//		validated. The attribute _validated is part of the store and not of a
			//		model as multiple models may operate on this store.
			return this._validated;
		},

		itemExist: function (/*Object*/ keywordArgs) {
			// summary:
			//		Tests if, and return a store item if it exists.	 This method is based
			//		on the same set of prerequisites as newItem(), that is, the store must
			//		be fully loaded; if the store has an identifier attribute each store
			//		item MUST at least have that same attribute and the item can not be
			//		pending deletion.
			// keywordArgs:
			//		Object defining the store item properties.
			// returns:
			//		The dojo.data.item if is exist
			// tag:
			//		public

			var identifierAttr,
					itemIdentity,
					item;

			if (typeof keywordArgs != "object" && typeof keywordArgs != "undefined"){
				throw new Error("ItemWriteStoreEX::itemExist(): argument is not an object");
			}
			this._assert(!this._saveInProgress);

			identifierAttr = this.getIdentifierAttr();
			if (identifierAttr !== Number && this._itemsByIdentity){
				itemIdentity = keywordArgs[identifierAttr]
				if (typeof itemIdentity === "undefined"){
					throw new Error("ItemWriteStoreEX::itemExist(): item has no identity");
				}
				if (!this._pending._deletedItems[itemIdentity]) {
					item = this._itemsByIdentity[itemIdentity];
				} else {
					throw new Error("ItemWriteStoreEX::itemExist(): item is pending deletion");
				}
			}
			return item;
		},

		loadStore: function ( keywordArgs ) {
			// summary:
			//		Try a forced load of the entire store but only if it has not
			//		already been loaded.
			//
			// keywordArgs:
			// 		onComplete:
			//				If an onComplete callback function is provided, the callback function
			//				will be called once on successful completion of the load operation
			//				with the total number of items loaded: onComplete(count)
			// 		onError:
			//				The onError parameter is the callback to invoke when loadStore()
			//				encountered an error. It takes one parameter, the error object.
			// 		scope:
			//				If a scope object is provided, all of the callback functions (onComplete,
			//				onError, etc) will be invoked in the context of the scope object. In
			//				the body of the callback function, the value of the "this" keyword
			//				will be the scope object otherwise window.global is used.
			// tag:
			//		public
			var scope = keywordArgs.scope || window.global;
			var self  = this;

			function loadComplete( count, requestArgs ) {
				// summary:
				var loadArgs = requestArgs.loadArgs || null;
				var scope    = loadArgs.scope;

				self.onLoad( count );

				if (loadArgs) {
					if (loadArgs.onComplete) {
						loadArgs.onComplete.call(scope, count);
					}
				}
			}

			if (!this._loadFinished) {
				var request  = { queryOptions: {deep: true},
												 loadArgs: keywordArgs,
												 onBegin: loadComplete,
												 onError: keywordArgs.onError,
												 scope: this};
				try {
					this.fetch(request);
				} catch(err) {
					if (onError) {
						onError.call(scope, err);
					} else {
						throw err;
					}
				}
			} else {
				if (onComplete) {
					onComplete.call(scope, this._allFileItems.length);
				}
			}
		},

		onDelete: function(/*dojo.data.item*/ deletedItem){
			// summary:
			//		See dojo.data.api.Notification.onDelete()
			// tag:
			//		callback.
			// NOTE: Don't call isItem() as it will fail, the item is already deleted
			//			 and therefore no longer valid.
			if ( deletedItem[this._rootItemPropName] === true ){
				this.onRoot( deletedItem, "delete" );
			}
		},

		onNew: function(/*dojo.data.item*/ item, parentInfo ){
			// summary:
			//		See dojo.data.api.Notification.onNew()
			// tag:
			//		callback.
			if ( this.isRootItem(item) ){
				this.onRoot( item, "new" );
			}
		},

		onLoad: function ( count ) {
			// summary:
			//		Invoked when loading the store completes. This method is only called
			//		when the loadStore() is used.
			// count:
			//		Number of store items loaded.
			// tag:
			//		callback.
		},

		onRoot: function(/*dojo.data.item*/ item, /*string*/ action ) {
			// summary:
			//		Invoked whenever a item is added to, or removed from the root.
			// item:
			//		Store item.
			// action:
			//		Event action which can be: "new", "delete", "attach" or "detach"
			// tag:
			//		callback.
		},

		setValidated: function (/*Boolean*/ value) {
			// summary:
			//		Mark the store as successfully been validated.
			this._validated = Boolean(value);
		},

		removeReference: function ( /*dojo.data.item*/ refItem, /*dojo.data.item*/ parentItem, /*String*/ attribute ){
			// summary:
			//		Remove a item reference from its parent. Only the references are
			//		removed, the refItem itself is not delete.
			// refItem:
			//		Referenced item to be removed from parents children list.
			// parentItem:
			//		Parent item.
			// attribute:
			//		List attribute of the parent from which the refItem it removed.
			// returns:
			//		True if successful otherwise false
			// tag:
			//		public

			if (!this.isItem(refItem) || !this.isItem(parentItem)) {
				throw new Error( "ItemWriteStoreEX::removeReference(): refItem and/or parentItem is not a valid store item");
			}
			if ( parentItem[attribute] ) {
				this._removeReferenceFromMap( refItem, parentItem, attribute );
				var oldValue = parentItem[attribute];
				if (this._removeArrayElement( parentItem[attribute], refItem )) {
					// Delete attribute if empty which prevents false mayHaveChildren()
					if (this._isEmpty(parentItem[attribute])) {
						delete parentItem[attribute];
					}
					// Fire off an event..
					this.onSet( parentItem, attribute, oldValue, parentItem[attribute] );
					return true;
				}
			}
			return false;
		}

	}); /* end lang.extend() */

}); /* end define() */

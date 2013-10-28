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
define(["dojo/_base/declare",		// declare
				"dojo/_base/lang",			// when()
				"dojo/when",						// when()
				"./_base/CheckedStoreModel"
			 ], function (declare, lang, when, CheckedStoreModel) {
	"use strict";
		// module:
		//		cbtree/model/TreeStoreModel

	var TreeStoreModel = declare([CheckedStoreModel], {
		// summary:
		//		Implements the cbtree/model/Model API connecting to a dojo/store or
		//		extended cbtree/store with a single root item, that is, the root
		//		query is quarenteed to always returns one item.
		//		The model is derived from the CheckedStoreModel class providing the
		//		support for "checked" states.

		getChildren: function (/*Object*/ parent, /*Function*/ onComplete, /*Function*/ onError) {
			// summary:
			//		Calls onComplete() with array of child items of given parent item,
			//		all loaded. (See cbtree/model/_base/BaseStoreModel.getChildren()
			//		for implementation details).
			// parent:
			//		Object.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argumen: onComplete(children)
			// onError:
			//		Callback function, called in case an error occurred.
			// tags:
			//		public

			this._getChildren( parent, function (parent, id) {
				return this.store.getChildren(parent);
			}, onComplete, onError );
		},

		toString: function () {
			return "[object TreeStoreModel]";
		}

	});

	return TreeStoreModel;

});

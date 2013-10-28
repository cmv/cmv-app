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

define([], function () {
	"use strict";
		// module:
		//		cbtree/model/_base/Prologue
		// summary:

	var undef;

	function Prologue (/*Object*/ object,/*Store.PutDirectives*/ options) {
		// summary:
		//		This prologue method is added to the stores add and put methods as before
		//		advice to provide support for the 'parent' property of store objects and
		//		to add the store identifier. This method looks for two things:
		//
		//			1 -	First, if the options parameter contains a "parent" property.
		//			2 -	Second, if the store has a "hierarchical" property.
		//
		//		If the store has the 'hierarchical' property it is assumed the store
		//		will handle the assignment of the objects parent property otherwise
		//		this prologue method will take care of it onbehalf of the store.
		//
		//		NOTE: The prologue method is executed in the context of the store thus
		//					the 'this' object is the store itself.
		// object:
		//		The object to store.
		// options:
		//		Additional metadata for storing the object which may include a 'parent'
		//		property.
		// tag:
		//		Private, Advice

		function setParentId(/*Object*/ object,/*Store.PutDirectives?*/ options) {
			// summary:
			//		Set the parent property of a store object.
			// object:
			//		The object to store.
			// tag:
			//		Private
			var objectId = this.getIdentity(object);
			var parents  = options.parent;
			var parentId, np = [];
			var undef, i;

			if (parents instanceof Array) {
				for (i=0; i<parents.length; i++) {
					if (parentId = this.getIdentity(parents[i])) {
						if (parentId != objectId && np.indexOf(parentId) == -1) {
							np ? np.push(parentId) : np = [parentId];
						}
					}
				}
			} else {
				if (parentId = this.getIdentity(parents)) {
					if (parentId != objectId) {
						np = parentId;
					}
				} else {
					np = undef;
				}
			}
			return np;
		} /* end setParentId() */

		if (options && options.parent && this.hierarchical !== true) {
			object[this.parentProperty] = setParentId.call(this, object, options);
		}
	}

	return Prologue;

});

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

define(["../../util/shim/Array"], function () {

	function Parents (/*Object|Id|Id[]*/ childItem, /*String?*/ attribute) {
		// summary:
		//		Helper class which hides the fact if we are dealing with a single or multi
		//		parent dojo/store.	The default dojo/store only provide support for single
		//		parented objects whereas the cbtree stores and models supports both single
		//		and multi parented objects.
		//		The Parents object (this) is an Array-like object.
		//
		// childItem:
		//		A JavaScript key:value pairs object representing a store object or
		//		an array of parent ids or a comma separated list of parent ids.
		// attribute:
		//		Property name of the Javascript object identifying the parent(s) of the
		//		object.
		// example:
		//	|	var parents = new Parents( storeItem, this.parentAttr );
		//	|	if (!parents.contains("Homer")) {
		//	|		parents.add("Homer");
		//	| }
		//	| this.setValue( store.item, this.parentAttr, parents.toValue() );
		// tag:
		//		Private

		var attribute = attribute || "parent";
		var undef;
		
		this.multiple = true;
		this.length   = 0;
		this.input    = null;

		function assign(ids) {
			Array.prototype.splice.call(this, 0,this.length);
			if (ids instanceof Array) {
				ids.forEach( function(id,idx) {
					this[idx] = id;
					this.length++;
				},this);
			} else {
				assign.call(this, [ids]);
				this.multiple = false;
				this.length	 = 1;
			}
		}

		this.add = function (id, multiple) {
			// Don't accept duplicates
			if (id != undef) {
				if (!this.contains(id)) {
					if (multiple || this.multiple) {
						this[this.length++] = id;
						this.multiple = (this.length > 1);
					} else {
						this.set(id);
					}
					return true;
				}
				return false;
			}
		};

		this.contains = function (id) {
			return Array.prototype.some.call(this, function(member) {
				return member === id;
			});
		};

		this.forEach = function (callback, thisArg) {
			Array.prototype.forEach.call(this, callback, thisArg);
		}

		this.remove = function (id) {
			return Array.prototype.some.call(this, function(member,idx) {
				if (member === id) {
					Array.prototype.splice.call(this, idx, 1);
					return true;
				}
			}, this );
		};

		this.set = function (id) {
			Array.prototype.splice.call(this, 0,this.length);
			this[0] = id;
			this.length = 1;
			return true;
		};

		this.toValue = function() {
			return (this.multiple ? Array.prototype.slice.call(this) : this[0]);
		};

		if (childItem != undef) {
			if (childItem instanceof Array) {
				this.input = childItem;
			} else if (typeof childItem === "object") {
				this.input = childItem[attribute];
			} else if (typeof childItem === "string") {
				this.input = childItem.split(/\s*,\s*/);
				if (this.input.length == 1) {
					this.input = childItem;
				}
			} else {
				this.input = childItem;
			}
			if (this.input != undef) {
				assign.call(this, this.input);
			} else {
				this.multiple = false;
			}
		}

	} /*end Parents() */

	return Parents;

});	/* end define() */

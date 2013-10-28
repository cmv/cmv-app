//
// Copyright (c) 2010-2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause								(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License				(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License		(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
define(["./_Path",
        "./_PathList",
        "../Natural",
        "../Hierarchy"
        ], function (Path, PathList, Natural, Hierarchy) {
	"use strict";
	
	// module:
	//		cbtree/store/extension/Ancestry
	// summary:
	//		This module is an extension to the cbtree Hierarchy and Object store
	//		adding simple to use functions to leverage the hierarchy aspects of
	//		those stores.

	function  getChildren (/*Object*/ store, /*Object*/ parent) {
		// summary:
		//		Fast track version of 'getChildren()'. Instead of a QueryResult it
		//		returns a non Observable plain array of objects.
		// returns:
		//		An array of store objects.
		// tag:
		//		Private
		var parentId = store.getIdentity(parent);
		var children = [];
		var query    = {};
		
		if (store.indexChildren) {
			children = (store._indexChild[parentId] || []).slice(0);
		} else {
			query[store.parentProperty] = parentId;
			children = store.query( query );
		}
		return children;
	}

	function isEmpty(o) {
		// summary:
		//		Return true if object is empty otherwise false.
		for(var prop in o) {
			if(o.hasOwnProperty(prop)) {
				return false;
			}
		}
		return true;
	}

	var Ancestry = {
		// summary:
		//		The Ancestry object is a collection of functions used to extend the
		//		cbtree Hierarchy store. Because the ObjectStore inherits from the
		//		Hierarchy store the Ancestry functionality is also inherited.
		//
		// example:
		//		To add Ancestry support to the cbtree Hierarchy and Object store,
		//		simply load the Ancestry extension:
		//
		//	|	required(["cbtree/store/Hierarchy",
		//	|						"cbtree/store/extensions/Ancestry"
		//	|					 ], function( Hierarchy, Ancestry ) {
		//	|		var myStore = new Hierarchy( ... );
		//	|	});

		analyze: function (/*Number*/ maxCount ) {
			// summary:
			//		Analyze the store hierarchy and report any broken links.
			// maxCount:
			//		The maximum number of missing object deteced before the store
			//		analysis is aborted.
			// returns:
			//		A key:value pairs JavaScript object. Each key represents the
			//		identifier of a missing object.   The value is the array of
			//		identifiers referencing the missing object. If no object is
			//		missing null is returned.
			// tag:
			//		Public
			var maxms = maxCount > 0 ? maxCount : 0;
			var data  = this._data || [];
			var count = 0;
			var miss  = {};
			
			data.some( function (item) {
				var parentIds = this._getParentArray(item);		
				var oops = parentIds.filter( function(parentId) {
					return !this.get(parentId);
				}, this);
				
				oops.forEach( function (parentId) {
					var ref, itemId = this.getIdentity(item);
					if (ref = miss[parentId]) {
						ref.push(itemId);
					} else {
						ref = [itemId];
						count++;
					}
					miss[parentId] = ref;
				}, this);
				return (maxms && maxms <= count);
			}, this);
			return !isEmpty(miss) ? miss : null;
		},

		getAncestors: function (/*Object|Id*/ item, /*Boolean?*/ idOnly) {
			// summary:
			//		Get all ancestors of a given item.
			// item:
			//		A valid store object or object id.
			// idOnly:
			//		If set to true only the ancestor ids are returned.
			// returns:
			//		If the item exists, an array of store object or ids otherwise
			//		undefined. If an empty array is returned (length=0) it indicates
			//		that item has no parents and therefore is considered a top-level
			//		item.
			// tag:
			//		Public

			function _getAncestors (store, item, ancList) {
				store.getParents(item).forEach( function (parent) {
					if (ancList.indexOf(parent) == -1) {
						ancList.push(parent);
						_getAncestors(store, parent, ancList);
					}
				});
				return ancList;
			}

			var item = this._anyToObject(item);
			if (item) {
				var results = _getAncestors (this, item, []);
				if (idOnly === true) {
					results = results.map( this.getIdentity, this );
				}
				return results;
			}
		},

		getDescendants: function (/*Object|Id*/ item, /*Boolean?*/ idOnly) {
			// summary:
			//		Get all descendants of a given item.
			// item:
			//		A valid store object or object id.
			// idOnly:
			//		If set to true only the descendant ids are returned.
			// returns:
			//		If the item exists, an array of store object or ids otherwise
			//		undefined. If an empty array is returned (length=0) it indicates
			//		that item has no parents and therefore is considered a top-level
			//		item.
			// tag:
			//		Public

			function _getDescendants (store, item, descList) {
				getChildren(store, item).forEach( function (child) {
					if (descList.indexOf(child) == -1) {
						descList.push(child);
						_getDescendants(store, child, descList);
					}
				});
				return descList;
			}

			var item = this._anyToObject(item);
			if (item) {
				var results = _getDescendants(this, item, []);
				if (idOnly === true) {
					results = results.map( this.getIdentity, this );
				}
				return results;
			}
		},

		getPaths: function (/*Object|Id*/ item, /*String?*/ separator) {
			// summary:
			//		Returns the virtual path(s) of an item. Each path segment represents
			//		the identifier of an ancestor with the exception of the last segment
			//		which is the item identifier.
			// item:
			//		The item whose path(s) are to be returned. Item is either an object
			//		or an identifier.
			// separator:
			//		Specifies the character to use for separating the path segments.
			//		Default is the forward slash (/).
			// returns:
			//		A PathList. If the item does not exist undefined is returned.
			// tag:
			//		Public
			var item = this._anyToObject(item);
			var sepr = separator || "/";
			var self = this;
			
			function _addPath (item, path, list) {
				var parents = self.getParents(item);
				if (parents.length) {
					parents.forEach( function (parent) {
						var currPath = self.getIdentity(parent) + sepr + path;
						list = _addPath(parent, currPath, list);
					});
				} else {
					// If no more parents, add current path.
					list = list || new PathList();
					list.push( new Path(path, sepr) );
				}
				return list;
			}
			
			if (item) {
				var pathList = _addPath(item, this.getIdentity(item), null );
				return pathList;
			}
		},

		getSiblings: function (/*Object|Id*/ item, /*Boolean?*/ idOnly) {
			// summary:
			//		Get the siblings of an item.
			// item:
			//		A valid store object or object id.
			// idOnly:
			//		If set to true only the sibling ids are returned.
			// returns:
			//		If the item exists, an array of store object or ids otherwise
			//		undefined. If an empty array is returned (length=0) it indicates
			//		that item has no siblings.
			// tag:
			//		Public
			var item = this._anyToObject(item);
			var sibl = [];
			
			if (item) {
				this.getParents(item).forEach( function (parent) {
					getChildren(this, parent).forEach( function (child) {
						if (child != item && sibl.indexOf(child) == -1) {
							sibl.push(child);
						}
					});
				}, this);
				if (idOnly === true) {
					sibl = sibl.map( this.getIdentity, this );
				}
				return sibl;
			}
		},

		isAncestorOf: function (/*Object|Id*/ ancestor, /*Object|Id*/ item) {
			// summary:
			//		Returns true if the object identified by argument 'ancestor' is an
			//		ancestor of the object identified by argument 'item'.
			// ancestor:
			//		A valid store object or object id.
			// item:
			//		A valid store object or object id.
			// returns:
			//		Boolean true or false.
			// tag:
			//		Public
			
			function _isAnc (store, ancestor, item) {
				var gps = store.getParents(item);
				if (gps.indexOf(ancestor) == -1) {
					return gps.some( function ( gp ) {
						return _isAnc(store, ancestor, gp);
					}, this);
				}
				return true;
			}

			var ancestor = this._anyToObject(ancestor);
			var item     = this._anyToObject(item);

			if (item && ancestor) {
				return _isAnc(this, ancestor, item);
			}
			return false;
		},
		
		isChildOf: function (/*Object|Id*/ item, /*Object|Id*/ parent) {
			// summary:
			//		Validate if an item is a child of a given parent.
			// item:
			//		A valid store object or object id.
			// parent:
			//		A valid store object or object id.
			// returns:
			//		Boolean true or false.
			// tag:
			//		Public
			var parent = this._anyToObject(parent);
			var item   = this._anyToObject(item);

			if (parent && item) {
				var parentIds = this._getParentArray(item);
				var parentId  = this.getIdentity(parent);
				return (parentIds.indexOf(parentId) != -1);
			}
			return false;
		},

		isDescendantOf: function (/*Object|Id*/ item, /*Object|Id*/ ancestor) {
			// summary:
			//		Validate if an item is a descendant of a given ancestor. 
			//		The following assumption must be true:
			//		- If A is a descendant of B than B must be an ancestor of A.
			// item:
			//		A valid store object or object id.
			// ancestor:
			//		A valid store object or object id.
			// returns:
			//		Boolean true or false.
			// tag:
			//		Public
			return this.isAncestorOf(ancestor,item);
		},
		
		isSiblingOf: function (/*Object|Id*/ item,/*Object|Id*/ sibling) {
			// summary:
			//		Returns true if the object identified by argument 'item' is the
			//		sibling of the object identified by argument 'sibling'.
			// item:
			//		A valid store object or object id.
			// returns:
			//		Boolean true or false.
			// tag:
			//		Public
			var sibling = this._anyToObject(sibling);
			var item    = this._anyToObject(item);

			var siblings = this.getSiblings( sibling);

			if (siblings) {
				return (siblings.indexOf(item) != -1)
			}
			return false;
		}
		
	};	/* end Ancestry {} */

	var Order = {
		isBefore: function (/*Object|Id*/ itemA, /*Object|Id*/ itemB) {
			// summary:
			//		Evaluate if an item appears before another item in the natural
			//		order of store objects.
			// itemA:
			// itemB:
			// returns:
			//		Boolean true if itemA appears before itemB otherwise false.
			// tag:
			//		Public
			var objA = this._anyToObject(itemA);
			var objB = this._anyToObject(itemB);

			if (objA && objB) {
				var indexA = this._data.indexOf( objA );
				var indexB = this._data.indexOf( objB );

				return (indexA < indexB);
			}
			return false;
		}
	};	/* end Order {} */

	Hierarchy.extend( Ancestry );
	Natural.extend( Order );

	return true;

});

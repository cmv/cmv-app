//
// Copyright (c) 2010-2013, Peter Jekel
// All rights reserved.
//
//	1 - BSD 2-Clause							 (http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License			 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License	 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
//	In case of doubt, the BSD 2-Clause license takes precedence.
//
define(["dojo/_base/array",
				"dojo/_base/declare",
				"dojo/_base/event",
				"dojo/_base/lang",
				"dijit/MenuBar",
				"dijit/MenuItem",
				"dijit/MenuBarItem",
				"dijit/DropDownMenu",
				"dijit/registry",
				"dojo/text!../templates/TrailBarItem.html",
				"../Evented"
], function (array, declare, event, lang, MenuBar, MenuItem, MenuBarItem, DropDownMenu, registry,
						  TrailBarItemTemplate, Evented) {
	// module:
	//		cbtree/data/BreadCrumb
	// summary:
	// 		A simple implementation of a breadcrumb trail for a cbtree/data/FileStore.
	//		It is provided as a sample and is utilized by some of the cbtree/data demos.

	var DirectoryItem = declare([MenuItem], {
		iconClass:"dijitEditorIcon dijitEditorIconTabIndent",
		templateString: TrailBarItemTemplate,
		popup: null,

		constructor: function (/*Object*/ args) {
			this.popup = new DropDownMenu( {} );
		}

	});

	var BreadCrumb = declare([MenuBarItem, Evented],{
		//==============================
		// Parameters to constructor

		trail: null,
		item: null,

		// End Parameters to constructor
		//==============================

		moduleName: "cbTree/stores/BreadCrumb",

		constructor: function (/*Object*/ args) {
			this.trail = args.trail;
			this.item  = args.item;

			if (this.trail && this.item) {
				var store  = this.trail.store;
				var item   = this.item;

				this.label = store.getLabel(item);
				this.path  = store.getValue(item, "path");

				if (this.item.directory) {
					this.tag = new DirectoryItem();
					store.fetchChildren({ item: item,
																query: {directory:true},
																queryOptions: {storeOnly:true},
																onComplete: this._dropDownMenu,
																scope: this
															} );
				}
			} else {
				throw new Error(this.moduleName+"::constructor(): Both trail and item are required arguments.");
			}
		},

		_addToTrail: function () {
			// summary:
			//		Add a breadcrumb to the trail.
			// tag:
			//		Private
			this.trail.addChild(this);
			this.trail.addChild(this.tag);
		},

		_dropDownMenu: function (items) {
			// summary:
			//		Create a drop down menu with all items as a menu item.
			// tag:
			//		Private
			var popupMenu = this.tag.popup;
			var menuItem;

			array.forEach(items, function(item) {
					menuItem = new MenuItem({label: item.name,
																		iconClass: this.trail._dirIconClass,
																		onClick: lang.hitch(this, this.onClick)
																	});
					menuItem.item = item;
					popupMenu.addChild( menuItem );
				}, this);
		},

		postCreate: function () {
			this._addToTrail();
		},

		//========================================================================
		// Callbacks.

		onClick: function( evt ) {
			// summary:
			//		OnClick event handler of any mouse click on any menu item.
			var menuItem = registry.getEnclosingWidget(evt.target);
			this.trail.onClick( menuItem.item, menuItem, evt );
			event.stop(evt);
		}

	});

	var CrumbTrail = declare([MenuBar, Evented],{
		//==============================
		// Parameters to constructor

		store: null,

		// End Parameters to constructor
		//==============================

		moduleName: "cbTree/stores/CrumbTrail",
//		templateString: TrailBarTemplate,

		_dirIconClass: "dijitIcon dijitFolderClosed",

		constructor: function (/*Object*/ args) {
			// summary:
			//		Create a new breadcrumb trail.
			this._customIcon = false;
			this._crumbs     = {};
			this.store       = args.store || null;

			if (this.store) {
				this._setTrailAttr( "." );

				if (args.cssBaseClass) {
					if (args.cssBaseClass !== "fileIcon") {
						this._dirIconClass = args.cssBaseClass + " " + args.cssBaseClass + "Collapsed";
					} else {
						this._dirIconClass = "fileIcon fileIconDIR fileIconDIRCollapsed";
					}
				}
			} else {
				throw new Error(this.moduleName+"::constructor(): store argument is required.");
			}
		},

		_addBreadCrumb: function (item) {
			// summary:
			//		Create a new breadcrumb and add it to the trail.
			// tag:
			//		Private
			if (item) {
				var identity   = this.store.getIdentity(item);
				var breadCrumb = this._crumbs[identity];

				if (!breadCrumb) {
					breadCrumb = new BreadCrumb( {trail: this, item: item} );
					this._crumbs[identity] = breadCrumb;
				} else {
					breadCrumb._addToTrail();
				}
			}
		},

		_clearTrail: function() {
			// summary:
			//		Remove all breadcrumbs from the trail.
			// tag:
			//		Private
			var children = this.getChildren();
			var i;

			for( i=0; i<children.length; i++) {
				this.removeChild(children[i]);
			}
		},

		_setTrailAttr: function (path) {
			// summary:
			//		Hook for the set("trail", path) method.
			// path:
			//		Path string. Path segments are separated by a forward slash (/)
			// tag:
			//		Private
			var store = this.store;
			var self  = this;

			if (path && lang.isString(path)) {
				var segm = path.split("/");
				var identity = "",
						i;

				this._clearTrail();
				for (i=0; i<segm.length; i++) {
					identity = identity + segm[i];
					store.fetchItemByIdentity({ identity: identity,
																			queryOptions: {storeOnly:true},
																			onItem: self._addBreadCrumb,
																			scope: this
																		});
					identity = identity + "/"
				}
			} else {
				throw new Error(this.moduleName+"::_setTrailAttr(): invalid path argument.");
			}
			return true;
		},

		setTrail: function (/*String*/ path) {
			// summary:
			//		Set the new path for the trail. Calling setTrail(path) is the equivalent of
			//		calling set("trail", path)
			// path:
			//		Path string. Path segments are separated by a forward slash (/)
			// tag:
			//		Public
			return this._setTrailAttr( path );
		},

		//========================================================================
		// Callbacks.

		onClick: function ( /*===== item, menuWidget, evt =====*/ ) {
			// summary:
			// 		Callback whenever a trail menu item is clicked.
			// item:
			//		File Store item.
			// menuWidget:
			//		Menu item widget that was clicked
			// evt:
			//		Event object.
		}

	});
	return CrumbTrail;
});

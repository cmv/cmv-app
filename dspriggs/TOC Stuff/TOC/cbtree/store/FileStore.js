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
define(["module",
				"dojo/_base/declare",
				"dojo/_base/lang",
				"dojo/Deferred",
				"dojo/Evented",
				"dojo/json",
				"dojo/request",
				"dojo/Stateful",
				"dojo/store/util/QueryResults",
				"dojo/when",
				"../errors/createError!../errors/CBTErrors.json",
				"../util/Mutex",
				"../util/QueryEngine",
				"../util/shim/Array"		// ECMA-262 Backward Compatibility Array shim
			 ], function (module, declare, lang, Deferred, Evented, json, request, Stateful,
										QueryResults, when, createError, Mutex, QueryEngine) {
	"use strict";

	// module:
	//		cbtree/store/FileObjectStore
	// summary:
	//		The FileStore implements the dojo/store/api/Store API. The store retrieves
	//		file and directory information from a back-end server which is cached as
	//		an in-memory object store.	The store allows applications to add custom
	//		properties to file object not provided by the server side application such
	//		as a checked state. The in-memory FileObject Store is dynamic in that file
	//		object may be added, removed or change based on the responses received from
	//		the back-end server.
	//
	//		Store restrictions:
	//
	//			- Items (files) can be deleted or renamed however, no store items can
	//				be added programmatically. In order to delete and/or rename files,
	//				the Server Side Application must be configured to support the HTTP
	//				DELETE and/or POST methods otherwise a 405 status code is returned.
	//			- Custom properties are not passed to the back-end server.
	//
	//		Server Side Application:
	//
	//			Currently two implementations of the Server Side Application are available:
	//
	//				cbtree/stores/server/PHP/cbtreeFileStore.php
	//				cbtree/stores/server/CGI/bin/cbtreeFileStore.cgi
	//
	//			Please refer to the File Store documentation for details on the Server Side
	//			Application. (cbtree/documentation/FileObjectStore.md)

	var CBTError = createError( module.id );		// Create the CBTError type.
	var	moduleName = "cbTree/store/FileStore";

	var C_ITEM_EXPANDED = "_EX";			// Property indicating if a directory item is fully expanded.
	var C_PATH_ATTR			= "path";			// Path property name (used as the identifier)
	var C_ICON_ATTR			= "icon";			// Icon property name
	var undef;

	function fixException( error ) {
		// summary:
		//		Work-around for a dojo 1.8.x XHR bug. Whenever a XHR requests fails the
		//		server response is still processed by the 'handleAs' handler resulting
		//		in an incorrect error name (SyntaxError) and message.
		// Note:
		//		Bug filed as: http://bugs.dojotoolkit.org/ticket/16223
		// tag:
		//		Private
		if (error.response) {
			switch (error.response.status) {
				case 404:
					error.message = "404 Object Not Found";
					error.name		= "NetworkError";
			}
		}
	}

	function parent (/*String*/ path) {
		// summary:
		//		Returns the parent of a given path. (eg.one level up)
		// path:
		//		File system path string.
		// tag:
		//		Private
		var idx = path.lastIndexOf("/");
		if (idx != -1) {
			return path.slice(0, idx);
		}
	}

	function setIconClass (/*Object*/ item) {
		// summary:
		//		Sets the camelcase css icon classname(s) for a store item.
		// item:
		//		A valid file store item.
		var icc;

		if (item.directory) {
			icc = "fileIconDIR";
		} else {
			var last = item.name.lastIndexOf(".");
			if (last > 0) {
				var ext = item.name.substr(last+1).toLowerCase();
				ext = ext.replace(/[a-z]/, function(c) {	return c.toUpperCase();});
				icc = "fileIcon" + ext;
			} else {
				icc = "fileIconUnknown"
			}
		}
		item[C_ICON_ATTR] = icc + " fileIcon";
	}

	var FileObjectStore = declare([Evented, Stateful], {

		//==============================
		// Keyword arguments to constructor

		// autoLoad: Boolean
		autoLoad: false,

		// authToken: Object
		//		An arbitrary JavaScript object that is passed to the back-end server
		//		"as is" and may be used to implement authentication. The Server Side
		//		Applications currently DO NOT authenticate.
		authToken: null,

		// basePath: String
		//		The basePath parameter is a URI reference (rfc 3986) relative to the
		//		server's document root used to compose the root directory.
		basePath: ".",

		// defaultProperties: Object
		//		A JavaScript key:values pairs object whose properties are mixed in
		//		with any new store object.
		defaultProperties: {},

		// options: String[] || String
		//		A string of comma separated keywords or an array of keyword string.
		//		Some of the keywords are passed to the server side application and
		//		influence the server response while others are used on the client
		//		side query. The following keywords are currently supported:
		//
		//			dirsOnly				- Return only directory entries.
		//			iconClass				- Include a css icon classname
		//			showHiddenFiles	- Show hidden files
		//
		options: [],

		// preventCache: Boolean
		//		Indicates if preventCache should be passed to the XHR call or not when
		//		loading data from a url. Note: this does not mean the store calls the
		//		 server on each query, only that the data load has preventCache set as
		//		an option.
		preventCache: false,

		// sort: Object|Object[]
		//		Object or an array of sort field objects, each sort field is a JavaScript
		//		'key : value' pair object.	Valid sort field properties are: 'attribute',
		//		'descending' and 'ignoreCase'.	Each sort field object must at least have
		//		the 'attribute' property defined, the default value for both 'descending'
		//		and 'ignoreCase' is false.	 The sort operation is performed in the order
		//		in which the sort field objects appear in the sort array.
		//
		//		Example: [ {attribute:'directory', descending:true},
		//							 {attribute:'name', ignoreCase: true}
		//						 ]
		sort: [],

		// queryEngine: Function
		//		Defines the query engine to use for querying the data store
		queryEngine: QueryEngine,

		// url: String
		//		The URL of the server side application serving the cbtree FileObjectStore.
		url: "",

		// End Parameters to constructor
		//==============================

		// _localOptions: String[]
		_localOptions: ["iconClass", "dirsOnly"],

		// _rootName: String
		_rootName: ".",

		// _reservedProp: String[]
		_reservedProp: ["name", "size", "modified", "directory", "icon", C_PATH_ATTR],

		//=========================================================================
		// Constructor

		constructor: function (/*Object*/ kwArgs) {
			// summary:
			//		Creates an in-memory file object store.
			// kwArgs:
			//			{ autoLoad: Boolean?,
			//				basePath: String?,
			//				defaultProperties: Object?,
			//				options: String[]?,
			//				preventCache: Boolean?,
			//				sort: Object[]?,
			//				queryEngine: Function?,
			//				url: String?
			//			}

			this._loaded				 = new Deferred(); // Indicates if the initial load request has completed.
			this._loadInProgress = false;
			this._storeLoaded		= false;
			this._mutex					= new Mutex();

			// Local in-memory storage
			this._childIndex = {};
			this._primIndex	= {};							// An index of data indices into the _data array by id
			this._data			 = [];						 // The array of all the objects in the memory store
		},

		//=========================================================================
		// Getters & Setters (see Stateful.js)

		_basePathSetter: function (/*String*/ value) {
			// summary:
			//		Initial normalisation of the base path string. (Note: the server side
			//		application will perform final normalisation).
			// value:
			//		Base path string.
			// tag:
			//		Private
			if (typeof value === "string") {
				var baseSegm = value.replace(/\\/g, "/").split("/");
				// Remove all empty segments.
				baseSegm = baseSegm.filter( function (segment) {
					return (!!segment.length && segment != ".");
				});
				baseSegm.unshift(".");
				this.basePath = baseSegm.join("/");
			} else {
				throw new CBTError("InvalidType", "basePathSetter", "basePath property must be a string");
			}
		},

		_dataSetter: function () {
			throw new CBTError("InvalidAccess", "_dataSetter", "data property is not allowed");
		},

		_defaultPropertiesSetter: function (/*Object*/ value) {
			// summary:
			//		Set the default properties to be applied to all store objects. Note:
			//		properties provided by the back-end sever can NOT have default values.
			// value:
			//		A JavaScript key:value pairs object.
			// tag:
			//		Private
			if (value && lang.isObject(value)) {
				for (var prop in value) {
					if (this._reservedProp.indexOf(prop) != -1) {
						throw new CBTError("InvalidAccess", "_defaultPropertiesSetter", "No default allowed for property '"
																 + prop + "'" );
					}
				}
			} else {
				throw new CBTError("InvalidType", "_defaultPropertiesSetter", "defaultProperties must be an object");
			}
		},

		_sortSetter: function (/*Object|Object[]*/ value) {
			// summary:
			//		Set and validate the sort property.
			// value:
			//		A JavaScript Object or array of objects. Each such object must have an
			//		'attribute' property. Example:
			//	|	[{attribute: "directory"}, {attribute: "name", descending: true}]
			// tag:
			//		Private
			value = value instanceof Array ? value : [value];
			value.forEach( function (sortObj) {
				if (lang.isObject(sortObj)) {
					if (!("attribute" in sortObj)) {
						throw new CBTError("PropertyMissing", "_sortSetter", "[attribute] property missing in sort object");
					}
				} else {
					throw new CBTError("InvalidType", "_sortSetter", "sort property must be an Array of objects");
				}
			});
			this.sort = value;
			return value;
		},

		_optionsSetter: function (/*String[] | String*/ value) {
			// summary:
			//		 Redure the list of options to those specific to the back-end server
			//		 and create private properties for all others. The private properties
			//		are named as follows:
			//
			//			_optionCcccc
			//
			//		were Cccc is the capitalized option name.
			// value:
			//		Comma separated list of keywords or an array of keyword strings.
			// tags:
			//		private
			if (!(value instanceof Array)) {
				if (typeof value !== "string") {
					throw new CBTError("InvalidType", "_optionSetter", "Options must be a keyword string"
															+ " or an array of keywords.");
				} else {
					value = value.split(",");
				}
			}
			this.options = value.filter( function (option) {
				if (this._localOptions.indexOf(option) != -1) {
					var prop = "_option" + option.replace(/[a-z]/, function(c) {	return c.toUpperCase();});
					this[prop] = true;
					return false;
				}
				return true;
			}, this);
			return this.options;
		},

		_urlSetter: function (/*String*/ value,/*Boolean?*/ autoLoad) {
			// summary:
			//		Set the URL of the Server Side Application
			// returns:
			//		String
			// tag:
			//		Private
			var autoLoad = !!(autoLoad || this.autoLoad)

			if (typeof value === "string") {
				this._url = value;
				if (this._url && autoLoad === true) {
					this.load();
				}
				return this._url;
			} else {
				throw new CBTError("InvalidType", "_urlSetter", "URL must be of type string");
			}
		},

		//=========================================================================
		// Private methods

		_deleteFromStore: function (/*Object*/ dataObject) {
			// summary:
			//		Delete a set of items from the in memory store.
			// dataObject:
			//		A JavaScript key:values pair object. The dataObject represents the
			//		server response (see cbtree/stores/server/PHP/cbtreeFileStore.php
			//		for a detailed description and layout of the response).
			// returns:
			//		dojo/promise/Promise	--> true | false
			// tag:
			//		Private
			var items	= dataObject.items;
			var index	= this._primIndex;
			var chdIdx = this._childIndex;
			var data	 = this._data;
			var self	 = this;
			var i;

			function deleteChild(id) {
				// summary:
				//		Remove a child from its parent.
				// id:
				//		Object identification
				// tag:
				//		Private
				var storeItem = data[index[id]];
				var children, idx;

				if (storeItem) {
					if(children = chdIdx[storeItem.parent]) {
						if ((idx = children.indexOf(storeItem)) != -1) {
							children.splice(idx,1);
						}
					}
				}
			} /* end deleteChild() */

			function deleteItem( item ) {
				// summary:
				//		Delete an item and all its children from the store. In addition,
				//		the item is also removed from its parent list of children.
				// item:
				//		Item to delete from the store.
				// tag:
				//		Private
				if (item.directory) {
					if (item.children) {
						item.children.forEach( deleteItem );
					}
					item[C_ITEM_EXPANDED] = false;
				}
				var id = self.getIdentity(item);
				deleteChild(id);
				delete data[index[id]];
				delete chdIdx[id];
			} /* end deleteItem() */

			if (items && items.length) {
				return this._mutex.aquire( function () {
					items.forEach( deleteItem );
					//	Purge sparse array and re-index..
					this._data = data.filter( function () {return true});
					this._primIndex = {};

					for (i=0; i<this._data.length; i++) {
						this._primIndex[this._data[i][C_PATH_ATTR]] = i;
					}
					this._mutex.release(true);
				}, this);
			}
			return new Deferred().resolve(false);
		},

		_fetchFromServer: function (/*String*/ path, /*Object?*/ queryOptions, /*Deferred?*/ deferred) {
			// summary:
			//		Load a file/directory from the back-end server.
			// path:
			//		File or directory name.
			// queryOptions:
			// deferred:
			// returns:
			//		dojo/Deferred	--> Server response
			// tag:
			//		Private
			var deferred = deferred || new Deferred();
			var options	= {path: path};
			var self		 = this;
			var promise;

			if (queryOptions) {
				options.queryOptions = queryOptions;
			}
			promise = this._xhrRequest( "GET", this._url, options);
			promise.then(
				function (dataObject) {
					when( self._updateFileStore(dataObject), deferred.resolve, deferred.reject );
				},
				function (err) {
					fixException(err);
					deferred.reject(err);
				});
			return deferred;
		},

		_fetchFromStore: function (/*String*/ id) {
			// summary:
			//		Get an object from the in-memory store by its id.
			// id:
			//		Object identification.
			// tag:
			//		Private
			return this._data[ this._primIndex[id] ]
		},

		_resyncStore: function (/*Object*/ item) {
			// summary:
			//		Resynchronize the store. Whenever a XHR request on an existing store item
			//		returns the HTTP status codes 404 or 410 it is an indication the store is
			//		out of sync.	This can happen when the file system on the back-end server
			//		changed due to other server-side processes.
			//		To resynchronize the store an attempt is made to reload the parent of the
			//		failed item	so any other changes to the parent directory are captured at
			//		 the same time.	 This process is recursive until a parent in the upstream
			//		chain is successfully reloaded.
			// item:
			//		Store item that returned a 404 or 410 HTTP status code.
			// tag:
			//		Private
			var dataObject = {total: 1, status: 200, items:[]};
			var parentId	 = item.parent;
			var self			 = this;

			function nestChildren (item) {
				if (item.directory) {
					item.children = self._childIndex[self.getIdentity(item)];
					item.children.forEach( function (child) {
						nestChildren(child);
					})
				}
				return item;
			}
			//	Compose a server style response object (eg. with nested children).
			dataObject.items.push( nestChildren(item) );
			this._deleteFromStore(dataObject);

			var result = this._fetchFromServer( parentId );
			result.then( null, function (error) {
				switch (error.response.status) {
					case 404:
					case 410:
						// Call the public method remove() instead of calling _resyncStore()
						// directly, this makes the removal of the parent observable.
						self.remove(parentId);
						break;
				}
			});
		},

		_updateFileStore: function (/*Object*/ dataObject) {
			// summary:
			//		Update the store with the objects contained in the dataObject.
			// dataObject:
			//		A JavaScript key:values pair object. The dataObject represents the
			//		server response (see cbtree/stores/server/PHP/cbtreeFileStore.php
			//		for a detailed description and layout of the response).
			//		The typical server response layout looks like:
			//			{ total: file_count, status: http_status, items:[{},...] }
			// returns:
			//		dojo/promise/Promise	-->	Object[]
			// tag:
			//		Private
			var files = [];
			var self	= this;

			function updateChildren( oldChildren, newChildren ) {
				// summary:
				//		Remove the old children that no longer appear in the list of new
				//		children.
				// oldChildren:
				//		Array of child objects currently in the in-memory store.
				// newChildren:
				//		Array of child objects reported by the back-end server.
				// tag:
				//		Private
				var identity, exist;

				if (oldChildren) {
					oldChildren.forEach( function (oldChild) {
						identity = self.getIdentity(oldChild);
						exist = newChildren.some( function (newChild) {
							return identity === self.getIdentity(newChild);
						});
						if (!exist) {
							// Remove from the in-memory store only.
							self.remove(identity, true);
						}
					});
				}
			}

			function updateFile(/*Object*/ item,/*Boolean*/ evented) {
				// summary:
				//		Add or update an item in the in-memory store.
				// item:
				//		Object to be added or updated.
				// evented:
				//		If true and the store is loaded the public put() method is called
				//		to update the store making the operation observable/eventable.
				// tag:
				//		Private
				var identity = self.getIdentity(item);
				var oldItem	= self._fetchFromStore(identity);
				var children = item.children;
				var parentId =	parent(item.path);
				var property;
				var index;

				function addToParent(item) {
					var siblings = self._childIndex[item.parent] || [];
					if (siblings.indexOf(item) == -1) {
						siblings.push(item);
						self._childIndex[item.parent] = siblings;
					}
				}

				// Prepare item for storage...
				item.parent = parentId;
				delete item.children;
				delete item.oldPath;

				if (oldItem) {
					if (oldItem.directory && item[C_ITEM_EXPANDED]) {
						updateChildren( self._childIndex[identity], children );
					}
					item = lang.mixin( oldItem, item );
				} else {
					// It's a new store item, add any default properties and optional icon
					// class.
					for (property in self.defaultProperties) {
						item[property] = item[property] || self.defaultProperties[property];
					}
					if (self._optionIconClass) {
						setIconClass(item);
					}
				}

				if (oldItem) {
					index = self._primIndex[identity];
					self._data[index] = item;
				} else {
					index = self._data.push(item) - 1;
					self._primIndex[identity] = index;
				}
				addToParent(item);

				if (self._storeLoaded && evented) {
					// If this is a new item	create a temporary place holder to prevent
					// an evented put() from trying to get the same item from the server
					// before the new item is actually stored. An evented put() tries to
					// get the item first to determine if it is a new or updated item.
					// (See Evented.js).
					if (!oldItem) {
						self._data[index] = lang.delegate(item, {_placeHolder: true});
					}
					// Call public store.put() to make it an observable event.
					self.put( item, {overwrite: true, _server: true} );
				}

				if (children) {
					children.forEach( function (child) {
						updateFile(child, false);
					});
				}
				return item;
			} /* end updateFile() */

			// Process all file objects received from the server. The standard server
			// response looks like: { total: file_count, status: http_status, items:[{},...] }
			if (dataObject && dataObject.items) {
				var items = dataObject.items;

				return this._mutex.aquire( function () {
					items.forEach( function (item) {
						if (self.getIdentity(item)) {
							files.push( updateFile(item, true) );
						} else {
							// Item has not identity
						}
					});
					this._mutex.release(files);
				}, this );
			}
			throw new CBTError("InvalidResponse", "_updateFileStore");
		},

		_xhrRequest: function (/*String*/ method,/*String*/ url,/*Object*/ options ) {
			// summary:
			//		Issue a XHR request
			// method:
			//		HTTP method.
			// url:
			//		The URL of the server side application
			// options:
			//		A JavaScript key:value pairs object. The properies of the object
			//		are converted into the HTTP query string.
			// returns:
			//		dojo/promise/Promise	--> Server Response
			// tag:
			//		Private
			var xhrOptions = { method: method, preventCache: this.preventCache,	handleAs: "json" };
			var options = lang.mixin(options, {authToken: this.authToken, basePath: this.basePath});
			var queryString = "";
			var self = this;
			var key, value;

			switch (method) {
				case "POST":
					var data = { basePath: this.basePath, path: options.path, newValue: options.newValue };
					xhrOptions.data = data;
					break;
				case "GET":
					options.options = this.options;
					/* NO BREAK HERE */
				case "DELETE":
					for (key in options) {
						if (value = options[key]) {
							if (value instanceof Array && !value.length) {
								continue;
							}
							queryString += "&" + key + "=" + json.stringify(value);
						}
					}
					break;
			}
			if (queryString.length) {
				xhrOptions.query = queryString;
			}
			var result = request( url, xhrOptions);
			return result;
		},

		//=========================================================================
		// Public cbtree/store/api/Store API methods

		add: function (object, options) {
			// summary:
			//		Not allowed.
			throw new CBTError("InvalidAccess", "add", "operation not allowed, use get() and put() instead");
		},

		get: function (/*String|number*/ id, /*Boolean?*/ storeOnly) {
			// summary:
			//		Retrieves an object by its identity. If the object doesn't exist in
			//		the store, an attempt is made to load the object from the server.
			// id: String|Number
			//		The identity used to lookup the object
			// storeOnly:
			//		Boolean, indicates if only the in memroy store is to be checked or
			//		in case the item doesn't exists, an attempt should be made to fetch
			//		the item from the server.
			// returns:
			//		dojo/promise/Promise	--> Object
			// tag:
			//		Public
			var object = this._data[this._primIndex[id]];
			if (!object && !storeOnly) {
				if(!this._loadInProgress) {
					var result = this._fetchFromServer(id, this.options);
					return result.promise;
				} else {
					// TODO: Handle get() request when the initial store load in ongoing.
				}
			} else {
				// If the object is just a place holder return 'undefined'.
				// (See _updateFileStore.updateFile() for additonal info.)
				if (object && object._placeHolder) {
					return new Deferred().reject( new CBTError("NotFound", "get") );
				}
			}
			return new Deferred().resolve(object);
		},

		getChildren: function (/*Object*/ object, /*Store.QueryOptions*/ options) {
			// summary:
			//		Retrieves the children of a store object.
			// object:
			//		The object to find the children of.
			// options:
			//		Additional options to apply to the retrieval of the children.
			// returns:
			//		dojo/store/api/Store.queryResults.
			// tag:
			//		Public
			var objId	= this.getIdentity(object);
			var query	= {parent: objId};
			var self	 = this;
			var result = [];

			if (this.sort) {
				if (options) {
					options.sort = options.sort || this.sort;
				} else {
					options = {sort: this.sort};
				}
			}

			if (objId && object.directory) {
				if (!object[C_ITEM_EXPANDED]) {
					result = self._fetchFromServer( objId );
					return result.then(
						function () {
							return self.query( query, options, self._childIndex[objId] );
						},
						function (err) {
							switch (err.response.status) {
								case 404:
								case 410:
									// Object no longer exist on the server, go cleanup.
									self._resyncStore(object);
									break;
								default:
									return err;
							}
							return self.query( query, options, self._childIndex[objId]);
						});
				}
				return self.query( query, options, self._childIndex[objId] );
			}
			return QueryResults( result );
		},

		getIdentity: function (/*Object*/ object) {
			// summary:
			//		Returns an object's identity
			// object:
			//		The object to get the identity from
			// returns:
			//		String
			// tag:
			//		Public
			return object[C_PATH_ATTR];
		},

		isItem: function (/*Object*/ object) {
			// summary:
			//		Test if object is a member of this store.
			// object:
			//		Object to test.
			// returns:
			//		Boolean true of false
			// tag:
			//		Public
			if (object && typeof object == "object") {
				return (object == this.get(this.getIdentity(object)));
			}
			return false;
		},

		load: function (/*Object*/ options) {
			// summary:
			//		Initiate store load.
			// options:
			//		A JavaScript key:value pairs object
			// tag:
			//		Public, Extension
			var queryOptions = { deep: (options ? !!options.all : false) };
			var result			 = this._loaded;
			var self				 = this;

			if (!this._storeLoaded && !this._loadInProgress) {
				this._loadInProgress = true;
				result = this._fetchFromServer( null, queryOptions, this._loaded)
				result.then(
					function (files) {
						self.emit("load", {type:"load", store: self});
						self._loadInProgress = false;
						self._storeLoaded		= true;
					},
					function (err) {
						self.emit("error", {type:"load", error: err, store: self});
					});
			}
			return result.promise;
		},

		put: function (object, options) {
			// summary:
			//		Update an object
			// object:
			//		A JavaScript key:value pairs Object.
			// options:
			//		dojo/store/api/Store.putDirectives
			// returns:
			//		String.
			// tag:
			//		Public
			var id = this.getIdentity(object);
			if (id) {
				var index = this._primIndex;
				var data	= this._data;
				if(id in index) {
					data[index[id]] = object;
				} else {
					// Only internal put requests are allowed to add new items to the store.
					// (see updateFile() for additional info).
					if (options && options._server === true) {
						index[id] = data.push(object) - 1;
					} else {
						throw new CBTError("NotFound", "put");
					}
				}
				return id;
			}
			throw new CBTError("InvalidObject", "put");
		},

		query: function (/*Object*/ query, /*Object?*/ options, /*Object[]?*/ _dataSet) {
			// summary:
			//		Queries the store for objects.
			// query:
			//		The query to use for retrieving objects from the store. The query is
			//		a JavaScript key:value pairs object.
			// options:
			//		dojo/store/api/Store.QueryOptions. The optional arguments to apply to
			//		the resultset.
			// _dataSet:
			//		Optional array of store objects. This parameter is reserved for internal
			//		use only.
			// returns:
			//		dojo/store/api/Store.QueryResults
			// tag:
			//		Public
			var query = query || {name: this._rootName};
			var data	= _dataSet != undef ? _dataSet : this._data;
			var self	= this;

			if (this._optionDirsOnly && !query.directory) {
				query.directory = true;
			}
			if (this.sort) {
				if (options) {
					options.sort = options.sort || this.sort;
				} else {
					options = {sort: this.sort};
				}
			}

			if (!this._storeLoaded) {
				if (!this._loadInProgress) {
					this.loadStore();
				}
				return when (this._loaded, function () {
					return QueryResults(self.queryEngine(query, options)(data));
				});
			}
			return QueryResults(self.queryEngine(query, options)(data));
		},

		ready: function (callback, errback) {
			// summary:
			//
			// returns:
			//		dojo/promise/Promise
			// tag:
			//		Public
			return this._loaded.then(callback, errback);
		},

		remove: function (/*String|number*/ id, /*Boolean?*/ _storeOnly) {
			// summary:
			//		Deletes an object by its identity
			// id:
			//		The identity to use to delete the object
			// _storeOnly:
			//		Indicate if the item is to be removed from the in memory store only.
			//		This parameter is reserved for the rename() method...
			// returns:
			//		dojo/promise/Promise
			// tag:
			//		Public
			var deferred = new Deferred();
			var self		 = this;

			this.get(id).then(
				function (item) {
					if (!_storeOnly) {
						var result = self._xhrRequest( "DELETE", self._url, {path: item.path});
					} else {
						var result = new Deferred().resolve( {total: 1, status: 200, items:[item]} );
					}
					result.then(
						function (data) {
							when( self._deleteFromStore(data), deferred.resolve, deferred.reject );
						},
						function (err) {
							switch (err.response.status) {
								case 404:
								case 410:
									self._resyncStore( item );
									deferred.resolve(false);
									break;
								default:
									deferred.reject(err);
									break;
							}
						}
					);
				},
				deferred.reject
			);	/* end then() */
			return deferred.promise;
		},

		rename: function (/*Object*/ object, /*String*/ newPath) {
			// summary:
			// object:
			//		Existing store object.
			// newPath:
			//		New path of the object.
			// returns:
			//		dojo/promise/Promise	--> newPath
			// tag:
			//		Public, Extension
			var deferred = new Deferred();
			var self		 = this;

			if (newPath && typeof newPath === "string") {
				var itemId = this.getIdentity(object);
				this.get(itemId).then(
					function (item) {
						var result = self._xhrRequest("POST", self._url, {path: item.path, newValue: newPath});
						result.then(
							function (data) {
								self._updateFileStore(data);	// Add object to its new parent
								self.remove(itemId, true);		// Remove (observable) the old instance
								deferred.resolve(newPath);
							},
							function (err) {
								switch (err.response.status) {
									case 404:
									case 410:
										self._resyncStore(item);
										deferred.reject(new CBTError("NotFound", "rename", "Object nolonger exist"));
										break;
									default:
										deferred.reject(err);
										break;
								}
							}
						);
					},
					deferred.reject
				); /* end then() */
				return deferred.promise;
			}
			return deferred.reject( new CBTError("InvalidPath", "rename") );
		}

	});	/* end declare() */

	return FileObjectStore;

});

//
// Copyright (c) 2010-2013, Peter Jekel
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
define(["dojo/_base/array",
				"dojo/_base/declare",
				"dojo/_base/json",
				"dojo/_base/lang",
				"dojo/_base/window",
				"dojo/_base/xhr",
				"dojo/Evented",
				"./util/filter",
				"./util/sorter"
], function (array, declare, json, lang, window, xhr, Evented, filterUtil, sorter) {
	// module:
	//		cbtree/stores/FileStore
	// summary:
	//		The cbtree FileStore implements the dojo/data/api/Read API and parts of the
	//		dojo/data/api/Write API.   The partial write API allows applications to add
	//		custom attributes to items not provided by the server side application such
	//		as a checked state. The in-memory FileStore is dynamic in that items may be
	//		added, removed or change based on the responses  received from the back-end
	//		server. In addition, the FileStore fully supports lazy loading.
	//
	//		Store restrictions:
	//
	//			- Items (files) can be deleted or renamed BUT no store items can be added
	//				programmatically.    In order to delete and/or rename files, the Server
	//				Side Application must be configured to support the HTTP DELETE and/or
	//				POST methods otherwise a 405 status code is returned.
	//			- All data contained in the store is considered 'read-only' with the
	//				exception of custom attributes, therefore setValue() and setValues()
	//				is only allowed on custom attributes.
	//			- Custom attributes are not passed to the back-end server.
	//			- A subset of the generic StoreModel-API is supported.
	//
	//		Server Side Application:
	//
	//			Currently two implementations of the Server Side Application are available:
	//
	//				cbtree/stores/server/PHP/cbtreeFileStore.php
	//				cbtree/stores/server/CGI/bin/cbtreeFileStore.cgi
	//
	//			Please refer to the File Store documentation for details on the Server Side
	//			Application. (cbtree/documentation/FileStore.md)

	var C_STORE_REF_PROP = "_S";       // Default name for the store reference to attach to every item.
	var C_STORE_ROOT     = "_SR";      // Identifies a store item as the store root. (only one allowed).
	var C_PARENT_REF     = "_PRM";     // Default attribute for constructing a parent reference map.
	var C_ITEM_EXPANDED  = "_EX";      // Attribute indicating if a directory item is fully expanded.
	var C_CHILDREN_ATTR  = "children";
	var C_PATH_ATTR      = "path";     // Path attribute (used as the identifier)

	var FileStore = declare([Evented],{
		constructor: function (/*Object*/ args) {
			// summary:
			//		File Store constructor.
			//	args: { basePath: String,
			//				  cache: Boolean,
			//					clearOnClose: Boolean
			//					failOk: Boolean,
			//					options: String[],
			//					url: String,
			//					urlPreventCache: Boolean
			//				}

			this._features = { 'dojo.data.api.Read':true,
												 'dojo.data.api.Write':true,
												 'dojo.data.api.Identity':true,
												 'dojo.data.api.Notification': true
												};

			this._loadInProgress   = false; // Indicates if a load request is in progress.
			this._loadFinished     = false; // Indicates if the initial load request has completed.
			this._closePending     = false; // Indicates if a close request is in progress or pending
			this._requestQueue     = [];     // Pending list of requests.
			this._authToken        = null;  // Authentication Token
			this._itemsByIdentity  = {};
			this._allFileItems     = [];
			this._privateAttrs     = [ C_STORE_REF_PROP, C_PARENT_REF, C_ITEM_EXPANDED, C_STORE_ROOT ];
			this._readOnlyAttrs    = ["name", "size", "modified", "directory", "icon", C_CHILDREN_ATTR, C_PATH_ATTR];
			this._rootDir          = null;
			this._rootId           = ".";

			for(var prop in args) {
				this.set(prop, args[prop]);
			}
			dojo.deprecated("{cbtree/data/FileStore}", "Migrate to cbtree/store/FileStore", "2.0");
		},

		//==============================
		// Parameters to constructor

		// authToken: Object
		//		An arbitrary JavaScript object that is passed to the back-end server "as is"
		//		and may be used to implement authentication. The Server Side Applications
		//		currently DO NOT authenticate.
		authToken: null,

		// basePath: String
		//		The basePath parameter is a URI reference (rfc 3986) relative to the server's
		//		document root used to compose the root directory.
		basePath: ".",

		// cache: Boolean
		cache: false,

		// clearOnClose: Boolean
		//		Parameter to allow users to specify if a close call should force a reload or not.
		//		By default, it retains the old behavior of not clearing if close is called.  But
		//		if set true, the store will be reset to default state.  Note that by doing this,
		//		all item handles will become invalid and a new fetch must be issued.
		clearOnClose: false,

		// failOk: Boolean
		//		Parameter for specifying that it is OK for the xhrGet call to fail silently.
		failOk: false,

		// options: String[] || String
		//		A string of comma separated keywords or an array of keyword string. The keywords
		//		are passed to the server side application and influence the server response.
		//		The following keywords are currently supported:
		//
		//			dirsOnly				- Return only directory entries.
		//			iconClass				- Include a css icon classname
		//			showHiddenFiles	- Show hidden files
		//
		options: [],

		// url: String
		//		The URL of the server side application serving the cbtree FileStore.
		url: "",

		// urlPreventCache: Boolean
		//		Parameter to allow specifying if preventCache should be passed to the xhrGet call
		// 		or not when loading data from a url. Note this does not mean the store calls the
		// 		server on each fetch, only that the data load has preventCache set as an option.
		// 		Added for tracker: #6072
		urlPreventCache: false,

		// End Parameters to constructor
		//==============================

		moduleName: "cbTree/store/FileStore",

		_addIconClass: false,

		// _labelAttr: [private] String
		//		The default label property of the store items. This property can be overwritten
		//		by the initial server response.
		_labelAttr: "name",

		// _validated: [private] Boolean
		//		Indicates if the store has been validated. This property has no real
		//		value to the store itself but is used by the model(s) operating on
		//		the store. It is as a shared variable amongst models.
		_validated: false,

		//=========================================================================
		// Private Methods

		_assertIsItem: function (/*item*/ item) {
			// summary:
			//		This function tests whether the item passed in is indeed an item in the store.
			//	item:
			//		The item to test for being contained by the store.
			//	tags:
			//		private
			if (!this.isItem(item)) {
				throw new Error(this.moduleName+"::_assertIsItem(): Invalid item argument.");
			}
		},

		_assertIsAttribute: function (/*String */ attribute, /*string*/ funcName) {
			// summary:
			//		This function tests whether the item passed in is indeed a valid 'attribute'
			//		like type for the store.
			//	attribute:
			//		The attribute to test for being contained by the store.
			//	tags:
			//		private
			if (typeof attribute !== "string") {
				throw new Error(this.moduleName+"::"+funcName+"(): Invalid attribute argument.");
			}
		},

		_assertSupport: function (/*string*/ name) {
			// summary:
			//		Throw an error if an unsupported function is called. See the common store
			//		model API cbtree/models/StoreModel-API and cbtree/models/ItemWriteStoreEX
			//		for details.
			throw new Error(this.moduleName+"::"+name+"(): Function not supported on a File Store.");
		},

		_containsValue: function (	/*item*/ item, /*String*/ attribute, /*AnyType*/ value,/*RegExp?*/ regexp) {
			// summary:
			//		Internal function for looking at the values contained by the item.
			//		This function allows for denoting if the comparison should be case
			//		sensitive for strings or not.
			// item:
			//		The data item to examine for attribute values.
			// attribute:
			//		The attribute to inspect.
			// value:
			//		The value to match.
			// regexp:
			//		Optional regular expression generated off value if value is of type string
			//		to handle wildcarding. If present and attribute values are string, then it
			//		can be used for comparison instead of 'value'
			// tags:
			//		private
			if(typeof item[attribute] !== "undefined") {
				return array.some(this.getValues(item, attribute), function (possibleValue) {
					if (possibleValue !== null && !lang.isObject(possibleValue) && regexp) {
						if (possibleValue.toString().match(regexp)) {
							return true; // Boolean
						}
					}else if (value === possibleValue) {
						return true; // Boolean
					}
				});
			} else {
				// NOTE: An undefined attribute is treated as an attribute with value 'false'.
				return (value === false || value === undefined)
			}
		},

		_deleteFromServer: function (/*Object*/ keywordArgs) {
			// summary:
			//		Delete an item from the back-end server. A XHR delete is issued and the
			//		server response includes the file(s) that have succesfully been deleted.
			//		Only those items, if loaded, will be deleted from the store.
			// keywordArgs:
			// tag:
			//		Private
			var scope = keywordArgs.scope || window.global;
			var item  = keywordArgs.item;
			var path  = this.getPath(item);
			var oper  = "DELETE";
			var self  = this;

			if (this._loadInProgress) {
				this._queueRequest({args: keywordArgs, func: this._deleteFromServer, scope: self});
			} else {
				this._loadInProgress = true;

				var request    = { path: path };
				var delArgs    = this._requestToArgs(oper, request);
				var delHandler = xhr.del(delArgs);
				var items;

				delHandler.addCallback(function (data) {
					try{
						items = self._updateFileStore(oper, data, keywordArgs);
						self._loadInProgress = false;
						if (keywordArgs.onComplete) {
							keywordArgs.onComplete.call(scope, items);
						}
					} catch (error) {
						self._loadInProgress = false;
						if (keywordArgs.onError) {
							keywordArgs.onError.call(scope, error);
						}	else {
							console.error(error);
						}
					}
					self._handleQueuedRequest();
				});
				delHandler.addErrback(function (error) {
					self._loadInProgress = false;
					switch(delArgs.status) {
						case 404:		// Not Found
						case 410:		// Gone
							// item was already deleted on the server
							self._resyncStore(item, true);
							break;
						case 400:		// Bad Request
						case 405:		// Method Not Allowed
						case 500:		// Server error.
						default:
							if (keywordArgs.onError) {
								keywordArgs.onError.call(scope, error, delArgs.status);
							}
							break;
					}
					self._handleQueuedRequest();
				});
			}
		},

		_deleteFromStore: function (/*item*/ item, /*Boolean*/ onSetCall) {
			// summary:
			//		Delete an item from the store. This function is internal to the store.
			// item:
			//		Valid store item to be deleted.
			// onSetCall:
			//		Indicate if onSet() should be called.
			// returns:
			//		An array of deleted file store items. Note: Only items that are loaded
			//		in the store are included in the list eventhough many more files may
			//		have been deleted from the server.
			// tags:
			//		private
			var identity = item[C_PATH_ATTR];
			var parent   = this.getValue(item, C_PARENT_REF);
			var siblings = this.getValues(parent, C_CHILDREN_ATTR);
			var delItems = [];

			if (item.directory) {
				var children = this.getValues(item, C_CHILDREN_ATTR);
				var delChild;
				var i;

				for(i=0; i<children.length; i++) {
					delChild = this._deleteFromStore(children[i], false);
					delItems = delItems.concat(delChild);
				}
				item[C_ITEM_EXPANDED] = false;
			}
			this._removeArrayElement(this._allFileItems, item);
			this._removeArrayElement(siblings, item);
			delete this._itemsByIdentity[identity];
			item[C_STORE_REF_PROP] = null;
			item["deleted"]        = true;
			delItems.push(item);

			this._setValues(parent, C_CHILDREN_ATTR, siblings, onSetCall);
			this.onDelete(item);
			return delItems;
		},

		_fetchFinal: function (/*Object*/ requestArgs, /*item[]?*/ arrayOfItems) {
			// summary:
			// 		On completion of a fetch operation, _fetchFinal() is called to filter
			//		and sort the set of selected items and call the appropriate callbacks.
			// requestArgs:
			// arrayOfItems:
			// tag:
			//		private
			var scope = requestArgs.scope || window.global,
					self  = this,
					items = [],
					count = 0;

			function filterItems (requestArgs, arrayOfItems) {
				// summary:
				var queryOptions = requestArgs.queryOptions || {},
						ignoreCase   = queryOptions.ignoreCase || false,
						query        = requestArgs.query || null,
						items        = [],
						i;

				if (arrayOfItems) {
					if (query) {
						var regexpList = {},
								match, fileItem,
								key, value;

						for(key in query) {
							value = query[key];
							if(typeof value === "string") {
								regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
							}else if(value instanceof RegExp) {
								regexpList[key] = value;
							}
						}
						for(i = 0; i < arrayOfItems.length; ++i) {
							fileItem = arrayOfItems[i];
							match = true;
							for(key in query) {
								value = query[key];
								if(!self._containsValue(fileItem, key, value, regexpList[key])) {
									match = false;
									break;
								}
							}
							if(match) {
								items.push(fileItem);
							}
						}
					} else {
						items = arrayOfItems.slice(0);
					}
					// Finally, sort slice and dice....
					if(items.length && requestArgs.sort) {
						var sortList = new sorter(requestArgs.sort);
						items.sort(sortList.sortFunction());
					}

					var start = requestArgs.start ? requestArgs.start : 0;
					var count = (requestArgs.count && isFinite(requestArgs.count)) ? requestArgs.count : items.length;

					if (start || count !== items.length) {
						items = items.slice(start, start+count);
					}
					return items;
				}
				return null;
			} /* end filterItems() */

			// If an abort() method wasn't already provided do it now.
			requestArgs.abort = function () { this.aborted = true; };
			requestArgs.store = this;

			if (requestArgs.aborted !== true) {
				items = filterItems(requestArgs, arrayOfItems);
				count = items ? items.length : -1;
				if (requestArgs.onBegin) {
					requestArgs.onBegin.call(scope, count, requestArgs);
				}
				if (requestArgs.onItem && count > 0) {
					for (i=0; (i<count && requestArgs.aborted !== true);i++) {
						requestArgs.onItem.call(scope, items[i], requestArgs);
					}
				}
				if (requestArgs.onComplete) {
					if (requestArgs.onItem || requestArgs.aborted || count < 0) {
						requestArgs.onComplete.call(scope, null, requestArgs);
					} else {
						requestArgs.onComplete.call(scope, items, requestArgs);
					}
				}
			}
			// The following is an extension to the dojo.data.api.Read API
			if (requestArgs.onAbort && requestArgs.aborted) {
				requestArgs.onAbort.call(scope, requestArgs);
			}
		},

		_getItemsArray: function (/*Object?*/ queryOptions) {
			//	summary:
			//		Internal function to determine which list of items to search over.
			//	queryOptions:
			//		The query options parameter, if any.
			if(queryOptions && queryOptions.deep) {
				return this._allFileItems;
			}
			return this._rootDir[C_CHILDREN_ATTR];
		},

		_getItemByIdentity: function (/*String*/ identity) {
			// summary:
			// identity:
			var item  = null;

			if (this._itemsByIdentity) {
				if (Object.hasOwnProperty.call(this._itemsByIdentity, identity)) {
					item = this._itemsByIdentity[identity];
				}
			}
			return item;
		},

		_handleQueuedRequest: function () {
			// summary:
			//		Internal function to execute delayed request in the store.
			//		Execute any deferred store requests now.
			// tags:
			//		private
			var delayedFunc,
					fData;

			while(this._requestQueue.length > 0 && !this._loadInProgress)
			{
					fData = this._requestQueue.shift()
					delayedFunc = fData.func;

					delayedFunc.call(fData.scope, fData.args);
			}
		},

		_isPrivateAttr: function (/*string*/ attr) {
			// summary:
			//		Returns true is attr is one of the private item attributes.
			// attr:
			//		Attribute name string to be tested.
			// tags:
			//		private
			var i;

			for(i in this._privateAttrs) {
				if (attr == this._privateAttrs[i]) {
					return true;
				}
			}
			return false;
		},

		_isReadOnlyAttr: function (/*string*/ attr) {
			// summary:
			//		Returns true is attr is one of the static item attributes.
			// attr:
			//		Attribute name string to be tested.
			// tags:
			//		private
			var i;

			for(i in this._readOnlyAttrs) {
				if (attr == this._readOnlyAttrs[i]) {
					return true;
				}
			}
			return false;
		},

		_queueRequest: function (/*Object*/ requestObj) {
			// summary:
			//		Whenever a new request comes in while an other request is being processed
			//		the request is queued for later processing. If however, a close request is
			//		either in progress or pending any new request is terminated immediately.
			// requestObj:
			//		A JavaScript object holding the function and the associated set of request
			//		arguments to be executed.
			// tag:
			//		Private
			if (!this._closePending) {
				this._requestQueue.push(requestObj);
			} else {
				var requestArgs = requestObj.args;
				requestArgs.closePending = true;
				this._fetchFinal(requestArgs, null);
			}
		},

		_removeArrayElement: function (/*item[]*/ arrayOfItems, /*AnyType*/ element) {
			// summary:
			//		Remove an element/item from an array
			// arrayOfItems:
			//		Array which may hold element.
			// element:
			//		The element to be removed.
			// tags:
			//		private
			var index = array.indexOf(arrayOfItems, element);
			if (index != -1) {
				arrayOfItems.splice(index, 1);
				return true;
			}
			return false;
		},

		_renameItem: function (/*Object*/ keywordArgs) {
			// summary:
			//		Rename a file on the back-end server.
			// keywordArgs:
			// tag:
			//		Private
			var scope = keywordArgs.scope || window.global;
			var item  = keywordArgs.item;
			var path  = this.getPath(item);
			var oper  = "POST";
			var self  = this;

			if (this._loadInProgress) {
				this._queueRequest({args: keywordArgs, func: this._renameItem, scope: self});
			} else {
				this._loadInProgress = true;
				var newPath     = keywordArgs.newValue;
				var request     = { path: path, newValue: newPath };
				var postArgs    = this._requestToArgs(oper, request);
				var postHandler = xhr.post(postArgs);
				postHandler.addCallback(function (data) {
					try {
						self._updateFileStore(oper, data, keywordArgs);
						self._loadInProgress = false;
						if (keywordArgs.onItem) {
							keywordArgs.onItem.call(scope, self._getItemByIdentity(newPath));
						}
					} catch(error) {
						self._loadInProgress = false;
						if (keywordArgs.onError) {
							keywordArgs.onError(error);
						} else {
							console.error( error );
						}
					}
					self._handleQueuedRequest();
				});
				postHandler.addErrback(function (error) {
					self._loadInProgress = false;
					switch(postArgs.status) {
						case 404:		// Not Found
						case 410:		// Gone
							self._resyncStore(item);
							break;
					}
					if (keywordArgs.onError) {
						keywordArgs.onError.call(scope, error, postArgs.status);
					}
					self._handleQueuedRequest();
				});
			}
		},

		_requestToArgs: function (/*string*/ requestType, /*Object*/ request) {
			// summary:
			//		Compile the list of XHR GET arguments base on the request object.
			//		Note: No query arguments are passed to the server.
			// requestType:
			//		Type of XHR request (GET, DELETE or POST)
			// request:
			// tags:
			//		private
			var reqParams = {},
					xhrArgs   = null,
					sync      = false;

			if (this.basePath) {
				reqParams.basePath = this.basePath;
			}
			if (request.path) {
				reqParams.path = request.path;
			}
			if (this.authToken) {
				reqParams.authToken = json.toJson(this.authToken);
			}
			if (request.sync) {
				sync = request.sync;
			}

			switch (requestType) {
				case "DELETE":
					break;
				case "GET":
					if (request.queryOptions) {
						reqParams.queryOptions = json.toJson(request.queryOptions);
					}
					if (this.options && this.options.length) {
						reqParams.options = json.toJson(this.options);
					}
					break;
				case "POST":
					if (request.newValue) {
						reqParams.newValue	= request.newValue;
					}
					break;
			}

			// Create the XHR arguments object. The 'status' property is an extra property
			// which is used during evaluation of the server response.
			xhrArgs = {	url: this.url,
									handleAs: "json",
									content: reqParams,
									preventCache: this.urlPreventCache,
									handle: function (result, ioArgs) {
										this.status = ioArgs.xhr.status;
									},
									failOk: this.failOk,
									status: 200,	// Assume success. (HTTP OK)
									sync: sync }

			return xhrArgs;
		},

		_resyncStore: function (/*item*/) {
			// summary:
			//		Resynchronize the store. Whenever a XHR request on an existing store item
			//		returns the HTTP status codes 404 or 410 it is an indication the store is
			//		out of sync.  This can happen when the file system on the back-end server
			//		changed due to other processes.
			//		To resynchronize the store an attempt is made to reload the parent of the
			//		failed item  so any other changes to the parent directory are captured at
			// 		the same time.   This process is recursive until a parent in the upstream
			//		chain is successfully reloaded, in which case _updateFileStore(), called
			//		by loadItem, will take care of the cleanup process OR until the failing
			//		item has no parent. In the latter case it basically means the stores root
			//		directory has been deleted or the File Store is corrupt.
			// item:
			//		Store item that returned a 404 or 410 HTTP status code.
			// tag:
			//		Private
			var parent = this.getParents(item)[0];

			if (parent) {
				var request = { item: parent, forceLoad: true };
				this.loadItem( request );
			} else {
				// Regardless of the condition, we can't recover from this.
				if (item === this._rootDir) {
					throw new Error(this.moduleName+"::_resyncStore(): Store root directory failed to reload.");
				} else {
					throw new Error(this.moduleName+"::_resyncStore(): File Store is corrupt.");
				}
			}
		},

		_setAuthTokenAttr: function (/*Object*/ token) {
			// summary:
			//		Set a custom defined authentication token. The token is passed to the
			//		back-end server "as is".
			// token:
			//		Object, Authentication token
			// tag:
			//		experimental
			if (lang.isObject(token)) {
				this.authToken = token;
			}
			return false;
		},

		_setOptionsAttr: function (/*String[] | String*/ value) {
			// summary:
			//		Hook for the set("options", value) call by the constructor.
			// value:
			//		Comma separated list of keywords or an array of keyword strings.
			// tags:
			//		private
			var i;

			if (lang.isArray(value)) {
				this.options = value;
			}else{
				if (lang.isString(value)) {
					this.options = value.split(",");
				} else {
					throw new Error(this.moduleName + "::_setOptionsAttr(): Options must be a comma"
																						+ " separated string of keywords"
																						+ " or an array of keyword strings.");
				}
			}
			for(i=0; i<this.options.length;i++) {
				if (this.options[i] === "iconClass") {
					this._addIconClass = true;
				}
			}
			return this.options;
		},

		_setValue: function (/*item*/ item, /*String*/ attribute, /*AnyType*/ newValue, /*Boolean*/ onSetCall) {
			// summary:
			//		Set a new attribute value.
			// item:
			//		A valid File Store item
			// attribute:
			//		Name of item attribute/property to set
			// newValue:
			//		New value to be assigned.
			// tag:
			//		private
			var oldValue;

			oldValue = item[attribute];
			item[attribute] = newValue;

			if (onSetCall) {
				this.onSet(item, attribute, oldValue, newValue);
			}
			return true;
		},

		_setValues: function (/*item*/ item, /*String*/ attribute, /*AnyType*/ newValues, /*Boolean*/ onSetCall) {
			//		Set a new attribute value.
			// item:
			//		A valid File Store item
			// attribute:
			//		Name of item attribute/property to set
			// newValues:
			//		New values to be assigned.
			// tag:
			//		private
			var oldValues;
			var	i;

			oldValues = this.getValues(item, attribute);

			if (lang.isArray(newValues)) {
				if (newValues.length === 0 && attribute !== C_CHILDREN_ATTR) {
					delete item[attribute];
					newValues = undefined;
				} else {
					item[attribute] = newValues.slice(0,newValues.length);
				}
			} else {
				throw new Error(this.moduleName+"::setValues(): newValues not an array");
			}
			if (onSetCall) {
				this.onSet(item, attribute, oldValues, newValues);
			}
			return true;
		},

		_updateFileStore: function (/*String*/ operation, /*Object*/ dataObject, /*Object*/keywordArgs) {
			// summary:
			//		Function to parse the server response data into item format and build/maintain
			//		the internal items array.
			// operation:
			//		XHR operation type, that is, "GET", "DELETE" or "POST"
			// dataObject:
			//		The JavaScript data object containing the raw data to convert into store
			//		item format.
			// keywordArgs:
			//		Keyword arguments object of the original request
			// returns:
			//		An array of store items.
			// tag:
			//		private
			var self = this;

			function deleteFile (/*String*/ identity) {
				// summary:
				//		Delete an item from the store.
				// identity:
				//		A raw file objects identity.
				// return:
				// 		An array of deleted store items. (See _deleteFromStore() for additional
				//		information).
				var files    = [];

				var storeItem = self._getItemByIdentity(identity);
				if (storeItem) {
					files = self._deleteFromStore(storeItem, true);
				}
				return files;
			}

			function makeDirectory (path) {
				// summary:
				//		Create a directory entry in the store. If the directory already exists
				//		the existing directory entry is returned.
				// path:
				//		A valid URI path string.
				// return:
				//		Returns the store item associated with the path.
				var newDir = self._getItemByIdentity(path);
				if(!newDir) {
					newDir = self._rootDir;
					if (newDir) {
						var segments = path.split("/");
						var subPath  = ".";
						var subDir   = null;

						for(i=0; i<segments.length; i++) {
							if (segments[i] !== ".") {
								subPath = subPath + "/" + segments[i];
								subDir  = self._getItemByIdentity(subPath);

								if (!subDir) {
									subDir = { name: segments[i], path: subPath, directory: true, size: 0 };
									subDir[C_CHILDREN_ATTR] = [];
									subDir[C_ITEM_EXPANDED] = false;
									newDir = newFile(subDir, newDir, true);
								} else {
									newDir = subDir;
								}
							}
						}
					}
					else 	// Create the private store root directory.
					{
						newDir = newFile(null, null, false);
						return makeDirectory(path);
					}
				}
				return newDir;
			}

			function mergeFiles (/*item*/ storeItem , /*raw_item*/ servItem, /*Boolean*/ onSetCall) {
				// summary:
				//		Merge item information received from the server with an existing item
				//		in the in-memory store. If an items properties have changed an onSet()
				//		event is generated for the property.
				// storeItem:
				//		Existing item in the store.
				// servItem:
				//		Update (raw) item received from the server.
				// onSetCall:
				//		Indicates if onSet() should be called when a property changed.
				// return:
				//		Returns true if any of the store item properties have changed.
				var hasChanged = false;
				var empty = {};
				var newVal, oldValue;
				var name;
				// Merge non-children properties first.
				for (name in servItem) {
					if (name != C_CHILDREN_ATTR && name != C_ITEM_EXPANDED) {
						newVal = servItem[name];
						if(!(name in storeItem) || (storeItem[name] !== newVal && (!(name in empty) ||
								empty[name] !== newVal))) {

							// Signal if property value changed.
							oldValue = storeItem[name];
							storeItem[name] = newVal;
							if (onSetCall) {
								self.onSet(storeItem, name, oldValue, newVal);
							}
							hasChanged = true;
						}
					}
				}
				return hasChanged;
			}

			function newFile (/*raw_item*/ item, /*item*/ parent, /*Boolean*/ onSetCall) {
				// summary:
				//		Add a new item to the store. This is a function internal to the store,
				//		no public methods are available to programmatically add new items.
				// item:
				//		A valid store data item to be added to the store.
				// parent:
				//		The parent item of item.
				// onSetCall:
				//		Indicated if the callback onSet() will be called on completion.
				// return:
				//		On success the newly created store entry otherwise undefined.
				if (parent) {
					var identity = self.getIdentity(item);
					var child    = self._getItemByIdentity(identity);

					if (!child) {
						var oldValues = self.getValues(parent, C_CHILDREN_ATTR);
						var newValues = self.getValues(parent, C_CHILDREN_ATTR);

						item[C_STORE_REF_PROP] = self;
						item[C_PARENT_REF]   	 = parent;
						if (self["_addIconClass"]) {
							setIconClass(item);
						}
						self._itemsByIdentity[identity] = item;
						self._allFileItems.push(item);
						newValues.push(item);

						self._setValues(parent, C_CHILDREN_ATTR, newValues, false);
						if (self._loadFinished && onSetCall) {
							var parentInfo = { item: parent,
																	attribute: C_CHILDREN_ATTR,
																	oldValue: oldValues,
																	newValue: newValues
																};
							self.onNew(item, (!parent[C_STORE_ROOT] ? parentInfo : null));
						}
						return item;
					}
					throw new Error(self.moduleName+"::_updateFileStore:newFile(): item ["+item.path+"] already exist.");
				}
				else
				{
					if (!self._rootDir) {
						item = { name: self._rootId, path: self._rootId, directory: true };
						item[C_STORE_REF_PROP] = self;
						item[C_CHILDREN_ATTR]  = [];
						item[C_ITEM_EXPANDED]  = false;
						item[C_STORE_ROOT]     = true;

						if (self["_addIconClass"]) {
							setIconClass(item);
						}
						self._itemsByIdentity[self._rootId] = item;
						self._allFileItems.push(item);
						self._rootDir = item;
						return item;
					}
					throw new Error(self.moduleName+"::_updateFileStore:newFile(): item has no parent.");
				}
			}

			function setIconClass (/*item*/ item) {
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
						ext = ext.replace(/^[a-z]|-[a-zA-Z]/g, function (c) { return c.charAt(c.length-1).toUpperCase(); });
						icc = "fileIcon" + ext;
					} else {
						icc = "fileIconUnknown"
					}
				}
				item["icon"] = icc + " fileIcon";
			}

			function updateDirectory (/*item*/ directory, /*raw_item[]*/ files) {
				// summary:
				//		Update a directory with the file information held by parameter files.
				// directory:
				//		A valid store directory entry.
				// files:
				//		An array of (raw) file information objects received from the server.
				// return:
				//		The directory entry.
				var hasChanged  = false;
				var file, path;
				var i;

				var oldValues = self.getValues(directory, C_CHILDREN_ATTR);
				var delValues = self.getValues(directory, C_CHILDREN_ATTR);
				var newValues = [];

				for (i=0; i<files.length; i++) {
					file = updateFile(files[i], directory);
					self._removeArrayElement(delValues, file);
					newValues.push(file);
				}
				// If the array 'delValues' still hold any entries it indicates those entries
				// no longer exist on the server and therefore need to be removed from the
				// store.
				if (delValues.length > 0) {
					file = delValues.shift();
					while (file) {
						self._deleteFromStore(file, false);
						file = delValues.shift();
					}
					hasChanged = true;
				}
				if (oldValues.length != newValues.length) {
					hasChanged = true;
				}
				if (hasChanged && self._loadFinished) {
					self.onSet(directory, C_CHILDREN_ATTR, oldValues, newValues);
				}
				directory[C_ITEM_EXPANDED] = true;
				return directory;
			}

			function updateFile (/*raw_item*/ item, /*item*/ directory) {
				// summary:
				//		Update a file entry. parameter item is a (raw) file object received
				//		from the back-end server. The raw file object is either a single file
				//		or a directory.
				// item:
				//		A (raw) file object received from the back-end server.
				// directory:
				//		A valid store directory entry or null.
				// return:
				//		The file store entry associated with item.
				var newPath = item[C_PATH_ATTR];
				var oldPath = item.oldPath;
				var file;

				// If the file object contains an 'oldPath' property it is the result of a
				// rename operation, as a result the old store entry is deleted.
				if (oldPath && oldPath !== newPath) {
					var oldFile = self._getItemByIdentity(oldPath);
					if (oldFile) {
						self._deleteFromStore(oldFile, true);
						delete item.oldPath;
					} else {
						throw new Error(self.moduleName+"::_updateFileStore:updateFile(): Unable to resolve ["+oldPath+"].");
					}
				}

				if (!directory) {
					var lastSegm = newPath.lastIndexOf("/");
					var dirName  = newPath.substr(0, lastSegm) || newPath;
					directory = makeDirectory(dirName);
				}
				// If there is a matching entry in the store but of a different type, that is,
				// file vs directory, delete the existing entry first.
				file = self._getItemByIdentity(newPath);
				if (file && file.directory !== item.directory) {
					self._deleteFromStore(file,true);
					file = null;
				}
				if (file) {
					mergeFiles(file, item, true);
				} else {
					if (item.directory) {
						// Create a new directory but don't fire any onSet() events while
						// merging the data.
						file = makeDirectory(newPath);
						mergeFiles(file, item, false);
					} else {
						file = newFile(item, directory, true);
					}
				}
				if (file.directory && item[C_ITEM_EXPANDED]) {
					updateDirectory(file, item[C_CHILDREN_ATTR]);
				}
				return file;
			}

			// Process all file objects received from the server. The standard server
			// response looks like: { total: file_count, status: http_status, items:[{},...] }
			if (dataObject) {
				var items = dataObject.items,
						identity,
						files = [],
						file,
						i;

				if (items) {
					if (items.length > 1) {
						var sortList = new sorter([{attribute: C_PATH_ATTR}]);
						items.sort(sortList.sortFunction());
					}
					for (i=0; i<items.length; i++) {
						identity = self.getIdentity(items[i]);
						if (identity) {
							switch (operation) {
								case "DELETE":
									var deleted = deleteFile( identity );
									files = files.concat( deleted );
									break;
								case "GET":
								case "POST":
									file = updateFile(items[i], null);
									files.push(file);
									break;
							}
						} else {
							// Item has not identity
						}
					}
					this._loadFinished = true;
					return files;
				}
			}
			throw new Error(this.moduleName+"::_updateFileStore(): Empty or malformed server response.");
		},

		//=========================================================================
		// Public Methods

		attachToRoot: function (/*item*/ item) {
			// summary:
			//		Attach an item to the store root. For a file store it simply means
			//		renaming an item to the servers root directory.  On completion an
			//		onRoot(newItem,"new") event is generated.
			// item:
			//		A valid File Store item
			// tag:
			//		public
			this._assertIsItem(item);

			var newPath = this._rootId + "/" + item.name;
			this.renameItem(item, newPath);
		},

		close: function (/*dojo.data.api.Request || keywordArgs || null */ request) {
			// summary:
			//		See dojo.data.api.Read.close()
			// request:
			//		Request object returned by a fetch operation. (Currently not used, the
			//		store is closed regardless if a request is specified)
			// tag:
			//		public

			if (this._loadInProgress) {
				this._queueRequest({ args: request, func: this.close, scope: this});
				this._closePending = true;
			} else {
				if (this.clearOnClose) {
					this._closePending    = true;

					this._queuedFetches   = [];
					this._itemsByIdentity = {};
					this._allFileItems    = [];
					this._rootDir         = null;
					this._loadFinished    = false;
					this._loadInProgress  = false;
					this._validated       = false;
				}
				this.onClose(this.clearOnClose);
				this._closePending = false;
			}
		},

		containsValue: function (/*item*/ item,	/*String*/ attribute, /*AnyType*/ value) {
			// summary:
			//		See dojo.data.api.Read.containsValue()
			// item:
			//		A valid File Store item
			// attribute:
			//		Attribute name string.
			// value:
			//		Value to be matched.
			// tag:
			//		Public
			var regexp = undefined;
			if (typeof value === "string") {
				regexp = filterUtil.patternToRegExp(value, false);
			}
			return this._containsValue(item, attribute, value, regexp); //boolean.
		},

		deleteItem: function (/*item*/ item, /*Callback?*/ onBegin, /*Callback?*/ onComplete,
													/*Callback?*/ onError, /*Context?*/ scope) {
			// summary:
			//		Delete an item from the back-end server and store. A XHR delete is issued
			//		and the server response includes the file(s) that have succesfully been
			//		deleted. Only those items will be deleted from the store.
			// item:
			//		A valid File Store item
			// onBegin:
			//		If an onBegin callback function is provided, the callback function
			//		will be called just once, before the XHR DELETE request is issued.
			//		The onBegin callback MUST return true in order to proceed with the
			//		deletion, any other value returned will abort the operation.
			// onComplete:
			//		If an onComplete callback function is provided, the callback function
			//		will be called once on successful completion of the delete operation
			//		with the list of deleted file store items: onComplete(items)
			// onError:
			//		The onError parameter is the callback to invoke when the deleteItem()
			//		encountered an error. It takes two parameter, the error object and
			//		the HTTP status code if available: onError(err, status)
			// scope:
			//		If a scope object is provided, all of the callback functions (onBegin,
			//		onError, etc) will be invoked in the context of the scope object. In
			//		the body of the callback function, the value of the "this" keyword
			//		will be the scope object otherwise window.global is used.
			// tag:
			//		Public
			var scope = scope || window.global;
			var self  = this;

			this._assertIsItem(item);

			if (onBegin) {
				if (onBegin.call(scope, item) !== true) {
					return;
				}
			}
			// Create an arguments object so we can queue and defer the request if required.
			var keywordArgs = { item: item, onComplete: onComplete, onError: onError, scope: scope };
			this._deleteFromServer(keywordArgs);
			return keywordArgs;
		},

		fetch: function (/*Object*/ keywordArgs) {
			// summary:
			//		Given a query and set of defined options, such as a start and count
			//		of items to return, this method executes the query and makes the results
			//		available as data items.
			// NOTE:
			//		When querying custom attributes, that is, attributes not provided by the
			//		back-end server, set the query option "storeOnly" to true. This will
			//		prevent the application from requesting, potentially, large amounts	of
			//		data from the back-end server while those custom attributes are stored
			//		in the in-memory store only.
			//
			// keywordArgs:
			//		See dojo/data/api/Read.js
			// tag:
			//		Public
			var scope        = keywordArgs.scope || window.global;
			var queryOptions = keywordArgs.queryOptions || null;
			var storeOnly    = queryOptions ? queryOptions.storeOnly : false;
			var oper         = "GET";
			var self         = this;

			if ((this.cache || storeOnly) && this._loadFinished) {
				this._fetchFinal(keywordArgs, this._getItemsArray(queryOptions));
			} else {
				// If fetches come in before the loading has finished, but while
				// a load is in progress, we have to defer the fetching to be
				// invoked in the callback.
				if (this._loadInProgress) {
					this._queueRequest({args: keywordArgs, func: this.fetch, scope: self});
				} else {
					this._loadInProgress = true;
					var getArgs    = this._requestToArgs(oper, keywordArgs);
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function (data) {
						try {
							self._updateFileStore(oper, data, keywordArgs);
							self._loadInProgress = false;
							self._fetchFinal(keywordArgs, self._getItemsArray(queryOptions));
						} catch(error) {
							self._loadInProgress = false;
							if (keywordArgs.onError) {
								keywordArgs.onError.call(scope, error);
							} else {
								console.error(error);
							}
						}
						self._handleQueuedRequest();
					});
					getHandler.addErrback(function (error) {
						self._loadInProgress = false;
						if (keywordArgs.onError) {
							keywordArgs.onError.call(scope, error, getArgs.status);
						} else {
							console.error(error);
						}
						self._handleQueuedRequest();
					});
				}
			}
			// Inject an abort function.
			keywordArgs.abort = function () { this.aborted = true; };
			return keywordArgs;
		},

		fetchChildren: function (/*Object*/ keywordArgs) {
			// summary:
			//		Fetch the children of a given store item. Similar to the regular fetch()
			//		the result is returned by means of callback function (s).
			// keywordArgs:
			//		See dojo/data/api/Read.js
			// tag:
			//		Public
			var scope = keywordArgs.scope || window.global;
			var item  = keywordArgs.item || this._rootDir;
			var self  = this;

			this._assertIsItem(item);

			if (!this.isItemLoaded(item) || keywordArgs.forceLoad) {
				var request = { item: item,
												forceLoad: keywordArgs.forceLoad,
												onError: keywordArgs.onError,
												onItem: function (item) {
													self._fetchFinal(keywordArgs, item[C_CHILDREN_ATTR]);
												}
											 }
				this.loadItem(request);
			} else {
				this._fetchFinal(keywordArgs, item[C_CHILDREN_ATTR]);
			}
			keywordArgs.abort = function () { this.aborted = true; };
			return keywordArgs
		},

		fetchItemByIdentity: function (/*Object*/ keywordArgs) {
			// summary:
			//		See dojo.data.api.Identity.fetchItemByIdentity()
			// keywordArgs:
			//		See dojo/data/api/Identity.js
			// tag:
			//		Public
			var scope        = keywordArgs.scope || window.global;
			var path         = keywordArgs.identity || keywordArgs[C_PATH_ATTR];
			var queryOptions = keywordArgs.queryOptions || null;
			var storeOnly    = queryOptions ? queryOptions.storeOnly : false;
			var oper         = "GET";
			var self         = this;
			var item;

			// Check store in case it already exists.
			item = this._getItemByIdentity(path);
			if ((this.cache || storeOnly) && this._loadFinished) {
				if (item) {
					if (keywordArgs.onItem) {
						keywordArgs.onItem.call(scope, item);
					}
					return;
				}
			}

			if (this._loadInProgress) {
				this._queueRequest({args: keywordArgs, func: this.fetchItemByIdentity, scope: self});
			} else {
				this._loadInProgress = true;
				var request    = { path: path };
				var getArgs    = this._requestToArgs(oper, request);
				var getHandler = xhr.get(getArgs);
				getHandler.addCallback(function (data) {
					try{
						self._updateFileStore(oper, data, keywordArgs);
						self._loadInProgress = false;
						if (keywordArgs.onItem) {
							item = self._getItemByIdentity(path);
							keywordArgs.onItem.call(scope, item);
						}
					} catch(error) {
						self._loadInProgress = false;
						if (keywordArgs.onError) {
							keywordArgs.onError.call(scope, error);
						} else {
							console.error(error);
						}
					}
					self._handleQueuedRequest();
				});
				getHandler.addErrback(function (error) {
					self._loadInProgress = false;
					switch (getArgs.status) {
						case 404:
						case 410:
							if (item) {
								self._resyncStore( item );
							}
							// NO BREAK HERE
						default:
							if (keywordArgs.onError) {
								keywordArgs.onError.call(scope, error, getArgs.status);
							}
					}
					self._handleQueuedRequest();
				});
			}
		},

		getAttributes: function (/*item*/ item) {
			// summary:
			//		Returns an array of all non-private attributes/properties.
			//		See dojo.data.api.Read.getAttributes()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			this._assertIsItem(item);
			var attributes = [];
			for(var key in item) {
				// Save off only the real item attributes, not the internal specials
				if (!this._isPrivateAttr(key)) {
					attributes.push(key);
				}
			}
			return attributes; // Array
		},

		getDirectory: function (/*item*/ item) {
			// summary:
			//		Return the directory path of a store item. The directory path of an
			//		item is the path property of its parent.
			// item:
			//		A valid File Store item
			// tag:
			//		public
			this._assertIsItem(item);
			var	parent;

			parent = this.getValue(item, C_PARENT_REF);
			if (parent) {
				return this.getPath(parent);
			}
			return;
		},

		getFeatures: function () {
			// summary:
			//		Returns an object specifying all features supported by the file store.
			//		See dojo.data.api.Read.getFeatures()
			// tag:
			//		public
			return this._features; //Object
		},

		getIdentity: function (/*item*/ item) {
			// summary:
			//		Returns the identity of a given item. In the context of a file store
			//		the identity is the items path string.
			//		See dojo.data.api.Identity.getIdentity()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			if (item) {
				return item[C_PATH_ATTR];
			}
		},

		getIdentifierAttr: function () {
			// summary:
			//		Returns the store identifier attribute if defined.
			// tag:
			//		public, extension
			return C_PATH_ATTR;
		},

		getIdentityAttributes: function (/*item*/ item) {
			// summary:
			//		See dojo.data.api.Identity.getIdentityAttributes()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			return [C_PATH_ATTR]; // Array
		},

		getLabel: function (/*item*/ item) {
			// summary:
			//		Return the label property of a given item. In the context of a file
			//		store the label is the 'name' property of the item.
			//		See dojo.data.api.Read.getLabel()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			if (this._labelAttr && this.isItem(item)) {
				return this.getValue(item, this._labelAttr); //String
			}
			return undefined; //undefined
		},

		getLabelAttributes: function (/*item*/ item) {
			// summary:
			//		See dojo.data.api.Read.getLabelAttributes()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			return (this._labelAttr ? [this._labelAttr] : null);
		},

		getParents: function (/*item*/ item) {
			// summary:
			//		Get the parent(s) of a item.
			// description:
			//		Get the parent(s) of a FileStore item.	The 'C_PARENT_REF' property
			//		is used to fetch the parent(s). (there should only be one).
			// item:
			//		The File Store item whose parent(s) will be returned.

			if (item) {
				// Don't expose the internal root directory as a valid parent.
				if (item[C_PARENT_REF] == this._rootDir) {
					return [];
				}
				return this.getValues(item, C_PARENT_REF);
			}
		},

		getPath: function (item) {
			// summary:
			//		Return the 'path' property of a given item.
			// tag:
			//		public
			this._assertIsItem(item);
			return item[C_PATH_ATTR];
		},

		getValue: function (	/*item*/ item, /*String*/ attribute,	/*AnyType?*/ defaultValue) {
			// summary:
			//		See dojo.data.api.Read.getValue()
			// item:
			//		A valid File Store item
			// attribute:
			//		Attribute/property name string
			// defaultValue:
			//		Default value to be returned if attribute value is undefined.
			// tag:
			//		public
			var values = this.getValues(item, attribute);
			return (values.length > 0) ? values[0] : defaultValue; // mixed
		},

		getValues: function (/*item*/ item,	/*String*/ attribute) {
			// summary:
			//		See dojo.data.api.Read.getValues()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			var result = [];

			this._assertIsItem(item);
			this._assertIsAttribute(attribute, "getValues");

			if (item[attribute] !== undefined) {
				result = lang.isArray(item[attribute]) ? item[attribute] : [item[attribute]];
			}
			return result.slice(0);
		},

		hasAttribute: function (/*item*/ item, /*String*/ attribute) {
			// summary:
			//		See dojo.data.api.Read.hasAttribute()
			// item:
			//		A valid File Store item
			// attribute:
			//		Attribute/property name to be evaluated
			// tag:
			//		public
			this._assertIsItem(item);
			this._assertIsAttribute(attribute, "hasAttribute");
			return (attribute in item);
		},

		isItem: function (/*AnyType*/ something) {
			// summary:
			//		Returns true is 'something' is a valid file store item otherwise false.
			//		See dojo.data.api.Read.isItem()
			// tag:
			//		public
			if (something && something[C_STORE_REF_PROP] === this) {
				if (this._itemsByIdentity[something[C_PATH_ATTR]] === something) {
					return true;
				}
			}
			return false; // Boolean
		},

		isItemLoaded: function (/*item*/ item) {
			// summary:
			//		See dojo.data.api.Read.isItemLoaded()
			// item:
			//		A valid File Store item
			// tag:
			//		public
			var loaded = this.isItem(item);

			if (loaded) {
				if (item.directory && !item[C_ITEM_EXPANDED]) {
					loaded = false;
				}
			}
			return loaded;
		},

		isRootItem: function (/*item*/ item) {
			// summary:
			//		Returns true if the item is a top-level store entry, that is, a child
			//		of the stores root directory otherwise false.
			// item:
			//		A valid File Store item.
			// returns:
			//		True if the item is a root item otherwise false
			// tag:
			//		public

			this._assertIsItem(item);
			var parent = this.getValue(item, C_PARENT_REF);

			if (parent && parent[C_STORE_ROOT]) {
				return true;
			}
			return false;
		},

		isValidated: function () {
			// summary:
			return this._validated;
		},

		loadItem: function (/*Object*/ keywordArgs) {
			// summary:
			//		Given an item, this method loads the item so that a subsequent call to
			//		isItemLoaded(item) will return true. If a call to isItemLoaded() returns
			//		true before loadItem() is even called, then loadItem() need not do any
			//		work at all and will not even invoke the callback handlers.	So, before
			//		invoking this method, check that the item has not already been loaded.
			// keywordArgs:
			//		See dojo/data/api/Read.js
			// tag:
			//		public
			var queryOptions = keywordArgs.queryOptions || null;
			var forceLoad    = keywordArgs.forceLoad || false;
			var scope        = keywordArgs.scope || window.global;
			var sort         = keywordArgs.sort || null;
			var item         = keywordArgs.item;
			var oper         = "GET";
			var self         = this;

			if (!this.isItem(item)) {
				return;
			}
			if (forceLoad !== true) {
				if (this.isItemLoaded(item)) {
					return;
				}
			}
			var path = this.getIdentity(item);

			if (this._loadInProgress) {
				this._queueRequest({args: keywordArgs, func: this.loadItem, scope: self});
			} else {
				this._loadInProgress = true;
				var request    = { path: path };
				var getArgs    = this._requestToArgs(oper, request);
				var getHandler = xhr.get(getArgs);
				getHandler.addCallback(function (data) {
					try{
						self._updateFileStore(oper, data, keywordArgs);
						self._loadInProgress = false;
						if (keywordArgs.onItem) {
							item = self._getItemByIdentity(path);
							keywordArgs.onItem.call(scope, item);
						}
					}catch(error) {
						self._loadInProgress = false;
						if (keywordArgs.onError) {
							keywordArgs.onError(error);
						} else {
							console.error(error);
						}
					}
					self._handleQueuedRequest();
				});
				getHandler.addErrback(function (error) {
					self._loadInProgress = false;
					// Delete item if not found but was previously known.
					if (item !== self._rootDir) {
						switch (getArgs.status) {
							case 404:
							case 410:
								// File Store is out of sync....
								self._resyncStore(item);
								break;
						}
					}
					if (keywordArgs.onError) {
						keywordArgs.onError.call(scope, error, getArgs.status);
					}
					self._handleQueuedRequest();
				});
			}
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
				if (this._loadInProgress) {
					this._queueRequest({args: keywordArgs, func: this.loadStore, scope: self});
				} else {
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
				}
			} else {
				if (onComplete) {
					onComplete.call(scope, this._allFileItems.length);
				}
			}
		},

		renameItem: function (/*item*/ item, /*String*/ newPath, /*Callback?*/ onItem, /*Callback?*/ onError,
													/*Context?*/ scope) {
			// summary:
			//		Rename a store item.
			// item:
			//		A valid File Store item
			// newPath:
			//		The new pathname of the item. (relative to the stores basePath)
			// onItem:
			//		The callback function to invoke when the item has been renamed. It
			//		takes only one parameter, the renamed item: onItem(item)
			// onError:
			//		The onError parameter is the callback to invoke when the item rename
			//		encountered an error. It takes two parameter, the error object and
			//		the HTTP status code if available: onError(err, status)
			// scope:
			//		If a scope object is provided, all of the callback functions (onItem,
			//		onError, etc) will be invoked in the context of the scope object. In
			//		the body of the callback function, the value of the "this" keyword
			//		will be the scope object otherwise window.global is used.
			// tag:
			//		Public
			var scope = scope || window.global;

			this._assertIsItem(item);
			this._assertIsAttribute(newPath, "renameItem");

			if (item != this._rootDir) {
				if (item[C_PATH_ATTR] !== newPath) {
					// Create an arguments object so we can queue and defer the request if required.
					var keywordArgs = { item: item, newValue: newPath, onItem: onItem, onError: onError,
															 scope: scope };
					this._renameItem(keywordArgs);
				} else {
					if (lang.isFunction(onItem)) {
						onItem.call(scope, item);
					}
				}
			}
		},

		set: function (/*String*/ attribute, /*AnyType*/ value) {
			// summary:
			//		Provide the setter capabilities for the store similar to dijit widgets.
			// attribute:
			//		Name of store property to set
			// tag:
			//		public
			if (lang.isString(attribute)) {
				var cc = attribute.replace(/^[a-z]|-[a-zA-Z]/g, function (c) { return c.charAt(c.length-1).toUpperCase(); });
				var setter = "_set" + cc + "Attr";

				if  (lang.isFunction(this[setter])) {
					return this[setter](value);
				} else {
					if (this[attribute] !== undefined) {
						this[attribute] = value;
						return this[attribute];
					}
				}
			}
			throw new Error(this.moduleName+"::set(): Invalid attribute");
		},

		setValidated: function (/*Boolean*/ value) {
			// summary:
			//		Mark the store as successfully been validated.
			this._validated = Boolean(value);
		},

		setValue: function (/*item*/ item, /*String*/ attribute, /*AnyType*/ newValue) {
			// summary:
			//		Set a new attribute value. Note: this method only allows modification
			//		of custom attributes. Please refer to renameItem() to change the store
			//		item identity.
			// item:
			//		A valid File Store item
			// attribute:
			//		Name of item attribute/property to set
			// newValue:
			//		New value to be assigned.
			// tag:
			//		public
			var oldValue;
			var	i;

			this._assertIsItem(item);
			this._assertIsAttribute(attribute, "setValue");

			if (typeof newValue === "undefined") {
				throw new Error(this.moduleName+"::setValue(): newValue is undefined");
			}
			if (attribute !== C_PATH_ATTR) {
				if (this._isReadOnlyAttr(attribute) || this._isPrivateAttr(attribute)) {
					throw new Error(this.moduleName+"::setValue(): attribute ["+attribute+"] is private or read-only");
				}
				return this._setValue(item, attribute, newValue, true);
			} else {
				if (item[C_PATH_ATTR] !== newValue) {
					this._renameItem( { item: item,	 newValue: newValue	} );
				}
			}
		},

		setValues: function (/*item*/ item, /*String*/ attribute, /*AnyType*/ newValues) {
			//		Set a new attribute value.
			// item:
			//		A valid File Store item
			// attribute:
			//		Name of item attribute/property to set
			// newValues:
			//		New values to be assigned.
			// tag:
			//		public
			var oldValues;
			var	i;

			this._assertIsItem(item);
			this._assertIsAttribute(attribute, "setValues");

			if (typeof newValues === "undefined") {
				throw new Error(this.moduleName+"::setValue(): newValue is undefined");
			}
			if (this._isReadOnlyAttr(attribute) || this._isPrivateAttr(attribute)) {
				throw new Error(this.moduleName+"::setValues(): attribute ["+attribute+"] is private or read-only");
			}
			return this._setValues(item, attribute, newValues, true);
		},

		unsetAttribute: function (/*item*/ item, /*String*/ attribute) {
			// summary:
			//		See dojo.data.api.Write.unsetAttribute()
			// item:
			//		A valid File Store item
			// attribute:
			//		Name of item attribute/property to unset (destroyed)
			// tag:
			//		public
			return this.setValues(item, attribute, []);
		},

		// =======================================================================
		//	Event hooks. (Callbacks)

		onClose: function (/*Boolean*/ cleared) {
			// summary:
			//		Invoked when the store has been closed.
			// cleared:
			//		Indicates if the store was reset to its original (empty) state.
			// tag:
			//		callback.
		},

		onDelete: function (/*item*/ item) {
			// summary:
			//		See dojo.data.api.Notification.onDelete()
			// tag:
			//		Callback
			var parent = item[C_PARENT_REF];
			if (parent && parent[C_STORE_ROOT]) {
				this.onRoot(item, "delete");
			}
		},

		onLoad: function ( count ) {
			// summary:
			//		Invoked when loading the store completes.
			// count:
			//		Number of store items loaded.
			// tag:
			//		callback.
		},

		onNew: function (/*item*/ item, /*Object?*/ parentInfo) {
			// summary:
			//		See dojo.data.api.Notification.onNew()
			// tag:
			//		Callback
			if (this.isRootItem(item)) {
				this.onRoot(item, "new");
			}
		},

		onRoot: function (/*tem*/ item, /*String*/ action) {
			// summary:
			//		Invoked whenever a item is added to, or removed from the root.
			// item:
			//		Store item.
			// action:
			//		Event action which can be: "new", "delete", "attach" or "detach"
			// tag:
			//		callback.
		},

		onSet: function (/*item*/ item,	/*String*/ attribute, /*object|array*/ oldValue, /*object|array*/ newValue) {
			// summary:
			//		See dojo.data.api.Notification.onSet()
			// item:
			//		File Store item.
			// attribute:
			//		Attribute name whose value changed.
			// oldValue:
			// newValue:
			// tag:
			//		callback.
		},

		// =======================================================================
		// Unsupported dojo/data/api/Write API functions.

		isDirty: function (/*item?*/ item) {
			return false;
		},

		newItem: function () {
			this._assertSupport("newItem");
		},

		revert: function () {
			// Nothing to revert to....
		},

		save: function () {
			// Nothing to save....
		},

		// =======================================================================
		// Store Model API extensions. (cbtree/models/StoreModel-API)

		addReference: function () {
			// Only supported on an ItemFileWriteStore.
			this._assertSupport("addReference");
		},

		detachFromRoot: function () {
			// Only supported on an ItemFileWriteStore.
			this._assertSupport("detachFromRoot");
		},

		itemExist: function (/*Object*/ keywordArgs) {
			// summary:
			//		Tests if, and return, a store item if it exists.
			// keywordArgs:
			//		Object defining the store item properties.
			// returns:
			//		The item if is exist
			// tag:
			//		public
			var	identity;

			if (typeof keywordArgs != "object") {
				throw new Error(this.moduleName+"::itemExist(): argument is not an object.");
			}
			identity = keywordArgs[C_PATH_ATTR];
			if (typeof identity === "undefined") {
				throw new Error(this.moduleName+"::itemExist(): argument does not include an identity.");
			}
			return this._getItemByIdentity(identity);
		},

		removeReference: function () {
			// Only supported on an ItemFileWriteStore.
			this._assertSupport("removeReference");
		}

	});
	return FileStore;
});

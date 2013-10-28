define(["dojo/_base/declare",
				"dojo/_base/lang",
				"dojo/store/api/Store"
			 ], function (declare, lang, Store) {

	// module:
	//		cbtree/store/api/Store
	// summary:
	//		Extend the dojo/store API

	var cbtreeStore = lang.extend( Store, {
		// summary:
		//		This is an extension to the default abstact dojo/store/api/Store API.
		//		This API defines method signatures ONLY without providing implementation
		//		details. All methods and properties defined in this API are optional and
		//		require implemention only if the store is to offer the functionality.
		//
		//		Except for hasChildren() and isItem(), every method, whose return value
		//		isn't already a promise or void, must return a promise for the specified
		//		return value if the execution of the method is asynchronous.
		//		Whenever a promise is returned the following conditions must be met:
		//
		//			1 - On successful completion of the method the promise must resolve
		//					with the specified synchronous return value as its result.
		//			2 - On exception, the promise is rejected with the error condition
		//					as its result.
		//
		//		In the context of this API data types are defined as follows:
		//
		//		- Object		A JavaScript key:value pairs object (hash).
		//		- Boolean		A JavaScript Boolean (true or false)
		//		- id				String or Number
		//		- String		A JavaScript String
		//		- Number		A JavaScript Number
		//		- void			undefined

		//=========================================================================
		// Store Properties

		// dataHandler: Function|Object
		//		The data handler for the data/response. If dataHandler is an key:value
		//		pairs object, the object should looks like:
		//
		//			{
		//				handler: Function|Object,
		//				options: Object?
		//			}
		//
		//		If the handler property is an object the object MUST have a property
		//		named 'handler' whose value is a function.	In this case the handler
		//		object provides	the scope/closure for the handler function	and the
		//		options, if any, are mixed into the scope. For example:
		//
		//			dataHandler: { handler: csvHandler,
		//										 options: { fieldNames:["col1", "col2"] }
		//									 }
		//
		//		The handler function has the following signature:
		//
		//			handler( response )
		//
		//		The response argument is a JavaScript key:value pairs object with a
		//		"text" or "data" property.
		dataHandler: null,

		// defaultProperties: Object
		//		A JavaScript key:values pairs object whose properties and associated
		//		values are added to new store objects if such properties are missing
		//		from a new store object.
		defaultProperties: null,

		// handleAs: String
		//		Specifies how to interpret the payload returned in a server response
		//		or the data passed to a store method responsible for populating the
		//		store, if any. (typically the store constructor).
		handleAs: null,

		// hierarchical: Boolean [read-only]
		//		Indicates if the store is capable of maintaining an object hierarchy.
		//		The cbtree Models tests for the presence of this property in order to
		//		determine if it has to set the parent property of an object or if the
		//		store will handle it.
		//		If true, the store MUST implement all logic required to support the
		//		Put.Directive "parent" and the store's "parentProperty" property.
		//		Support for the Put.Directive "before" is optional.
		hierarchical: false,

		// multiParented: Boolean|String
		//		Indicates if the store supports multi-parented objects. Multi Parented
		//		objects are objects that can have more than one parent.
		multiParented: false,

		// parentProperty: String
		//		 The property name of an object whose value represents the object's
		//		parent id or ids.
		parentProperty: "parent",

		// url: String
		//		The Universal Resource Location (URL) to retrieve the store data from.
		//		If both the url and data properties are specified, the data property
		//		takes precedence.
		url: null,

		//=========================================================================
		// Store Methods

		addParent: function (child, parents) {
			// summary:
			//		Add parent(s) to the list of parents of child.
			// child: Object
			//		Store object to which the parent(s) are added
			// parents: any
			//		Id or Object or an array of Ids or objects to be added as the parent(s)
			//		of child.
			// returns: Boolean
			//		true if parents were successfully added otherwise false.
		},

		destroy: function () {
			//summary:
			//		Release all memory, handles and listeners, if any
		},

		getParents: function (child) {
			// summary:
			//		Retrieve the parent(s) of a store object
			// child: Object.
			//		The object to find the parent(s) for.
			// returns: Object[] | void
			//		An array of parent objects. Returns an empty array If the child has
			//		no parent or void if the child object doesn't exist.
		},

		hasChildren: function (parent) {
			// summary:
			//		Test if a parent object has known children. This method MUST return
			//		boolean true or false.	Any store that supports deferred loading of
			//		data objects (e.g. lazy loading) MUST return false if it is unknown
			//		if an object has children or not.
			// parent: Object
			// returns: Boolean
			//		 true if the parent object has known children otherwise false.
		},

		isItem: function (object) {
			// summary:
			//		Test if an object is a valid member of this store, that is, it came
			//		from this store instance.	This method MUST return boolean true or
			//		false.
			// obJect: Object
			// returns: Boolean
			//		 true if the object is a member of this store otherwise false.
		},

		load: function (options) {
			// summary:
			//		load the store data from a URL.
			// options: Store.LoadDirectives?
			//		Optional load directives.
			// returns: dojo/promise/Promise
			//		On successful completion the promise resolves to void. On error the
			//		promise is rejected with the error condition as its result.
		},

		ready: function (callback, errback) {
			// summary:
			//		Execute the callback when the store data has been loaded. If an error
			//		occurred during the loading process errback is called instead.
			// callback: Function
			//		Function called on successful load of the store data.
			// errback: Function
			//		Function called if an error occurred during the store load.
		},

		removeParent: function (child, parents) {
			// summary:
			//		Remove parent(s) from the list of parents of child.
			// child:
			//		Store object from which the parent(s) are removed
			// parents: any
			//		Id or Object or an array of Ids or objects to be removed from the
			//		list of parent(s) of child.
			// returns: Boolean
			//		true if the parent(s) are successfully removed otherwise false.
		}

	});	/* end cbtreeStore */

	Store.LoadDirectives = declare(null, {
		// summary:
		//		Directives passed to the load() method.
		// all: Boolean?
		//		Indicates if all available data should be loaded.
		// url: String?
		//		The Universal Resource Location (URL) to retrieve the store data from.
	});

	Store.PutDirectives = declare(null, {
		// summary:
		//		Directives passed to put() and add() handlers for guiding the update
		//		and creation of stored objects.
		// id: String|Number?
		//		Indicates the identity of the object if a new object is created
		// before: (Object|id)?
		//		If the collection of objects in the store has a natural ordering, this
		//		indicates that the created or updated object should be placed before
		//		the object specified by the value of this property. The property value
		//		can be an object or id. If omitted or null indicates that the object
		//		should be last.
		// parent: any?,
		//		If the store is hierarchical this property indicates the new parent(s)
		//		of the created or updated object. This property value can be an Id or
		//		object or an array of those types.
		// overwrite: Boolean?
		//		If this is provided as a boolean it indicates that the object should or
		//		should not overwrite an existing object. A value of true indicates that
		//		a new object should not be created, instead the operation should update
		//		an existing object. A value of false indicates that an existing object
		//		should not be updated, a new object should be created (which is the same
		//		as an add() operation). When this property is not provided, either an
		//		update or creation is acceptable.
	});

	Store.SortInformation = declare(null, {
		// summary:
		//		An object describing what attribute to sort on, and the direction of
		//		the sort.
		// attribute: String
		//		The name of the attribute to sort on.
		// descending: Boolean?
		//		The direction of the sort.	Default is false.
		// ignoreCase: Boolean?
		//		Compare attribute values case insensitive. Default is false.
	});

	Store.QueryOptions = declare(null, {
		// summary:
		//		Optional object with additional parameters for query results.
		// sort: dojo/store/api/Store.SortInformation[]?
		//		A list of attributes to sort on, as well as direction
		//		For example:
		//		| [{attribute:"price, descending: true}].
		//		If the sort parameter is omitted, then the natural order of the store
		//		may be applied if there is a natural order.
		// start: Number?
		//		The first result to begin iteration on
		// count: Number?
		//		The number of how many results should be returned.
		// ignoreCase: Boolean?
		//		Match object properties case insensitive. Default is false.
		// cacheOnly: Boolean?
		//		If the store maintains an internal cache and cacheOnly is set to true
		//		only the cache is searched without fetching any data from an external
		//		data source like a back-end server. Default is false.
	});

	return cbtreeStore;
});

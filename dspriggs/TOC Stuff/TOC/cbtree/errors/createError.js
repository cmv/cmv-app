//
// Copyright (c) 2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause								(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License				(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License		(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
define(["dojo/_base/lang", 
        "dojo/request",
        "../util/shim/Array"      // ECMA-262 Array shim
       ], function(lang, request){
	"use strict";

	// module:
	//		cbtree/errors/createError
	// summary:
	//		The createError module returns a function which enables the definition
	//		of a custom Error type that uses pre-defined 'named' error messages.
	//		This module is implementaed as a dojo plugin to allow for loading error
	//		message definitions using external resource files.
	// example:
	//		The first example define the 'myError' type using a locally defined set
	//		of error messages whereas the second example load the error messages
	//		using an external, JSON encoded, resource file.
	//
	//	|	require(["module", 
	//	|          "cbtree/errors/createError"
	//	|         ], function (module, createError) {
	//	|
	//	|	  var errDefs = [
	//	|	    {"NotFoundError":{text:"Object not found here", code:18}},
	//	|	                        ...
	//	|	  ];
	//	|
	//	|	  var myError = createError( module.id, errDefs );
	//	|
	//	|	  function someFunction ( ... ) {
	//	|	    throw new myError("NotFoundError", "someFunction");
	//	|	  }
	//	|	});
	//
	//	|	require(["module", 
	//	|          "cbtree/errors/createError!cbtree/errors/DOMErrors.json"
	//	|         ], function (module, createError) {
	//	|
	//	|	  var myError = createError( module.id );
	//	|
	//	|	  function someFunction ( ... ) {
	//	|	    throw new myError("NotFoundError", "someFunction");
	//	|	  }
	//	|	});
	//
	
	var C_UNKNOWN = {text: "Undefined error", code: 0};

	// cacheURL: Object
	//		The list of resource URLs that have been loaded. Each resource file is
	//		loaded once.
	var cacheURL = {};

	// errorNames: Object
	//		A JavaScript key:value pairs object. Each key represents an error name
	//		and the value is an JavaScript object with at least a 'text' property:
	//
	//	|		{ "AbortError": { text: "Operation is aborted" } }
	//
	//		If the message value contains a 'type' property it, instead of the key,
	//		will be used as the name of the error. For example, the next definition:
	//
	//	|		{ "AbortError", {text: "Operation is aborted", type: "WentFishing" } }
	//
	//		when thrown as 'throw myError("AbortError");' will display a message
	//		like:
	//
	//				"WentFishing: Operation is aborted"
	//
	var errorNames = {};

	function addMessage(/*Object*/ messages ) {
		// summary:
		//		Add message defintions to the internal message table. Each message
		//		is defined by a key (e.g. the message type) and a value. The value
		//		is an object with the following properties: 'text' and optionally
		//		'code' and 'type'. If the type property is specified it is used
		//		as the alias for message type.
		//		Please note that the code property has been deprecated in the DOM
		//		specification and is provided for backward compatability only.
		// messages:
		//		A single JavaScript key:value pairs object where each key:value pair
		//		defines a message. Alternatively an array of key:value pair objects
		//		where each object defines a message. The following is an example of
		//		a JSON encoded message object:
		//
		//		{"NotFoundError":{"text":"The object can not be found here","code":18}}
		// tag:
		//		Private
		function validMsg( msgObj ) {
			var key, value;
			for(key in msgObj) {
				if (/\W/.test(key) || !(value = msgObj[key]) || !value.text) {
					return false;
				}
			}
			return true;
		}

		switch( Object.prototype.toString.call(messages) ) {
			case "[object Array]":
				messages.forEach( addMessage );
				break;
			case "[object Object]":
				if (validMsg(messages)) {
					errorNames = lang.mixin( errorNames, messages );
				}
				break;
		}
	}

	function getMessage (/*String*/ type, /*String?*/ text) {
		// summary:
		//		Create and return a message object base of the specified type and
		//		optional message text.
		// type:
		//		The message type with or without the 'Error' suffix, for example: 
		//		'NotFoundError' or 'NotFound', both types are equivalent and are 
		//		referred to as the long and abbreviated version. Please note that
		//		The message object returned will always have the long version as
		//		the value of the type property unless the pre-defined message has
		//		a 'type' property in which case the message type property is used
		//		instead.
		// text:
		//		Optional message text. If specified overrides the text associated
		//		with the message type. 
		// returns:
		//		A JavaScript key:value pairs object with the properties	'type', 'code'
		//		and 'text'. For example:
		//			{type:"NotFoundError", text:"Object not found", code:18}
		// tag:
		//		Private
		var abbr = (type || "").replace(/Error$/, "");
		var base = abbr + "Error";
		var msg  = {type: base, text: "", code: 0};
		
		if (abbr) {
			msg = lang.mixin( msg, (errorNames[base] || errorNames[abbr] || C_UNKNOWN))
		}
		msg.text = text || msg.text;
		return msg;
	}

	function createError(/*String?*/ module, /*Object?*/ errors ) {
		// summary:
		//		Initialize and return the custom error type function/object.
		// module:
		//		Optional module name string. If specified it is used as the first part
		//		of the prefix applied to every message.
		// errors:
		//		Optional, A JavaScript key:value pairs object where each key:value pair
		//		defines a message. Alternatively an array of key:value pair objects
		//		where each object defines a message.
		// returns: Function
		// tag:
		//		Public

		function cbtError (/*String|Error*/ type,/*String?*/ method,/*String?*/ message) {
			// summary:
			//		Constructor, create a new instance of the custom error type.
			// type:
			//		If a string it identifies the message type, otherwise an instance
			//		or Error.
			// method:
			//		Method or function name used a the second part, module being the
			//		first, of the prefix applied to the message. The general format
			//		of any error messages looks like: <module><method><message>
			// message:
			//		Optional message text. If specified overrides the text assigned to
			//		the message type or, in case type is an Error, the Error message.
			// tag:
			//		Private
			var path = module + (method ? (prefix + method + "()") : "");
			var msgObj;

			// If 'type' is an instance of 'Error' copy its properties
			if (type instanceof Error) {
				for(var prop in type){
					if(type.hasOwnProperty(prop)){
						this[prop] = type[prop];
					}
				}
				msgObj = {type: type.name, code: (type.code || 0), text: (message || type.message)};
			} else {
				msgObj = getMessage(type, message);
			}

			// In case additional arguments are specified (e.g. beyond message) see if
			// we need to inject them into the message. Placeholders for the arguments
			// are formatted as '%{n}' where n is a zero based argument index relative
			// to the 'message' argument.

			if (arguments.length > 2) {
				var args = Array.prototype.slice.call(arguments, 3);
				msgObj.text = msgObj.text.replace( /\%\{(\d+)\}/g, function ( token, argIdx ) {
					return (args[argIdx] != undefined ? args[argIdx] : token);
				});
			}

			this.message = (path.length ? path + ": " : "") + msgObj.text;;
			this.code    = msgObj.code;				// deprecated but provided for backward compatability.
			this.name    = msgObj.type;
		}

		var prefix = module ? "::" : "";
		var module = module || "";

		addMessage( errors || {});

		cbtError.prototype = new Error();
		cbtError.prototype.constructor = cbtError;

		return cbtError;
	};

	createError.normalize = function(/*String*/ resource,/*Function*/ toAbsMid) {
		// summary:
		//		resource may be relative.
		// resource:
		//		The resource string is a list of one or more module ids separated by
		//		exclamation marks: '/path0/file0!/path1/file1!/path2/file2'
		// toAbsMid:
		//		Function to convert a relative module Id to an absolute URL.
		// tag:
		//		Private.
		var paths = resource.split("!"),
		paths = paths.map( function(path) {
			return /^\./.test(path) ? toAbsMid(path) : path;
		});
		// Re-assamble resource string and return it.
		return paths.join("!");
	};

	createError.load = function(/*String*/ resource,/*Function*/ require,/*Function*/ loaded ) {
		// summary:
		//		dojo loader plugin portion. Called by the dojo loader whenever the
		//		module identifier, "cbtree/errors/createError", is followed by an
		//		exclamation mark (!) and a resource string. 
		// resource:
		//		The resource string is a list of one or more module ids separated by
		//		exclamation marks: '/path0/file0!/path1/file1!/path2/file2'
		// require:
		//		AMD require function.
		// loaded
		//		dojo loader callback function. Called by this plugin loader when all
		//		resources have been processed.
		// tag:
		//		Private
		
		function resourceDone() {
			// Notify the dojo loader when all resources have been processed.
			if( --rscCount == 0) {
				loaded(createError);
			}
		}

		// Split the resource string into individual module ids.
		var resources = resource.split("!"),
				rscCount = resources.length;

		// Try loading each resource if we haven't done so already.
		resources.forEach( function( url ) {
			url = require.toUrl(url);
			if ( !(url in cacheURL) ) { 
				request( url, {handleAs: "json" } ).then ( 
					function (response) {
						addMessage( response );
						resourceDone();
					}, 
					function (err) {
						// Known issue: http://bugs.dojotoolkit.org/ticket/16223
						console.log(err);
						resourceDone();
					}
				);
				cacheURL[url] = true;
			} else {
				resourceDone();
			}
		});
	};

	return createError;

});

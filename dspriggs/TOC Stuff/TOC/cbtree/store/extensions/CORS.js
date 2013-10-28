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
        "dojo/_base/lang",
				"dojo/Deferred",
				"dojo/request",
				"dojo/request/handlers",
				"../Memory",
				"../../errors/createError!../../errors/CBTErrors.json"
			 ], function (module, lang, Deferred, request, handlers, Memory, createError ) {
	"use strict";
	
	// module:
	//		cbtree/store/CORS
	// summary:
	//		

	var CBTError = createError( module.id );		// Create the CBTError type.

	var CORS = {
		// summary:
		//		Add support for Cross-Origin Resource Sharing (CORS) to cbtree stores
		//		with the exception of the cbtree FileStore.
		//
		// example:
		//		To add CORS support to any cbtree store, with the expection of the
		//		FileStore, simply load the CORS extension:
		//
		//	|	required(["cbtree/store/Memory",
		//	|						"cbtree/store/extensions/CORS"
		//	|					 ], function( Memory, CORS ) {
		//	|		var myStore = new Memory( ... );
		//	|	});
		
		// timeout: Number | null
		//		The number of milliseconds to wait for the response. If this time passes
		//		the request is canceled and the promise rejected.
		timeout: null,

		_xhrGet: function (url, handleAs, options) {
			var options = lang.mixin ({timeout: this.timeout}, options);
			var headers = null;

			// URL must start with either 'http://' or 'https://'
			if (/^https?\:\/\//i.test(url)) {
				if (typeof XDomainRequest !== "undefined") {
					var xdr = new XDomainRequest()
					var dfd = new Deferred(xdr.abort);
					if (xdr) {
						// IE9 issue: request may be aborted by the browser for no obvious reason.
						// Workaround: Declare ALL event handlers.
						xdr.onprogress = function () {};
						xdr.onload  = function () {
							var response = {text: xdr.responseText, options:{handleAs: handleAs}};
							var data = handlers( response ).data;
							dfd.resolve( data );	
						};
						xdr.onerror = function () {
							dfd.reject( new CBTError( "RequestError", "_xhrGet", "Failed to load: "+url ) );
						};
						xdr.ontimeout = function() {
							dfd.reject( new CBTError( "RequestError", "_xhrGet", "Timeout loading: "+url ) );
						}
						if (options.timeout && options.timeout > 0) {
							xdr.timeout = options.timeout;
						}
						xdr.open("get", url);
						xdr.send();

						return dfd.promise;
					}
				} else {
					// Force dojo not to add the 'X-Requested-With' header.
					headers = {"X-Requested-With": null};
				}
			}
			return request(this.url, {method:"GET", handleAs: handleAs, headers:headers, 
																 timeout: options.timeout, preventCache: true});
		}

	};	/* end CORS */

	Memory.extend( CORS );
	return true;

});

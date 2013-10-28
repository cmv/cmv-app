define (["module",
				 "./_Path",
				 "../../errors/createError!../../errors/CBTErrors.json"
        ], function (module, Path, createError) {
	"use strict";

	var CBTError = createError( module.id );		// Create the CBTError 

	// Define a function if JavaScript 1.8.5 is not supported.
	var defineProperty = Object.defineProperty || function (obj, property, options) {
		if (obj[property] == undefined) {
			obj[property] = options.value;
		}
	};

	function argsToPaths() {
		// summary:
		//		Convert the variable length arguments list into an array of Paths.
		// tag:
		//		Private
		var args  = Array.prototype.slice.call(arguments);
		var items = [];

		args.forEach( function( argument ) {
			if (typeof argument === "string" || argument instanceof String) {
				items.push( new Path(argument) );
			} else if (argument instanceof Path) {
				items.push(argument);
			} else if (argument instanceof Array) {
				items = items.concat( argsToPaths.apply( this, argument ));
			} else if (argument instanceof PathList) {
				items = items.concat( argsToPaths.apply( this, Array.prototype.slice.call(argument) ));
			} else {
				throw new CBTError("InvalidType", "argsToPaths");
			}
		});
		return items;
	}

	function intersect (/*PathList*/ pathsA,/*PathList*/ pathsB,/*Boolean*/ inclusive,/*Boolean*/ same ) {
		// summary:
		//		Get all intersections of two sets of paths
		// pathsA:
		//		PathList or array of Paths.
		// pathsB:
		//		PathList or array of Paths.
		// inclusive:
		//		Indicates if the list of intersections should include the end-points.
		// same:
		//		Indicates if arguments pathsA and pathsA are the same set of paths.
		// returns:
		//		An array of segments.
		// tag:
		//		Private.
		var res = [];
		
		pathsA.forEach (function (pathA) {
			if (same) { pathsB.shift(); };
			
			pathsB.forEach( function (pathB) {
				pathA.intersect(pathB, inclusive).forEach( function (segment) {
					if (res.indexOf(segment) == -1) {
						res.push(segment);
					}
				});
			});
		});
		return res;
	}


	function PathList () {
		// summary:
		//		The PathList is an array 'like' object whose content is a set of objects
		//		of type Path.
		// methods:
		//		contains  - Returns true is any path contains a given segment.
		//		intersect - Returns the intersections of two sets of paths.
		//		segments  - Get a list of unique segments across all paths.
		//		filter    - Array.prototype.filter
		//		forEach   - Array.prototype.forEach
		//		push      - Add new path(s) to the PathList content.
		//		some      - Array.prototype.forEach
		//
		this.contains = function (segment) {
			if (this !=  null && segment) {
				return this.some( function (path) {
					if (path.contains( segment )) {
						return true;
					}
				});
			}
			throw new CBTError("InvalidType", "contains");
		};

		this.intersect = function (paths, inclusive) {
			if (this != null) {
				var pathList, sameList = false;
				if (arguments.length) {
					if (typeof paths == "boolean") {
						inclusive = !!arguments[0];
					} else {
						pathList = argsToPaths(paths);
					}
				}
				if (!pathList) {
					pathList = Array.prototype.slice.call(this, 0);
					sameList  = true;
				}
				return intersect( this, pathList, inclusive, sameList );
			}
			throw new CBTError("InvalidType", "intersect");
		};
		
		this.segments = function () {
			if (this != null) {
				var res = [];
				this.forEach( function (path) {
					path.segments().forEach( function (segment) {
						if (res.indexOf(segment) == -1) {
							res.push(segment);
						}
					});
				});
				return res;
			}
			throw new CBTError("InvalidType", "segments");
		};

		//===
		// Array style methods.

		this.filter = function ( callback, thisArg ) {
			if (this !=  null && typeof callback == "function") {
				var res = new PathList();
				var obj = Object(this);
				var idx, val;

				for (idx=0; idx < obj.length; idx++) {
					if (idx in obj) {
						val = obj[idx];
						if (callback.call( thisArg, val, idx, obj)) {
							res.add( val );
						}
					}
				}
				return res;
			}
			throw new CBTError("InvalidType", "filter");
		};

		this.forEach = function ( callback , thisArg ) {
			if (this !=  null && typeof callback == "function") {
				var obj = Object(this);
				var idx = 0;

				for (idx=0; idx < obj.length; idx++) {
					if (idx in obj) {
						callback.call( thisArg, obj[idx], idx, obj );
					}
				}
			} else {
				throw new CBTError("InvalidType", "forEach");
			}
		}

		this.push = function () {
			if (arguments.length > 0) {
				var paths = argsToPaths.apply(this, arguments );
				if (paths.length > 0) {
					paths.forEach( function( item, idx ) {
						Object.defineProperty( this, this.length+idx, {	value: item, enumerable: true, writable: false	});
						this.length++;
					}, this);
				}
			}
		};

		this.some = function ( callback, thisArg ) {
			if (this !=  null && typeof callback == "function") {
				var obj = Object(this);
				var idx = 0;

				for (idx=0; idx < obj.length; idx++) {
					if (idx in obj) {
						if (callback.call( thisArg, obj[idx], idx, obj)) {
							return true;
						}
					}
				}
				return false;
			}
			throw new CBTError("InvalidType", "some");
		};

		defineProperty( this, "length", { writable: true,  enumerable: false	});
		defineProperty( this, "filter", { writable: false, enumerable: false	});
		defineProperty( this, "forEach",{ writable: false, enumerable: false	});
		defineProperty( this, "some",   { writable: false, enumerable: false	});
		defineProperty( this, "push",   { writable: false, enumerable: false	});

		this.length = 0;
		
		this.push.apply(this, arguments);
	}

	return PathList;
	
});

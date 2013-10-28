define (["module",
				 "../../errors/createError!../../errors/CBTErrors.json"
				], function (module, createError) {
	"use strict";

	var CBTError = createError( module.id );		// Create the CBTError 

	// Define a function if JavaScript 1.8.5 is not supported.
	var defineProperty = Object.defineProperty || function (obj, property, options) {
		if (obj[property] == undefined) {
			obj[property] = options.value;
		}
	};

	function intersect(pathA, pathB, inclusive) {
		var a = pathA.segments();
		var b = pathB.segments();
		var i = 0, j = 0, r = [];

		if (a.length && b.length) {
			if (inclusive == false) {
				if (a[0] === b[0]) {
					a.shift();
					b.shift();
				}
				if (a[a.length-1] === b[b.length-1]) {
					a.pop();
					b.pop();
				}
			}
			r = a.filter( function( segm ) { 
				return (b.indexOf(segm) != -1);
			} );
		}
		return r;
	};


	function Path ( path, separator ) {
		var separator = separator || "/";
		var segments  = path.split(separator);
		var path      = path;
		
		this.contains = function ( segment ) {
			if (segment) {
				if (typeof segment.test == "function") {
					return segment.test(path);
				}
				return (segments.indexOf(segment) != -1);
			}
			return false;
		};

		this.intersect = function (path, inclusive) {
			if (path instanceof Path) {
				return intersect( this, path, inclusive);
			} else {
				throw new CBTError("InvalidType", "intersect");
			}
		};

		this.segments = function () {
			return segments.slice(0);
		};

		defineProperty( this, "string", { value: path, enumerable: true, writable: false	});
		defineProperty( this, "length", { value: segments.length, enumerable: false});
	}

	return Path;
	
});

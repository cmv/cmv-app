define ([], function () {
  // summary:
  //     ECMA-262 Backward Compatibility Array shim
  //
  //    This shim is used instead of dojo/_base/array for the simple reason that
  //    most browsers have implemented the ECMA-262 Array extensions by now and
  //    therefore provide native support.  Browsers that provide native suuport
  //    are:
  //
  //        Browser            Minimum version
  //      Internet Explorer         9
  //      FireFox                   3.5
  //      Safari                    5
  //      WebKit
  //      Chrome                    7
  //      Opera                     10.50
  //      Konq                      4.3
  //
  //    The prototype extensions below are code snippets collected from:
  //      https://developer.mozilla.org
  //
  //    Additional information can be found at:
  //      https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array)

  if (!Array.prototype.every) {
    Array.prototype.every = function(fun /*, thisp */) {
    "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun != "function") {
        throw new TypeError();
      }
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t && !fun.call(thisp, t[i], i, t)) {
          return false;
        }
      }
      return true;
    };
  }

  if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun /*, thisp */)  {
    "use strict";
      if (this == null) {
        throw new TypeError();
      }

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun != "function") {
        throw new TypeError();
      }
      var res = [];
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          var val = t[i]; // in case fun mutates this
          if (fun.call(thisp, val, i, t)) {
            res.push(val);
          }
        }
      }
      return res;
    };
  }

  if ( !Array.prototype.forEach ) {
    Array.prototype.forEach = function forEach( callback, thisArg ) {
    "use strict";
      var T, k;
      if ( this == null ) {
        throw new TypeError( "this is null or not defined" );
      }
      var O = Object(this);
      var len = O.length >>> 0; // Hack to convert O.length to a UInt32
      if ( {}.toString.call(callback) !== "[object Function]" ) {
        throw new TypeError( callback + " is not a function" );
      }
      if ( thisArg ) {
        T = thisArg;
      }
      k = 0;
      while( k < len ) {
        var kValue;
        if ( Object.prototype.hasOwnProperty.call(O, k) ) {
          kValue = O[ k ];
          callback.call( T, kValue, k, O );
        }
        k++;
      }
    };
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
    "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (len === 0) {
        return -1;
      }
      var n = 0;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n != n) { // shortcut for verifying if it's NaN
          n = 0;
        } else if (n != 0 && n != Infinity && n != -Infinity) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) {
        return -1;
      }
      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (; k < len; k++) {
        if (k in t && t[k] === searchElement) {
          return k;
        }
      }
      return -1;
    }
  }

  if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function(searchElement /*, fromIndex*/) {
    "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (len === 0)
        return -1;

      var n = len;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n != n) {
          n = 0;
        } else if (n != 0 && n != (1 / 0) && n != -(1 / 0)) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }

      var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);

      for (; k >= 0; k--) {
        if (k in t && t[k] === searchElement) {
          return k;
        }
      }
      return -1;
    };
  }

  if (!Array.prototype.map) {
    Array.prototype.map = function(callback, thisArg) {
    "use strict";
      if (this == null) {
        throw new TypeError(" this is null or not defined");
      }
      var T, A, k;
      var O = Object(this);
      var len = O.length >>> 0;
      if ({}.toString.call(callback) != "[object Function]") {
        throw new TypeError(callback + " is not a function");
      }
      if (thisArg) {
        T = thisArg;
      }
      A = new Array(len);
      k = 0;
      while(k < len) {
        var kValue, mappedValue;
        if (k in O) {
          kValue = O[ k ];
          mappedValue = callback.call(T, kValue, k, O);
          A[ k ] = mappedValue;
        }
        k++;
      }
      return A;
    };
  }

  if (!Array.prototype.some) {
    Array.prototype.some = function(fun /*, thisp */)  {
    "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun != "function") {
        throw new TypeError();
      }
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t && fun.call(thisp, t[i], i, t)) {
          return true;
        }
      }
      return false;
    };
  }

});  /* end define() */

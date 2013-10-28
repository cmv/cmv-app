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

define(["dojo/Deferred"], function (Deferred) {
	"use strict";

	function Mutex (shared) {
		// summary:
		// shared:
		//		TODO: Implement shared mutex...
		// tag:
		//		Public
		var waiting = [];
		var locked	= false;
		var shared	= !!shared;
		var self		= this;

		function signalWaiting () {
			if (waiting.length) {
				var listener = waiting[0];
				try {
					listener.cb();
				} catch (err) {
					self.onError(err);
					throw err;
				}
				return true;
			}
		}

		this.aquire = function (callback, scope) {
			return this.then( function () {
				scope ? callback.call(scope) : callback();
			});
		};

		this.then = function (callback) {
			var listener = {cb: callback, def: new Deferred()};
			waiting.push(listener);
			if (!locked) {
				locked = true;
				signalWaiting();
			}
			return listener.def.promise;
		};

		this.release = function (value) {
			if (locked) {
				var listener = waiting.shift();
				listener.def.resolve(value);
				if (!signalWaiting()) {
					locked = false;
				}
			}
		};

		this.onError = function (value) {
			if (locked) {
				var listener = waiting.shift();
				listener.def.reject(value);
				if (!signalWaiting()) {
					locked = false;
				}
			}
		};
	}
	return Mutex;
});
define([
	'dojo/_base/declare',
	'dijit/_WidgetBase',
	'esri/dijit/Bookmarks',
	'dojo/json',
	'dojo/cookie',
	'dojo/_base/lang'
], function(declare, _WidgetBase, Bookmarks, json, cookie, lang) {

	//anonymous function to load CSS files required for this module
	(function() {
		var css = [require.toUrl("gis/dijit/Bookmarks/css/Bookmarks.css")];
		var head = document.getElementsByTagName("head").item(0),
			link;
		for (var i = 0, il = css.length; i < il; i++) {
			link = document.createElement("link");
			link.type = "text/css";
			link.rel = "stylesheet";
			link.href = css[i].toString();
			head.appendChild(link);
		}
	}());

	var bookmarks = [{
		extent: {
			xmin: -15489130.48708616,
			ymin: 398794.4860580916,
			xmax: -5891085.7193757,
			ymax: 8509680.431452557,
			spatialReference: {
				wkid: 102100
			}
		},
		name: "USA"
	}];

	return declare([_WidgetBase], {
		postCreate: function() {
			this.inherited(arguments);

			this.bookmarkItems = cookie("bookmarkItems");
			if (this.bookmarkItems === undefined) {
				this.bookmarkItems = [];
			} else {
				this.bookmarkItems = json.parse(this.bookmarkItems);
			}

			this.bookmarks = new Bookmarks({
				map: this.map,
				editable: this.editable,
				bookmarks: lang.mixin(this.bookmarkItems, bookmarks)
			}, this.domNode);

			this.connect(this.bookmarks, "onEdit", "setBookmarks");
			this.connect(this.bookmarks, "onRemove", "setBookmarks");
		},
		setBookmarks: function() {
			cookie('bookmarkItems', json.stringify(this.bookmarks.toJson()), {
				expires: 365
			});
		},
		_export: function() {
			return json.stringify(this.bookmarks.toJson());
		}
	});
});
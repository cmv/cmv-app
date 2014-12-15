define([
	'dojo/_base/declare',
	'dijit/TitlePane',
	'dojo/on',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/dnd/Moveable',
	'dojo/aspect',
	'dojo/topic',
	'dojo/_base/window',
	'dojo/window',
	'dojo/dom-geometry',
	'dojo/dom-style',
	'dojo/dom-construct',
	'dojo/dom-attr',
	'dojo/dom-class',
	'xstyle/css!./FloatingTitlePane/css/FloatingTitlePane.css'
], function (declare, TitlePane, on, array, lang, Moveable, aspect, topic, win, winUtils, domGeom, domStyle, domConstruct, domAttr, domClass) {
	return declare([TitlePane], {
		postCreate: function () {
			if (this.canFloat) {
				this.createDomNodes();
				this.own(on(window, 'resize', lang.hitch(this, '_endDrag')));
			}
			this.own(topic.subscribe('titlePane/event', lang.hitch(this, '_updateWidgetPosition')));
			this.own(aspect.after(this, 'toggle', lang.hitch(this, '_afterToggle')));
			this.inherited(arguments);
		},
		startup: function () {
			if (this.titleBarNode && this.canFloat) {
				this._moveable = new Moveable(this.domNode, {
					handle: this.moveHandleNode
				});
				aspect.after(this._moveable, 'onMoveStop', lang.hitch(this, '_endDrag'), true);
				aspect.after(this._moveable, 'onFirstMove', lang.hitch(this, '_moveDom'), true);
			}
			this.inherited(arguments);
		},
		createDomNodes: function () {
			this.dockHandleNode = domConstruct.create('span', {
				title: 'Dock widget'
			}, this.titleNode, 'after');
			domStyle.set(this.dockHandleNode, 'display', 'none');
			domClass.add(this.dockHandleNode, 'floatingWidgetDock');
			this.own(on(this.dockHandleNode, 'click', lang.hitch(this, function (evt) {
				this._dockWidget();
				evt.stopImmediatePropagation();
			})));

			this.moveHandleNode = domConstruct.create('span', {
				title: 'Move widget'
			}, this.titleNode, 'after');
			domClass.add(this.moveHandleNode, 'floatingWidgetPopout');
			this.own(on(this.moveHandleNode, 'click', lang.hitch(this, function (evt) {
				this._undockWidget();
				evt.stopImmediatePropagation();
			})));
		},
		_undockWidget: function () {
			if (!this.isFloating) {
				domClass.add(this.moveHandleNode, 'floatingWidgetMove');
				domClass.remove(this.moveHandleNode, 'floatingWidgetPopout');
			}
		},
		_dockWidget: function () {
			domAttr.remove(this.domNode, 'style');
			domStyle.set(this.dockHandleNode, 'display', 'none');

			var dockedWidgets = this.sidebar.getChildren();
			if (this.position > dockedWidgets.length) {
				this.position = dockedWidgets.length;
			}
			this.placeAt(this.sidebar, this.position);

			domClass.remove(this.moveHandleNode, 'floatingWidgetMove');
			domClass.add(this.moveHandleNode, 'floatingWidgetPopout');
			this.isFloating = false;
			this._updateTopic('dock');
		},
		_moveDom: function () {
			if (!this.isFloating) {
				var dockedWidgets = this.sidebar.getChildren();
				this.position = dockedWidgets.length;
				var k = 0;
				array.forEach(dockedWidgets, lang.hitch(this, function (widget) {
					if (widget === this) {
						this.position = k;
					}
					k++;
				}));

				domStyle.set(this.dockHandleNode, 'display', 'inline');
				domStyle.set(this.domNode, 'z-index', '40');
				domClass.add(this.moveHandleNode, 'floatingWidgetMove');
				domClass.remove(this.moveHandleNode, 'floatingWidgetPopout');
				var computedStyle = domStyle.getComputedStyle(this.containerNode);
				var width = parseInt(domStyle.getComputedStyle(this.sidebar.containerNode).width, 10);
				domGeom.setContentSize(this.domNode, {
					w: (width - 2)
				}, computedStyle);
				// domGeom.setContentSize(this.titleBarNode, {
				// 	w: (width - 32)
				// }, computedStyle);
				this.isFloating = true;
				this.placeAt(win.body());
				this._updateTopic('undock');
			}
		},
		_endDrag: function () {
			// summary:
			//		Called after dragging the Dialog. Saves the position of the dialog in the viewport,
			//		and also adjust position to be fully within the viewport, so user doesn't lose access to handle
			var nodePosition = domGeom.position(this.domNode);
			var viewport = winUtils.getBox(this.ownerDocument);
			nodePosition.y = Math.min(Math.max(nodePosition.y, 0), (viewport.h - nodePosition.h));
			nodePosition.x = Math.min(Math.max(nodePosition.x, 0), (viewport.w - nodePosition.w));
			this._relativePosition = nodePosition;
			this._position();
		},
		_position: function () {
			// summary:
			//		Position the dialog in the viewport.  If no relative offset
			//		in the viewport has been determined (by dragging, for instance),
			//		center the dialog.  Otherwise, use the Dialog's stored relative offset,
			//		adjusted by the viewport's scroll.
			if (!domClass.contains(this.ownerDocumentBody, 'dojoMove')) { // don't do anything if called during auto-scroll
				var node = this.domNode,
					viewport = winUtils.getBox(this.ownerDocument),
					p = this._relativePosition,
					bb = p ? null : domGeom.position(node),
					l = Math.floor(viewport.l + (p ? p.x : (viewport.w - bb.w) / 2)),
					t = Math.floor(viewport.t + (p ? p.y : (viewport.h - bb.h) / 2));
				domStyle.set(node, {
					left: l + 'px',
					top: t + 'px'
				});
			}
		},
		_updateWidgetPosition: function (msg) {
			var id = msg.widgetID,
				pos = msg.position,
				action = msg.action;
			var dockedWidgets = this.sidebar.getChildren();

			// do nothing if the topic is from the same widget
			// or this widget is not currently floating
			if (id === this.id || !this.isFloating) {
				return;
			}

			// increment the position if the other widget is docked
			// above this widget's position
			if (action === 'dock') {
				if (pos < this.position && this.position < dockedWidgets.length) {
					this.position++;
				}

			// decrement the position if the other widget is undocked
			// above this widget's position
			} else if (action === 'undock') {
				if (pos < this.position && this.position > 0) {
					this.position--;
				}
			}
		},
		_updateTopic: function (msg) {
			topic.publish('titlePane/event', {
				category: 'Titlepane Event',
				action: msg,
				label: this.title,
				widgetID: this.id,
				position: this.position,
				value: msg
			});

		},
		_afterToggle: function () {
			var evt = this.open ? 'open' : 'close';
			this._updateTopic(evt);
		}
	});
});
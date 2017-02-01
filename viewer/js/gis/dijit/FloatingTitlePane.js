define([
    'dojo/_base/declare',
    'dijit/TitlePane',
    'dojo/on',
    'dojo/_base/lang',
    'dojo/dnd/Moveable',
    'dojo/aspect',
    'dojo/topic',
    'dojo/sniff',
    'dojo/_base/window',
    'dojo/window',
    'dojo/dom-geometry',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojox/layout/ResizeHandle',
    'xstyle/css!dojox/layout/resources/ResizeHandle.css',
    'xstyle/css!./FloatingTitlePane/css/FloatingTitlePane.css'
], function (declare, TitlePane, on, lang, Moveable, aspect, topic, has, win, winUtils, domGeom, domStyle, domConstruct, domAttr, domClass, ResizeHandle) {

    return declare([TitlePane], {
        sidebarPosition: null,

        canFloat: false,
        isFloating: false,
        isDragging: false,
        dragDelay: 3,

        resizable: false,
        resizeOptions: {},
        isResizing: false,

        postCreate: function () {
            if (this.canFloat) {
                this.createDomNodes();
                this.own(on(window, 'resize', lang.hitch(this, '_endDrag')));
            }
            if (this.iconClass) {
                this.iconNode = domConstruct.create('span', {
                    'class': 'titlePaneIcon fa fa-fw ' + this.iconClass
                }, this.titleNode, 'before');
            }
            this.own(topic.subscribe('titlePane/event', lang.hitch(this, '_updateWidgetSidebarPosition')));
            this.own(aspect.after(this, 'toggle', lang.hitch(this, '_afterToggle')));
            this.inherited(arguments);
        },
        startup: function () {
            if (this.titleBarNode && this.canFloat) {
                this._moveable = new Moveable(this.domNode, {
                    handle: this.titleBarNode,
                    delay: this.dragDelay
                });
                if (this.dragDelay > 0) {
                    this._moveable.mover.prototype.onMouseUp = function (e) {
                        this.destroy();
                        e.preventDefault();
                        e.stopPropagation();
                    };
                }
                this._titleBarHeight = domStyle.get(this.titleBarNode, 'height');
                aspect.after(this._moveable, 'onMove', lang.hitch(this, '_dragging'), true);
                aspect.after(this._moveable, 'onMoveStop', lang.hitch(this, '_endDrag'), true);
                aspect.after(this._moveable, 'onMoveStart', lang.hitch(this, '_startDrag'), true);

                // ensure that dragging the movable stops no matter
                // when/where the mouse is released or a touch is completed
                on(document, 'mouseup, touchend', lang.hitch(this, '_endDrag'));
            }
            this.inherited(arguments);
        },
        createDomNodes: function () {
            this.moveHandleNode = domConstruct.create('span', {
                title: 'Move widget',
                'class': 'floatingWidgetPopout'
            }, this.titleNode, 'after');

            this.dockHandleNode = domConstruct.create('span', {
                title: 'Dock widget',
                style: 'display:none',
                'class': 'floatingWidgetDock'
            }, this.titleNode, 'after');
            this.own(on(this.dockHandleNode, 'click', lang.hitch(this, function (evt) {
                this._dockWidget();
                evt.stopImmediatePropagation();
            })));

            if (this.resizable) {
                var resOptions = lang.mixin({
                    targetId: this.id,
                    activeResize: true,
                    intermediateChanges: true,
                    startTopic: this.id + '/resize/start',
                    endTopic: this.id + '/resize/end'
                }, this.resizeOptions);
                this._resizer = new ResizeHandle(resOptions).placeAt(this.id);
                domStyle.set(this._resizer.resizeHandle, 'display', 'none');
                on(this._resizer, 'resize', lang.hitch(this, '_resizing'), true);
                this.own(topic.subscribe(this.id + '/resize/start', lang.hitch(this, '_startResize')));
                this.own(topic.subscribe(this.id + '/resize/end', lang.hitch(this, '_endResize')));
            }
        },

        /* Methods related to Toggling the TitleBar */
        toggle: function () {
            if ((this.isFloating && this.isDragging) || this.resizing) {
                return;
            }
            this.inherited(arguments);
        },
        _afterToggle: function () {
            var evt = this.open ? 'open' : 'close';
            this._updateTopic(evt);
        },

        /* Methods for Dragging */
        _dragging: function () {
            this.isDragging = true;
            if (!this.titleCursor) {
                this.titleCursor = domStyle.get(this.titleBarNode, 'cursor');
            }
            domStyle.set(this.titleBarNode, 'cursor', 'move');
            if (!this.isFloating) {
                this._checkSidebarPosition();
                domStyle.set(this.dockHandleNode, 'display', 'inline');
                domStyle.set(this.moveHandleNode, 'display', 'none');
                domStyle.set(this.domNode, 'z-index', '40');
                var computedStyle = domStyle.getComputedStyle(this.containerNode);
                var width = parseInt(domStyle.getComputedStyle(this.sidebar.containerNode).width, 10);
                domGeom.setContentSize(this.domNode, {
                    w: (width - 2)
                }, computedStyle);
                this.isFloating = true;
                this.placeAt(win.body());
                domStyle.set(this.domNode, {
                    top: (this._moverBox.t - this._titleBarHeight) + 'px'
                });

                if (this.resizable && this._resizer && this._resizer.resizeHandle) {
                    domStyle.set(this._resizer.resizeHandle, 'display', 'block');
                }
                this._updateTopic('undock');
            }
        },
        _startDrag: function (mover) {
            this._moverBox = mover.marginBox;
        },
        _endDrag: function () {
            // summary:
            //      Called after dragging the Dialog. Saves the position of the dialog in the viewport,
            //      and also adjust position to be fully within the viewport, so user doesn't lose access to handle
            var nodePosition = domGeom.position(this.domNode);
            var viewport = winUtils.getBox(this.ownerDocument);
            nodePosition.y = Math.min(Math.max(nodePosition.y, 0), (viewport.h - nodePosition.h));
            nodePosition.x = Math.min(Math.max(nodePosition.x, 0), (viewport.w - nodePosition.w));
            this._relativePosition = nodePosition;
            this._position();
            domStyle.set(this.titleBarNode, 'cursor', this.titleCursor);

            //delayed slightly so the titlebar does not toggle
            window.setTimeout(lang.hitch(this, function () {
                this.isDragging = false;
            }), 50);
        },
        _position: function () {
            // summary:
            //      Position the dialog in the viewport.  If no relative offset
            //      in the viewport has been determined (by dragging, for instance),
            //      center the dialog.  Otherwise, use the Dialog's stored relative offset,
            //      adjusted by the viewport's scroll.
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

        /* Methods for Docking and Undocking */
        _dockWidget: function () {
            if (!this.isDragging) {
                domAttr.remove(this.domNode, 'style');
                domStyle.set(this.dockHandleNode, 'display', 'none');
                domStyle.set(this.moveHandleNode, 'display', 'inline');
                var dockedWidgets = this.sidebar.getChildren();
                if (this.sidebarPosition > dockedWidgets.length || this.sidebarPosition < 0) {
                    this.sidebarPosition = dockedWidgets.length;
                }
                this.placeAt(this.sidebar, this.sidebarPosition);
                this.isFloating = false;
                this._updateTopic('dock');
            }
            if (this.resizable && this._resizer && this._resizer.resizeHandle) {
                domStyle.set(this._resizer.resizeHandle, 'display', 'none');
                if (this._initialDimensions) {
                    topic.publish(this.id + '/resize/resize', this._initialDimensions);
                }
            }
        },
        _updateWidgetSidebarPosition: function (msg) {
            var id = msg.widgetID, pos = msg.sidebarPosition, action = msg.action;

            // do nothing if the topic is from the same widget
            // or this widget cannot float
            // or if the action is not dock/undock
            if (id === this.id || !this.canFloat || (action !== 'dock' && action !== 'undock')) {
                return;
            }

            this._checkSidebarPosition();

            // increment the position if the other widget is docked
            // above this widget's position
            if (action === 'dock') {
                var dockedWidgets = this.sidebar.getChildren();
                if (pos < this.sidebarPosition && this.sidebarPosition < dockedWidgets.length) {
                    this.sidebarPosition++;
                }

            // decrement the position if the other widget is undocked
            // above this widget's position
            } else if (action === 'undock') {
                if (pos < this.sidebarPosition && this.sidebarPosition > 0) {
                    this.sidebarPosition--;
                }
            }
        },
        _checkSidebarPosition: function () {
            // set the initial sidebar positions for all floating
            // widgets in this same sidebar. This is done
            // only once when the first widget is undocked.
            var dockedWidgets = this.sidebar.getChildren();
            if (this.sidebarPosition === null) {
                var k = 0, len = dockedWidgets.length;
                for (k = 0; k < len; k++) {
                    var widget = dockedWidgets[k];
                    if (widget.canFloat) {
                        widget.sidebarPosition = k;
                    }
                }
            }
        },

        /* Methods for Resizing */
        _resizing: function (evt) {
            this.isResizing = true;
            var newDim = this._resizer._getNewCoords(evt, this, 'margin');
            if (newDim) {
                topic.publish(this.id + '/resize/resize', {
                    h: this._resizeDimensions.h + (newDim.h - this._resizer.startSize.h),
                    w: this._resizeDimensions.w + (newDim.w - this._resizer.startSize.w)
                });
            }
        },
        _startResize: function () {
            this.isResizing = true;
            this._resizeDimensions = domGeom.getContentBox(this.containerNode);
            if (!this._initialDimensions) {
                this._initialDimensions = this._resizeDimensions;
            }
        },
        _endResize: function () {
            this.isResizing = false;
            domStyle.set(this.domNode, 'height', 'auto');
        },

        _updateTopic: function (msg) {
            topic.publish('titlePane/event', {
                category: 'Titlepane Event',
                action: msg,
                label: this.title,
                widgetID: this.id,
                sidebarPosition: this.sidebarPosition,
                value: msg
            });
        }
    });
});
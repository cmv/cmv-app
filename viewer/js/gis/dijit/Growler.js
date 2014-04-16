define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    'dojo/_base/lang',
    "dojo/dom-style",
    "dojo/dom-construct",
    'dojo/_base/fx',
    "dojo/dom-class",
    "dojo/text!./Growler/templates/Growl.html",
    'xstyle/css!./Growler/css/Growler.css'
    ], function(declare, _WidgetBase, _TemplatedMixin, lang, Style, domConstruct, fx, domClass, growlTemplate, css) {

    // main growler dijit
    var Growler = declare([_WidgetBase, _TemplatedMixin], {
        templateString: '<div data-dojo-attach-point="containerNode"></div>',
        growl: function(props) {
            props = props || {};
            lang.mixin(props, {
                container: this.containerNode
            });
            new Growl(props);
        }
    });

    // the growl itself
    var Growl = declare([_WidgetBase, _TemplatedMixin], {
        templateString: growlTemplate,
        title: "Title",
        message: "Message",
        timeout: 3000,
        opacity: 0.85,
        container: null,
        timer: null,
        postCreate: function() {
            this.inherited(arguments);
            if(this.container) {
                Style.set(this.domNode, 'opacity', 0);
                domConstruct.place(this.domNode, this.container);
                fx.anim(this.domNode, {
                    opacity: this.opacity
                }, 250);
                this.setTimeout();
            } else {
                console.log("Growl container not found/specified.");
            }
        },
        setTimeout: function() {
            this.timer = setTimeout(lang.hitch(this, 'close'), this.timeout);
        },
        hoverOver: function() {
            clearInterval(this.timer);
            domClass.add(this.domNode, 'hover');
        },
        hoverOut: function() {
            this.setTimeout();
            domClass.remove(this.domNode, 'hover');
        },
        close: function() {
            fx.anim(this.domNode, {
                opacity: 0
            }, 500, null, lang.hitch(this, 'remove'));
        },
        remove: function() {
            fx.anim(this.domNode, {
                height: 0,
                margin: 0
            }, 250, null, lang.partial(domConstruct.destroy, this.domNode));
        }
    });
    return Growler;
});
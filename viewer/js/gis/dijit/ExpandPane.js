define([
    'dojo/_base/declare',
    './FloatingTitlePane',

    'dojo/dom-class',

    'xstyle/css!./ExpandPane/css/ExpandPane.css'
], function (declare, FloatingTitlePane, domClass) {
    return declare([FloatingTitlePane], {
        paneClass: 'cmvExpandPane',
        postCreate: function () {
            this.canFloat = false;
            this.inherited(arguments);
            if (this.domNode && this.paneClass) {
                domClass.add(this.domNode, this.paneClass);
            }
        }
    });
});
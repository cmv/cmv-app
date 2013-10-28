//
// Copyright (c) 2010-2012, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree), also known as the 'Dijit Tree with Multi State Checkboxes'
//	is released under to following three licenses:
//
//	1 - BSD 2-Clause							 (http://thejekels.com/js/cbtree/LICENSE)
//	2 - The 'New' BSD License			 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License	 (http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
//	In case of doubt, the BSD 2-Clause license takes precedence.
//
define(["dijit/form/CheckBox",
				"dojo/_base/declare",
				"dojo/_base/event",
				"dojo/dom-attr"
			 ], function ( CheckBox, declare, event, domAttr ) {
	"use strict";
	
	return declare( [CheckBox], {
		// baseClass: [protected] String
		//		Root CSS class of the widget (ex: twcCheckBox), used to add CSS
		//		classes of widget.
		//		(ex: 'cbtreeCheckBox cbtreeCheckBoxChecked cbtreeCheckBoxMixed')
		baseClass: 'cbtreeCheckBox',
		
		// value:	Boolean
		//		Indicate if the checkbox is a mutli state checkbox or not. If
		//		multiState is true the 'checked' attr can be either: 'mixed',
		//		true or false otherwise 'checked' can only be true or false.
		multiState: true,

		_getCheckedAttr: function () {
			// summary:
			//		Returns the current checked state. This method provides the hook 
			//		for get('checked').
			return this.checked;
		},
		
		_onClick: function (/*Event*/ evt ) {
			// summary:
			//		Process a click event on the checkbox.
			// description:
			//		Process a click event on the checkbox. If the checkbox is in a mixed
			//		state it will change to checked. Any other state will just toggle the
			//		current checkbox state.
			//
			//		NOTE: A click event will never change the state to mixed.
			// evt:
			//		Click event object
			//
			
			if (!this.readOnly && !this.disabled){
				this.toggle();
				return this.onClick(evt);
			}
			return event.stop(evt);
		},

		_setCheckedAttr: function (/*Boolean | String*/ checked, /*Boolean?*/ priorityChange ) {
			// summary
			//		Set the new checked state of the checkbox.
			// description
			//		Set the new checked state of the checkbox.
			// checked:
			//		New state which is either 'mixed', true or false.
			var newState = checked,
					txtState;

			// Normalize the new state 
			if ( newState !== 'mixed' || !this.multiState ) {
				newState = newState ? true : false;
			} 
			txtState = (newState == 'mixed' ? newState : (newState ? 'true' : 'false'));

			this._set('checked', newState );
			domAttr.set(this.focusNode || this.domNode, 'checked', newState );
			(this.focusNode || this.domNode).setAttribute('aria-checked', txtState );
			this._handleOnChange( newState, priorityChange);
			return newState;
		},

		_setValueAttr: function (/*String | Boolean*/ newValue, /*Boolean?*/ priorityChange){
			// summary:
			//		Handler for value= attribute to constructor, Overwrites the
			//		default '_setValueAttr' method as we will handle the Checkbox
			//		checked attribute explictly.
			// description:
			//		If passed a string, changes the value attribute of the CheckBox
			//		(the one specified as 'value' when the CheckBox was constructed).
			//
			//		NOTE: Changing the checkbox value DOES NOT change the checked state.
			// newValue:
			
			if (typeof newValue == 'string'){
				this.value = newValue;
				domAttr.set(this.focusNode, 'value', newValue);
			}
		},

		toggle: function () {
			// summary:
			//		Toggle the current checkbox state and return the new state. If the
			//		checkbox is read-only or disabled the current state is returned.
			//
			var curState = this.get( 'checked' );
			if (!this.readOnly && !this.disabled){
				return this._setCheckedAttr( (curState == 'mixed' ? true : !curState ) );			
			}
			return curState;
		}
	});	/* end declare() */
});	/* end define() */

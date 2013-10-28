define (["dojo/_base/declare",
				 "dojo/_base/lang"
				],function( declare, lang ) {

		// summary:
		//		
		var sortDecl = declare(null,{

		constructor: function ( /*array*/ sortFields ) {
			var i;
			
			this.sortArgm = [];
		
			if (lang.isArray(sortFields)) {
				for (i=0; i<sortFields.length; i++) {
					var field = sortFields[i];
					if (field.attribute) {
						var sortSpec = { attribute: field.attribute,
														 descending: (field.descending ? -1 : 1),
														 ignoreCase: (field.ignoreCase || false) };
						this.sortArgm.push( sortSpec );
					}
				}
			}
		},

		_compare: function (/*Object*/ a, /*Object*/ b) {
			// summary:
			// returns:
			//		-1, 0 or 1
			// tag:
			//		Private
			var attr, desc, igc,
					valA, valB,
					i

			for (i=0; i<this.sortArgm.length; i++) {
				attr = this.sortArgm[i].attribute;
				desc = this.sortArgm[i].descending;
				igc  = this.sortArgm[i].ignoreCase;
				
				valA = (a[attr] === null ? undefined: a[attr]);
				valB = (b[attr] === null ? undefined: b[attr]);

				if( igc && lang.isString(valA) && lang.isString(valB)) {
					valA = valA.toLowerCase();
					valB = valB.toLowerCase();
				}
				if (valA == valB) continue;
				if (valB == null || valA > valB) {
					return desc * 1;
				}
				if(valA == null || valA < valB) {
					return desc * -1;
				}
			}
			return 0;
		},
		
		sortFunction: function() {
			// summary:
			// tag:
			//		Public
			return lang.hitch( this, this._compare );
		}
		
	});
	return sortDecl;

});

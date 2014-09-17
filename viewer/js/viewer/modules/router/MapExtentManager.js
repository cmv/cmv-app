//not yet used - would like to move map interactions here to increase modularity of code.
define( [
            'dojo/_base/declare'
        ],
        function( declare ) {

            return declare( null, {

                map: null,

                constructor: function ( map ) {
                    this.map = map;
                },

                setCenterAndZoom: function ( lng, lat, zoom ) {

                }

            } );

        }

);



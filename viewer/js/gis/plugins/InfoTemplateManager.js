define ( [
       'dojo/_base/declare',
       'dojo/_base/lang',
       'dojo/on',
       'dojo/topic',
       'esri/map'
    ],
    function( declare, lang, on, topic, map ) {

        return declare( null, {

            map: null,
            mapClickHandlerHandle: null,

            constructor: function( map ) {
                console.log( map );
                this.map = map;
                this.subscribeTopics();

            },

            subscribeTopics: function () {

                topic.subscribe('mapInfoTemplates/disable', lang.hitch(this, this.disableInfoTemplates ) );
                topic.subscribe('mapInfoTemplates/enable', lang.hitch(this, this.enableInfoTemplates ) );

            },

            enableInfoTemplates: function () {
                console.log('enable info templates');

                if (typeof this.map.setInfoWindowOnClick == 'function') {
                    this.map.setInfoWindowOnClick( true );
                    console.log( 'calling setInfoWindowOnClick( true )' );
                } else if ( this.mapClickHandlerHandle && !this.mapClickHandlerConnected ) {
                    console.log( 'using dojo connect' );
                    if ( this.mapClickHandlerHandle ) {
                        dojo.disconnect( this.mapClickHandlerHandle );
                    }
                }

            },

            disableInfoTemplates: function () {
                console.log( 'disable info templates' );

                if (typeof this.map.setInfoWindowOnClick == 'function') {
                    console.log( 'calling setInfoWindowOnClick( false )' );
                    this.map.setInfoWindowOnClick( false );
                } else if ( this.mapClickHandlerHandle ) {
                    console.log( 'using dojo disconnect' );
                    this.mapClickHandlerHandle =  dojo.connect( this.map, 'click', lang.hitch( this, this.mapClickInterceptor ) );
                }

            },

            mapClickInterceptor: function ( event ) {
                console.log( 'map click intercepted' );
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        } );
    }
)

define ( [
       'dojo/_base/declare',
       'dojo/_base/connect',
       'dojo/_base/lang',
       'dojo/_base/array',
       'dojo/on',
       'dojo/topic',
       'esri/map'
    ],
    function( declare, connect, lang, array, on, topic, map ) {

        return declare( null, {

            map: null,
            mapClickHandlerHandle: null,
            infoTemplates: {},
            topicHandles: [],

            constructor: function( map ) {

                this.map = map;
                this.subscribeTopics();

            },

            subscribeTopics: function () {

                this.topicHandles.push(
                    topic.subscribe('mapInfoTemplates/disable', lang.hitch(this, this.disableInfoTemplates ) )
                );
                this.topicHandles.push(
                    topic.subscribe('mapInfoTemplates/enable', lang.hitch(this, this.enableInfoTemplates ) )
                );

            },

            enableInfoTemplates: function () {

                //user this to test for pre 3.10
                //this.restoreInfoTemplates();

                //use this to test 3.10
                if (typeof this.map.setInfoWindowOnClick == 'function') {
                    this.map.setInfoWindowOnClick( true );
                } else if ( this.mapClickHandlerHandle ) {
                    this.restoreInfoTemplates();
                }

            },

            disableInfoTemplates: function () {

                this.map.infoWindow.hide();

                //user this to test for pre 3.10
                //this.stripInfoTemplates();

                //use this to test 3.10
                if (typeof this.map.setInfoWindowOnClick == 'function') {
                    this.map.setInfoWindowOnClick( false );
                } else if ( this.mapClickHandlerHandle ) {
                    this.stripInfoTemplates();
                }

            },

            stripInfoTemplates: function () {

                array.forEach( this.map.layerIds, function ( layerId ) {

                    var layer = this.map.getLayer( layerId );
                    this.infoTemplates[ layerId ] = {};

                    if ( 'infoTemplate' in layer ) {
                        this.infoTemplates[ layerId ].infoTemplate = lang.clone( layer.infoTemplate );
                        layer.infoTemplate = null;
                    }

                    if ( 'infoTemplates' in layer ) {
                        this.infoTemplates[ layerId ].infoTemplates = lang.clone( layer.infoTemplates );
                        layer.infoTemplates = null;
                    }

                }, this );

            },

            restoreInfoTemplates: function () {

                array.forEach( this.map.layerIds, function ( layerId ) {

                    var layer = this.map.getLayer( layerId );

                    if ( 'infoTemplate' in layer && this.infoTemplates[ layerId ].infoTemplate ) {
                        layer.infoTemplate = lang.clone( this.infoTemplates[ layerId ].infoTemplate );
                    }

                    if ( 'infoTemplates' in layer && this.infoTemplates[ layerId ].infoTemplates ) {
                        layer.infoTemplates = lang.clone( this.infoTemplates[ layerId ].infoTemplates );
                    }

                }, this );

            },

            destroy: function () {
                array.forEach( this.topicHandles, function( handle ) {
                   handle.remove();
                }, this );
            }
        } );
    }
);

# Configurable ESRI JS API Viewer

This JS web app can be easily configured or used as a boilerplate/starting point for basic viewers. It also demonstrates best practices for OO and classes in JS.

## Installation:
* Clone or download the repo
* Move to your web server
* configure the proper proxy page. Should work out of the box if using IIS.
* Edit the config.js file to include your services.
* Enjoy!

## Customize:
* Use the ConfigurableViewerJSAPI\js\viewer\config.js file to customize your own map layers and task url's.

## Notes:
* This is the begining of viewer, it in no way represents a complete solution and is intended for well verses JS developers as a starting point.
* This app demonstrates best practices of OO programing in dojo and JS, using modular design and classes.

## Widgets Included:
* Growler
* Draw
* Geolocation
* Advanced Print
* Help
* Measure

## Change log:
* 4/16/2013
	1. Added directions widget with map right-click menu.
	2. Added ability to configure included widgets (include, exclude, order, and settings).
	3. Optimized loading of classes (only load what is needed).
	4. Included identity manager.
	5. Updated to 3.4.
* 2/26/2013
	1. Added sidebar closing feature.
	2. Added measure dijit.
* 2/22/2013
	1. Added basemap dijit.
	2. Restyled the geolocation stats growl content.
* 2/21/2013
	1. Added default settings for print dijit.
	2. Better documented the config.js.
* 2/20/2013:
    1. Moved search to the header.
    2. Added the help dijit.
    3. Improved the legend rendering and added support for title from the config.
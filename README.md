# Configurable ESRI JS API Viewer

This JS web app can be easily configured or used as a boilerplate/starting point for basic viewers. It also demonstrates best practices for OO and classes in JS. [demo](http://davidspriggs.github.io/ConfigurableViewerJSAPI/viewer/)

## Installation:
* Clone or download the repo
* Move to your web server
* configure the proper proxy page. Should work out of the box if using IIS.
* Edit the config.js file to include your services.
* Enjoy!

## Customize:
* Use the ConfigurableViewerJSAPI\js\viewer\config.js file to customize your own map layers and task url's.

## Notes:
* This is the begining of a viewer, it in no way represents a complete solution and is intended for well versed JS developers as a starting point.
* This app demonstrates best practices of OO programing in dojo and JS, using modular design and classes.

## Widgets Included:
* Growler
* Draw
* Geolocation
* Advanced print
* Help
* Measure
* Directions
* Editor
* Scalebar
* Bookmarks
* Table of contents
* Identify (for dynamic layers)

## Change log:
See [releases](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI/releases) for change logs.

## Grunt tasks
This project uses grunt to automate tasks like minifying css and js as well as js linting and css prefixing. A minified version of the app will be created in a `dist` folder.

To get started:
- Install [node](http://nodejs.org/).
- Install the grunt cli (command line interface) globally from the command line with : `npm install -g grunt-cli` this only needs to be done once per dev machine.
- Install jshint globally from the command line with : `npm install -g jshint` this only needs to be done once per dev machine.
- Install the local dependencies for the project in the repo from the command line: `npm install` This only needs to be done once per dev machine.
- Run grunt from the repo with: `grunt` this will create a dist folder with minified code ready for deployment.
- There are other grunt tasks such as `grunt watch` that will lint your js as you code.

## License

MIT

# Configurable Map Viewer (CMV)

[![Build Status](https://travis-ci.org/DavidSpriggs/ConfigurableViewerJSAPI.svg?branch=master)](https://travis-ci.org/DavidSpriggs/ConfigurableViewerJSAPI)

This JS web app can be easily configured or used as a boilerplate/starting point for basic viewers. It also demonstrates best practices for modular design and OOP via classes in JS using dojo's great [declare](http://dojotoolkit.org/reference-guide/1.9/dojo/_base/declare.html) system.


## Demo Site
[http://davidspriggs.github.io/ConfigurableViewerJSAPI/viewer](http://davidspriggs.github.io/ConfigurableViewerJSAPI/viewer)

Note: Not all functions work in the demo site due to a limitation in GitHub project hosting (no functioning proxy page).

## Installation:
* Download the latest release [here](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI/releases).
* Move to your web server
* configure the proper proxy page. Should work out of the box if using IIS.
* Edit the config.js file to include your services and desired widgets.
* Enjoy!

## Customize:
* Use the ConfigurableViewerJSAPI\js\config\viewer.js file to customize your own map layers, task urls and widgets.
* Use the [wiki](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI/wiki) documentation for guidance on configuring widgets.

## Widgets Included:
* Base Maps
* Bookmarks
* Directions
* Draw
* Editor
* Find
* Geocoder
* Growler
* Help Button
* Home
* Identify (for dynamic layers)
* Legend
* Locate Button (Geolocation)
* Measure
* Overview Map
* Print (Advanced)
* Scalebar
* StreetView
* Table of contents
* If there is a feature you would like to request, add it to the projects [trello board](https://trello.com/b/TjjipGmV/configurable-map-viewer) for consideration.

## Change log:
See [releases](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI/releases) for change logs.

## IRC
We have an IRC channel: `#cmv` on freenode for the project. If you have questions, stop on by. I recommend [HexChat](http://hexchat.github.io) as an IRC client or you can use freenode's [webchat](http://webchat.freenode.net) client.

## Contributing to the project
There are many ways to contribute:

1. Contribute code as widgets (see below).
2. Created documentation in [the wiki](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI/wiki).
3. Submit issues you find the the [issue log](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI/issues?state=open).
4. Vote, comment on, and submit ideas for things to build and improvements to the viewer in the [trello board](https://trello.com/b/TjjipGmV/configurable-map-viewer).

### Grunt tasks
This project uses grunt to automate tasks like minifying css and js as well as js linting and css prefixing.

### To get started setup you dev machine:
- Install [node](http://nodejs.org).
- Install the grunt cli (command line interface) globally from the command line with : `npm install -g grunt-cli` this only needs to be done once per dev machine.
- Install jshint globally from the command line with : `npm install -g jshint` this only needs to be done once per dev machine.

### Get the code and install dev dependencies:
- Fork the repo into your own github account.
- Clone your fork and in the repos directory:
- Install the local dev dependencies for the project in the repo from the command line: `npm install` This only needs to be done once per dev machine.
- Run grunt from the repo with: `grunt` this will lint your js as you code.
- Run grunt from the repo with: `grunt build` this will create a `dist` folder with minified code ready for deployment.
- There are other grunt tasks use: `grunt -h` to see a list

## License

MIT

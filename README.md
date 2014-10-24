# Configurable Map Viewer (CMV)

[![Build Status](http://travis-ci.org/cmv/cmv-app.svg?branch=master)](http://travis-ci.org/cmv/cmv-app)

This JS web app can be easily configured or used as a boilerplate/starting point for basic viewers. It also demonstrates best practices for modular design and OOP via classes in JS using dojo's great [declare](http://dojotoolkit.org/reference-guide/1.9/dojo/_base/declare.html) system.

![screen shot 2014-08-20 at 9 59 48 pm](https://cloud.githubusercontent.com/assets/661156/3991302/5aa2e0f2-28df-11e4-94d0-9c813937d933.png)

## Demo Site:
[http://demo.cmv.io/viewer/](http://demo.cmv.io/viewer/)

## Widgets Included:
- Base Maps
- Bookmarks
- Directions
- Draw
- Editor
- Find
- Geocoder
- Growler
- Help
- Home
- Identify
- Layer Control (Table of Contents)
- Legend
- Locate Button (Geolocation)
- MapInfo
- Measure
- Overview Map
- Print
- Scalebar
- StreetView
- Map Right click menu with various widget functions.
- Highly configurable UI, right or left sidebars with widgets in both, top and bottom regions for other content.


## Installation:

- Download the latest release [here](https://github.com/cmv/cmv-app/releases).

- Move to your web server

- configure the proper proxy page. Should work out of the box if using IIS.

- Edit the config.js file to include your services and desired widgets.

- Enjoy!

## Customization:

- Use the configuration files in the `/js/config` folder to customize your own map layers, task urls and widgets.

- Use the [documentation](https://github.com/cmv/cmv-app/wiki) for getting started and guidance on configuring individual widgets.

## Change log:
See [releases](https://github.com/cmv/cmv-app/releases) for change logs.

# Community
We have an IRC channel: `#cmv` on freenode for the project. If you have questions, stop on by. We recommend [HexChat](http://hexchat.github.io) as an IRC client or you can use freenode's [webchat](http://webchat.freenode.net) client.

# Contributing to the Project
There are many ways to contribute to CMV:

1. __Propose a Feature__ - If there is a feature you would like to request, add it to the [issues list](https://github.com/cmv/cmv-app/issues) for consideration.

2. __Submit an Issue__ - If you find a possible bug, please submit an issue in the [issues log](https://github.com/cmv/cmv-app/issues?state=open).

3. __User contributed widgets__ - For general information on how to build a CMV widget read [Builiding Custom Widgets] (https://github.com/cmv/cmv-app/wiki/building-custom-widgets). Users can submit widgets to the [cmv-contrib-widgets](https://github.com/cmv/cmv-contrib-widgets) repo. These widgets are created and submitted by users. Head on over and read the details.

4. __Create documentation__ Please make constructive in [the wiki](https://github.com/cmv/cmv-app/wiki).

5. __Submit a Pull Request__ - If you are developer and have an enhancement or bug fix you would like to submit, pull requests are welcome. Please review the [CONTRIBUTING.md](CONTRIBUTING.md) documentation before submitting any Pull Requests.

# Grunt tasks
This project uses grunt to automate tasks like minifying css and js as well as js linting and css prefixing.

## To get started setup you dev machine:

- Install [node](http://nodejs.org).

- Install the grunt cli (command line interface) globally from the command line with : `npm install -g grunt-cli`, this only needs to be done once per dev machine.

- Install jshint globally from the command line with : `npm install -g jshint`, this only needs to be done once per dev machine.

## Get the code and install dev dependencies:

- Fork the repo into your own github account.

- Clone your fork and in cloned directory:

  - Install the local dev dependencies for the project in the repo from the command line: `npm install`, this only needs to be done once per dev machine.

  - Run grunt from the repo with: `grunt` this will launch a mini dev server and lint your js as you code.

  - Run grunt from the repo with: `grunt build` this will create a `dist` folder with minified code ready for deployment.

  - There are other grunt tasks, use: `grunt -h` to see a list.

# License

MIT

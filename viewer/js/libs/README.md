### 3rd Party Libraries in CMV

There are several projects which can be very useful when web mapping. http://proj4js.org/ and http://terraformer.io/ to name two.

Add them here and add packages in CMV's dojo config as needed.

```javascript
{
	async: true,
	packages: [{
	  name: 'viewer',
	  location: location.pathname.replace(/[^\/]+$/, '') + 'js/viewer'
	}, {
	  name: 'config',
	  location: location.pathname.replace(/[^\/]+$/, '') + 'js/config'
	}, {
	  name: 'gis',
	  location: location.pathname.replace(/[^\/]+$/, '') + 'js/gis'
	}, { 
		name: 'proj4',
		location: location.pathname.replace(/[^\/]+$/, '') + 'js/libs/proj4',
		main: 'proj4.js' // simply require `proj4` and use it
	}]
}
```

#### Installing with Bower and Grunt

Run `bower install` in the root of your CMV project to install into the `bower_componets` directory. Create or run existing grunt copy task to copy the nessesary files to this directory.

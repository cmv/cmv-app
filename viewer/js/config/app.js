(function () {

  // globel dojoConfig is required for async loading of gmaps api
  window.dojoConfig = {
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
    }]
  };

  // get the config file from the url if present
  var file = 'config/viewer',
    s = window.location.search,
    q = s.match(/config=([^&]*)/i);
  if (q && q.length > 0) {
    file = q[1];
    if (file.indexOf('/') < 0) {
      file = 'config/' + file;
    }
  }

  require(window.dojoConfig, ['viewer/Controller', file, 'dojo/domReady!'], function (Controller, config) {
    Controller.startup(config);
  });
})();
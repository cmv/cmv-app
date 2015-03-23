define([
	'dojo/_base/declare',
	'dojo/Deferred'
], function (
	declare, Deferred
) {

	return declare(null, {

		initConfigAsync: function() {
			var returnDeferred = new Deferred();
			// get the config file from the url if present
			var file = 'config/viewer', s = window.location.search, q = s.match(/config=([^&]*)/i);
			if (q && q.length > 0) {
				file = q[1];
				if(file.indexOf('/') < 0) {
					file = 'config/' + file;
				}
			}
			require([file], function(config){
				returnDeferred.resolve(config);
			});
			return returnDeferred;
		}

	});

});
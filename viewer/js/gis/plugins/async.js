define(function () {

    var cb = '_asyncApiLoaderCallback';
    return {
        load: function (param, req, loadCallback) {
            if (!cb) {
                return;
            } else {
                window.dojoConfig[cb] = function () {
                    delete window.dojoConfig[cb];
                    cb = null;
                    loadCallback();
                };
                require([param + '&callback=dojoConfig.' + cb]);
            }
        }
    };
});
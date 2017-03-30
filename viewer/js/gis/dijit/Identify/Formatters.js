define([
    'dojo/number',
    'dojo/date/locale'
], function (number, locale) {
    return {
        formatInt: function (value) {
            return number.format(value);
        },
        formatFloat: function (value) {
            return number.format(value, {
                places: 3
            });
        },
        formatDate: function (value) {
            var date = new Date(value);
            return locale.format(date, {
                formatLength: 'short'
            });
        }
    };
});

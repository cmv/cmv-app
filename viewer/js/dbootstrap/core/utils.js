define("xstyle/core/utils", [], function(){
	// some utility functions
	var supportedTags = {};
	return {
		when: function(value, callback){
			return value && value.then ? 
				value.then(callback) : callback(value);
		},
		convertCssNameToJs: function(name){
			// TODO: put this in a util module since it is duplicated in parser.js
			return name.replace(/-(\w)/g, function(t, firstLetter){
				return firstLetter.toUpperCase();
			});
		},
		isTagSupported: function(tag){
			// test to see if a tag is supported by the browser
			if(tag in supportedTags){
				return supportedTags[tag];
			}
			var elementString = (element = document.createElement(tag)).toString();
			return supportedTags[tag] = !(elementString == "[object HTMLUnknownElement]" || elementString == "[object]");
		}
	};
});
Colors = function() {
  return({
    name: "colors.js",
    version: "0.0.1",
    usedColors: [],
    getColor: function() {
    	var rand = function(min, max) {
    		return Math.floor(Math.random() * (max - min) + min);
		}
		var colors = ["00", "33", "66", "99", "cc", "ff"];
    	var color = "";
    	while (( color == "" || this.usedColors.indexOf(color) > -1)) {
    		color = "";
    		color += colors[rand(0,colors.length)];
    		color += colors[rand(0,colors.length)];
    		color += colors[rand(0,colors.length)];
    	}
    	this.usedColors.push(color);
    	return color;
    },
    brightness: function(hex) {
    	var cr = parseInt(hex.substr(0,2),16);
    	var cg = parseInt(hex.substr(2,2),16);
    	var cb = parseInt(hex.substr(4,2),16);
    	return ((cr * 299) + (cg * 587) + (cb * 114)) / 1000;
    }
  });
}();
exports.name = Colors.name;
exports.version = Colors.version;
exports.colors = Colors.colors;
exports.usedColors = Colors.usedColors;
exports.getColor = Colors.getColor;
exports.brightness = Colors.brightness;

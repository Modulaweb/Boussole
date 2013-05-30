// converts json from/to urlon
URLON={stringify:function(input){function encodeString(str){return encodeURI(str.replace(/([=:&@_;\/])/g,'/$1'))}function stringify(input){if(typeof input==='number'||input===true||input===false||input===null){return':'+input}if(input instanceof Array){var res=[];for(var i=0;i<input.length;++i){res.push(stringify(input[i]))}return'@'+res.join('&')+';'}if(typeof input==='object'){var res=[];for(var key in input){res.push(encodeString(key)+stringify(input[key]))}return'_'+res.join('&')+';'}return'='+encodeString((input||"null").toString())}return stringify(input).replace(/;+$/g,'')},parse:function(str){var pos=0;str=decodeURI(str);function read(){var token='';for(;pos!==str.length;++pos){if(str[pos]==='/'){pos+=1;if(pos===str.length){token+=';';break}}else if(str[pos].match(/[=:&@_;]/)){break}token+=str[pos]}return token}function parse(){var type=str[pos++];if(type==='='){return read()}if(type===':'){var value=read();if(value==='true'){return true}if(value==='false'){return false}value=parseFloat(value);return isNaN(value)?null:value}if(type==='@'){var res=[];loop:{if(pos>=str.length||str[pos]===';'){break loop}while(1){res.push(parse());if(pos>=str.length||str[pos]===';'){break loop}pos+=1}}pos+=1;return res}if(type==='_'){var res={};loop:{if(pos>=str.length||str[pos]===';'){break loop}while(1){var name=read();res[name]=parse();if(pos>=str.length||str[pos]===';'){break loop}pos+=1}}pos+=1;return res}throw'Unexpected char '+type}return parse()}};

// retrieve an url param
function getUrlParam(name){name=name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");var regexS="[\\?&]"+name+"=([^&#]*)";var regex=new RegExp(regexS);var results=regex.exec(window.location.href);if(results==null)return false;else return results[1]}

/* utilities */
function inArray(needle, haystack) {
	if (haystack instanceof Array) {
		var length = haystack.length;
		for(var i = 0; i < length; i++)
			if(haystack[i] == needle) return true;
		return false;
	} else {
		return false
	}
}
function intersectArray(needle, haystack, return_count) {
	if (haystack instanceof Array && needle instanceof Array) {
		var length = needle.length;
		var count = 0;
		for(var i = 0; i < length; i++) {
			if (inArray(needle[i], haystack)) {
				if (return_count == undefined)
					return true;
				else
					count++;
			}
		}
		if (return_count) return count;
		return false;
	} else {
		return false;
	}
}

function humanReadableTime(time,unit) {
	var h,m;
	h = m = 0;
	switch(unit) {
		case 'm': // minutes
		default:
			if (time >= 60) {
				h = parseInt(time/60);
			}
	}
	m = time-(h*60);

	var ret = '';
	if (h>0) ret+= h+' h';
	if (m>0) {
		if (ret != '') ret += ' ';
		ret += m+' min';
	}
	return ret;
}
if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [], k;
        for (k in obj)
            if (Object.prototype.hasOwnProperty.call(obj, k))
                keys.push(k);
        return keys;
    };
}
function ucWords(str) {
    str = str+'';
    str = str.toLowerCase();
    return str.replace(/^([a-z])|\s+([a-z])/g, function ($1) {
        return $1.toUpperCase();
    });
}

// cache object
function Cache (name) {
	this.name = name;
	this.warehouses = [];
	this.set = function(args) {
		if (args.key === undefined)
			return false;
		if (args.val === undefined)
			return false;

		this.warehouses[args.key] = args.val
		if (args.lifetime != undefined) {
			window.setTimeout(this.name+'.clean(\''+args.key+'\');',Math.floor(Number(args.lifetime)));
		}
	};
	this.get = function(entry) {
		if (this.warehouses[entry] === undefined)
			return null;
		return this.warehouses[entry];
	};
	this.clean = function (entry) {
		this.warehouses[entry] = null;
	}
}
image_cache = []; // used by cloudmade plugin for openlayers !

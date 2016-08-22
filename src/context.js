"use strict";
var uint32 = require('./uint32');
var NAMED_COLORS = require('./named_colors');

class Context {
    constructor(bitmap) {
        this.bitmap = bitmap;
        this._fillColor = 0x000000FF;
        Object.defineProperty(this, 'fillStyle', {
            get: function() { return this._fillStyle_text; },
            set: function(val) {
                this._fillColor = this.colorStringToUint32(val);
                this._fillStyle_text = val;
            }
        });
    }

    fillRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.bitmap.setPixelRGBA(i,j,this._fillColor);
            }
        }
    }

    clearRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.bitmap.setPixelRGBA(i,j,0x00000000);
            }
        }
    }


    getImageData(x,y,w,h) {
        return this.bitmap;
    }


    colorStringToUint32(str) {
        if(!str) return 0x000000;
        //hex values always get 255 for the alpha channel
        if(str.indexOf('#')==0) {
            var int = uint32.toUint32(parseInt(str.substring(1),16));
            int = uint32.shiftLeft(int,8);
            int = uint32.or(int,0xff);
            return int;
        }
        if(str.indexOf('rgb')==0) {
            var parts = str.trim().substring(3).replace('(','').replace(')','').split(',');
            return uint32.fromBytesBigEndian(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 255);
        }
        if(NAMED_COLORS[str]) {
            return NAMED_COLORS[str];
        }
        throw new Error("unknown style format: " + str );
    }


}
module.exports = Context;

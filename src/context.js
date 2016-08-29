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
                this._fillColor = Context.colorStringToUint32(val);
                this._fillStyle_text = val;
            }
        });
    }

    fillRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                var new_pixel = this.calculateRGBA(i,j);
                var old_pixel = this.bitmap.getPixelRGBA(i,j);
                var final_pixel = this.composite(i,j,old_pixel,new_pixel);
                this.bitmap.setPixelRGBA(i,j,final_pixel);
            }
        }
    }

    composite(i,j,old_pixel, new_pixel) {
        return new_pixel;
    }

    calculateRGBA(x,y) {
        return this._fillColor;
    }

    clearRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.bitmap.setPixelRGBA(i,j,0x00000000);
            }
        }
    }

    strokeRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            this.bitmap.setPixelRGBA(i, y, this._fillColor);
            this.bitmap.setPixelRGBA(i, y+h, this._fillColor);
        }
        for(var j=y; j<y+h; j++) {
            this.bitmap.setPixelRGBA(x, j, this._fillColor);
            this.bitmap.setPixelRGBA(x+w, j, this._fillColor);
        }
    }

    getImageData(x,y,w,h) {
        return this.bitmap;
    }

    drawImage(bitmap, x,y,w,h) {
        console.log("drawing",x,y,w,h);
    }


    static colorStringToUint32(str) {
        if(!str) return 0x000000;
        //hex values always get 255 for the alpha channel
        if(str.indexOf('#')==0) {
            var int = uint32.toUint32(parseInt(str.substring(1),16));
            int = uint32.shiftLeft(int,8);
            int = uint32.or(int,0xff);
            return int;
        }
        if(str.indexOf('rgba')==0) {
            var parts = str.trim().substring(4).replace('(','').replace(')','').split(',');
            return uint32.fromBytesBigEndian(
                parseInt(parts[0]),
                parseInt(parts[1]),
                parseInt(parts[2]),
                Math.floor(parseFloat(parts[3])*255));
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

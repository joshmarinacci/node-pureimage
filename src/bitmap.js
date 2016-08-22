"use strict";
/**
 * Created by josh on 8/21/16.
 */
var uint32 = require('./uint32');
var Context = require('./context');

class Bitmap {
    constructor(w,h,options) {
        this.width = w;
        this.height = h;
        this.data = [];
        var fillval = 0x000000FF;
        for(var j=0; j<h; j++) {
            for (var i = 0; i < w; i++) {
                this.setPixelRGBA(i, j, fillval);
            }
        }

    }
    setPixelRGBA(x,y,rgba) {
        var i = (this.width * y + x)*4;
        var bytes = uint32.getBytesBigEndian(rgba);
        this.data[i+0] = bytes[0];
        this.data[i+1] = bytes[1];
        this.data[i+2] = bytes[2];
        this.data[i+3] = bytes[3];
    }
    getContext(type) {
        return new Context(this);
    }
}
module.exports = Bitmap;



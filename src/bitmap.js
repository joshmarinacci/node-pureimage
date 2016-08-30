"use strict";
var uint32 = require('./uint32');
var Context = require('./context');

class Bitmap {
    constructor(w,h,options) {
        this.width = w;
        this.height = h;
        this.data = Buffer.alloc(w*h*4);
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
    setPixelRGBA_i(x,y,r,g,b,a) {
        var i = (this.width * y + x)*4;
        this.data[i+0] = r;
        this.data[i+1] = g;
        this.data[i+2] = b;
        this.data[i+3] = a;
    }
    getPixelRGBA(x,y) {
        var i = (this.width * y + x) * 4;
        return uint32.fromBytesBigEndian(
            this.data[i+0],
            this.data[i+1],
            this.data[i+2],
            this.data[i+3]);
    }

    getContext(type) {
        return new Context(this);
    }
}
module.exports = Bitmap;



"use strict";
var uint32 = require('./uint32');
var Context = require('./context');

class Bitmap {
    constructor(w,h,options) {
        this.width = Math.floor(w);
        this.height = Math.floor(h);
        this.data = Buffer.alloc(w*h*4);
        var fillval = 0x000000FF;
        for(var j=0; j<h; j++) {
            for (var i = 0; i < w; i++) {
                this.setPixelRGBA(i, j, fillval);
            }
        }

    }
    setPixelRGBA(x,y,rgba) {
        x = Math.floor(x);
        y = Math.floor(y);
        if(x < 0) return;
        if(y < 0) return;
        if(x >= this.width) return;
        if(y >= this.height) return;
        var i = (this.width * y + x)*4;
        var bytes = uint32.getBytesBigEndian(rgba);
        this.data[i+0] = bytes[0];
        this.data[i+1] = bytes[1];
        this.data[i+2] = bytes[2];
        this.data[i+3] = bytes[3];
    }
    setPixelRGBA_i(x,y,r,g,b,a) {
        x = Math.floor(x);
        y = Math.floor(y);
        if(x < 0) return;
        if(y < 0) return;
        if(x >= this.width) return;
        if(y >= this.height) return;
        var i = (this.width * y + x)*4;
        this.data[i+0] = r;
        this.data[i+1] = g;
        this.data[i+2] = b;
        this.data[i+3] = a;
    }
    getPixelRGBA(x,y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if(x<0) return 0;
        if(y<0) return 0;
        if(x >= this.width) return 0;
        if(y >= this.height) return 0;
        var i = (this.width * y + x) * 4;
        return uint32.fromBytesBigEndian(
            this.data[i+0],
            this.data[i+1],
            this.data[i+2],
            this.data[i+3]);
    }

    getPixelRGBA_separate(x,y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if(x<0) return 0;
        if(y<0) return 0;
        if(x >= this.width) return 0;
        if(y >= this.height) return 0;
        var i = (this.width * y + x) * 4;
        return this.data.slice(i,i+4);
    }

    getContext(type) {
        return new Context(this);
    }
}
module.exports = Bitmap;



var fs = require('fs');
var PNG = require('pngjs').PNG;

function Bitmap4BBP(w,h) {
    this.width = w;
    this.height = h;
    this._buffer = new Buffer(this.width*this.height*4);
    for(var i=0; i<this.width; i++) {
        for(var j=0; j<this.height; j++) {
            this._buffer.writeUInt32BE(0x000000FF, (j*this.width+i)*4);
        }
    }

    this.getContext = function(type) {
        return new Bitmap4BBPContext(this);
    }
}

function Bitmap4BBPContext(bitmap) {
    this._bitmap = bitmap;
    this._index = function(x,y) {
        return (this._bitmap.width * y + x)*4;
    }
    this.getPixeli32 = function(x,y) {
        console.log('reading at ',x,y);
        var int = this._bitmap._buffer.readUInt32BE(this._index(x,y));
        console.log("the int is ", int);
        return int;
    }
    //rgb are bytes (0->255), a is 0->1 (an opacity percentage)
    this.setPixelRGBA = function(x,y, r,g,b,a) {
        console.log('setting at ', this._index(x,y), ' color = ',r, g, b, a);
        this._bitmap._buffer[this._index(x,y)+0] = r;
        this._bitmap._buffer[this._index(x,y)+1] = g;
        this._bitmap._buffer[this._index(x,y)+2] = b;
        this._bitmap._buffer[this._index(x,y)+3] = Math.floor(255*a);
    }

    this.setFillStyleRGBA = function(r,g,b,a) {
        this._fillColor = r<<24 | g<<16 | b<<8 | Math.floor(255*a);
        console.log("fill color = ", this._fillColor.toString(16));
    }

    this.fillRect = function(x,y,w,h) {
        for(var j=y; j<y+h; j++) {
            for(var i=x; i<x+w; i++) {
                if(i >= this._bitmap.width) continue;
                if(j >= this._bitmap.height) continue;
                this._bitmap._buffer.writeUInt32BE(this._fillColor, this._index(i,j));
            }
        }
    }

    this.fillPixel = function(x,y) {
        this._bitmap._buffer.writeUInt32BE(this._fillColor, this._index(x,y));
    }

    this.drawImage = function(img2, x,y) {
        for(var j=0; j<img2.height; j++) {
            for(var i=0; i<img2.width; i++) {
                if(x+i >= this._bitmap.width) continue;
                if(y+j >= this._bitmap.height) continue;
                if(i > img2.width) continue;
                if(j > img2.height) continue;
                var ns = (j*img2.width + i)*4;
                var nd = this._index(i+x,j+y);
                this._bitmap._buffer.writeUInt32BE(img2._buffer.readUInt32BE(ns),nd);
            }
        }
    }

    this.beginPath = function() {
        this.path = [];
    }

    this.moveTo = function(x,y) {
        this.path.push(['m',x,y]);
    }
    this.lineTo = function(x,y) {
        this.path.push(['l',x,y]);
    }
    this.quadraticCurveTo = function(cp1x, cp1y, x, y) {
        this.path.push(['q',cp1x,cp1y,x,y]);
    }
    this.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.path.push(['b',cp1x,cp1y,cp2x,cp2y,x,y]);
    }

    this.fill = function() {
        var cx = 0;
        var cy = 0;
        var self = this;
        this.path.forEach(function(cmd){
            if(cmd[0] == 'm') {
                cx = cmd[1];
                cy = cmd[2];
            }
            if(cmd[0] == 'l') {
                fillLine(self,cx,cy,cmd[1],cmd[2]);
                cx = cmd[1];
                cy = cmd[2];
            }
            if(cmd[0] == 'q') {
                fillLine(self,cx,cy,cmd[3],cmd[4]);
                cx = cmd[3];
                cy = cmd[4];
            }
        })
    }

    //Bresenham's from Rosetta Code
    // http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
    fillLine = function(image,x0,y0, x1,y1) {
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var err = (dx>dy ? dx : -dy)/2;

        while (true) {
            image.fillPixel(x0,y0);
            if (x0 === x1 && y0 === y1) break;
            var e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
    }
}

exports.make = function(w,h) {
    return new Bitmap4BBP(w,h);
}

exports.encodePNG = function(bitmap, outstream, cb) {
    console.log("encoding");
    var png = new PNG({
        width:bitmap.width,
        height:bitmap.height,
    });

    for(var i=0; i<bitmap.width; i++) {
        for(var j=0; j<bitmap.height; j++) {
            for(var k=0; k<4; k++) {
                var n = (j*bitmap.width+i)*4 + k;
                png.data[n] = bitmap._buffer[n];
            }
        }
    }

    png.pack().pipe(outstream).on('close',function() {
        console.log("ended");
        cb();
    });
}

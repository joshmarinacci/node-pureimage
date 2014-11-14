var opentype = require('opentype.js');
var fs = require('fs');
var PNG = require('pngjs').PNG;
var trans = require('./transform');
var uint32 = require('./uint32');

var NAMED_COLORS = {
    'blue':0x0000FFff,
    'red':0xFF0000ff,
    'green':0x00FF00ff,
}
var DEFAULT_FONT_FAMILY = 'Source Sans Pro';

function p(s) {  console.log(s);  }

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
    this.transform = new trans.Transform();
    this._settings = {
        font: {
            family:'serif',
            size: 14,
        }
    }

    this._fillColor = 0xFFFFFFFF;   // the real int holding the RGBA value
    this._fillStyle_text = "black"; // the text version set by using the fillStyle setter.
    this._strokeColor = 0x000000FF;
    this._strokeStyle_text = "black";
    Object.defineProperty(this, 'fillStyle', {
        get: function() { return this._fillStyle_text; },
        set: function(val) { this.setFillStyle(val); this._fillStyle_text = val }
    });
    Object.defineProperty(this, 'strokeStyle', {
        get: function() { return this._strokeStyle_text; },
        set: function(val) { this.setStrokeStyle(val); this._strokeStyle_text = val }
    });

    this._index = function(x,y) {
        var pt = this.transform.transformPoint(x,y);
        return (this._bitmap.width * Math.floor(pt.y) + Math.floor(pt.x))*4;
    }
    this.save = function() {
        this.transform.save();
    }
    this.restore = function() {
        this.transform.restore();
    }
    this.translate = function(x,y) {
        this.transform.translate(x,y);
    }
    this.getPixeli32 = function(x,y) {
        return this._bitmap._buffer.readUInt32BE(this._index(x,y));
    }
    //rgb are bytes (0->255), a is 0->1 (an opacity percentage)
    this.setPixelRGBA = function(x,y, r,g,b,a) {
        this._bitmap._buffer[this._index(x,y)+0] = r;
        this._bitmap._buffer[this._index(x,y)+1] = g;
        this._bitmap._buffer[this._index(x,y)+2] = b;
        this._bitmap._buffer[this._index(x,y)+3] = Math.floor(255*a);
    }

    this.setFillStyleRGBA = function(r,g,b,a) {
        this._fillColor = r<<24 | g<<16 | b<<8 | Math.floor(255*a);
    }

    this.setFillStyle = function(str) {
        this._fillColor = colorStringToUint32(str);
    }
    this.setStrokeStyle = function(str) {
        this._strokeColor = colorStringToUint32(str);
    }
    function colorStringToUint32(str) {
        if(str.indexOf('#')==0) {
            var int = uint32.toUint32(parseInt(str.substring(1),16));
            int = uint32.shiftLeft(int,8);
            int = uint32.or(int,0xff);
            return int;
        }
        if(NAMED_COLORS[str]) {
            return NAMED_COLORS[str];
        }
        console.log("UNKNOWN style format",str);
        return 0xFF0000;
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
        if(x<0) return;
        if(y<0) return;
        if(x >= this._bitmap.width) return;
        if(y >= this._bitmap.height) return;
        this._bitmap._buffer.writeUInt32BE(this._fillColor, this._index(Math.floor(x),Math.floor(y)));
    }

    function intToFloatArray(int) {
        var r = uint32.getByteBigEndian(int,0);
        var g = uint32.getByteBigEndian(int,1);
        var b = uint32.getByteBigEndian(int,2);
        var a = uint32.getByteBigEndian(int,3);
        var parts = [r,g,b,a];
        return parts;
    }
    function lerp(a,b,t) {
        return a + (b-a)*t;
    }

    this.fillPixelRGBA  = function(x,y, new_int) {
        if(x<0) return;
        if(y<0) return;
        if(x >= this._bitmap.width) return;
        if(y >= this._bitmap.height) return;
        var n = this._index(Math.floor(x),Math.floor(y));
        var old_int = this._bitmap._buffer.readUInt32BE(n);
        var old_rgba = intToFloatArray(old_int);
        var new_rgba = intToFloatArray(new_int);
        var new_alpha = new_rgba[3]/255;
        //console.log("old = ", old_rgba, "new ", new_rgba, new_alpha);
        var final_rgba = [
            lerp(old_rgba[0],new_rgba[0],new_alpha),
            lerp(old_rgba[1],new_rgba[1],new_alpha),
            lerp(old_rgba[2],new_rgba[2],new_alpha),
            new_alpha*255,
        ];
        //console.log("final rgba", final_rgba);
        var final_int = uint32.fromBytesBigEndian(final_rgba[0], final_rgba[1], final_rgba[2], final_rgba[3]);
        this._bitmap._buffer.writeUInt32BE(final_int,n);
    }

    this.strokePixel = function(x,y) {
        if(x<0) return;
        if(y<0) return;
        if(x >= this._bitmap.width) return;
        if(y >= this._bitmap.height) return;
        this._bitmap._buffer.writeUInt32BE(this._strokeColor, this._index(Math.floor(x),Math.floor(y)));
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

    this.strokeRect = function(x,y,w,h) {
        this.beginPath();
        this.moveTo(x,y);
        this.lineTo(x+w,y);
        this.lineTo(x+w,y+h);
        this.lineTo(x,y+h);
        this.closePath();
        this.stroke();
    }

    this.beginPath = function() {
        this.path = [];
    }

    this.moveTo = function(x,y) {
        this.pathmtx = x;
        this.pathmty = y;
        this.path.push(['m',x,y]);
    }
    this.closePath = function() {
        this.lineTo(this.pathmtx,this.pathmty);
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

    function makePoint(x,y) {
        return {x:x, y:y};
    }
    function pathToPolygon(path) {
        var poly = [];
        path.forEach(function(cmd) {
            if(cmd[0] == 'm') poly.push(makePoint(cmd[1],cmd[2]));
            if(cmd[0] == 'l') poly.push(makePoint(cmd[1],cmd[2]));
            if(cmd[0] == 'q') poly.push(makePoint(cmd[3],cmd[4]));
        });
        return poly;
    }
    function calcMinimumBounds(poly) {
        var bounds = {
            x: 10000,
            y: 10000,
            x2: -10000,
            y2: -10000,
        }
        poly.forEach(function(pt) {
            bounds.x  = Math.min(bounds.x,pt.x);
            bounds.y  = Math.min(bounds.y,pt.y);
            bounds.x2 = Math.max(bounds.x2,pt.x);
            bounds.y2 = Math.max(bounds.y2,pt.y);
        });
        return bounds;
    }
    //adapted from http://alienryderflex.com/polygon
    function calcSortedIntersections(poly,y) {
        //console.log("intsection of ",y, 'and ', poly);
        var j = poly.length-1;
        var oddNodes = false;
        var xlist = [];
        for(var i=0; i<poly.length; i++) {
            var A = poly[i];
            var B = poly[j];
            if(A.y<y && B.y>=y || B.y<y && A.y>=y) {
                var xval = A.x + (y-A.y) / (B.y-A.y) * (B.x-A.x);
                xlist.push(xval);
            }
            j=i;
        }
        return xlist.sort(function(a,b) {  return a>b; });
    }

    function fract(v) {
        return v-Math.floor(v);
    }
    function rgbaToInt(r,g,b,a) {
        r = uint32.toUint32(r)
        g = uint32.toUint32(g);
        b = uint32.toUint32(b);
        a = uint32.toUint32(a);
        var int = uint32.shiftLeft(r,24) + uint32.shiftLeft(g,16) + uint32.shiftLeft(b,8) + a;
        return int;
    }

    this.fill = function() {
        //this.stroke();
        //get just the color part
        var rgb = uint32.and(this._fillColor,0xFFFFFF00);
        var poly = pathToPolygon(this.path);
        var bounds = calcMinimumBounds(poly);
        for(var j=bounds.y; j<=bounds.y2; j++) {
        //for(var j=bounds.y; j<=bounds.y+5; j++) {
            //console.log('drawing line', j);
            var ints = calcSortedIntersections(poly,j);
            //console.log('intersections',ints);
            //fill between each pair of intersections
            for(var i=0; i<ints.length; i+=2) {
                var fstart = ints[i];
                var fend   = ints[i+1];
                var fstartf = fract(fstart);
                var fendf   = fract(fend);
                var start = Math.floor(ints[i]);
                var end   = Math.floor(ints[i+1]);
                for(var ii=start; ii<=end; ii++) {
                    if(ii == start) {
                        //first
                        var int = uint32.or(rgb,(1-fstartf)*255);
                        this.fillPixelRGBA(ii,j, int);
                        continue;
                    }
                    if(ii == end) {
                        //last
                        var int = uint32.or(rgb,fendf*255);
                        this.fillPixelRGBA(ii,j, int);
                        continue;
                    }
                    //console.log("filling",ii,j);
                    this.fillPixel(ii,j);
                }
            }
        }
    }
    this.stroke = function() {
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
            image.strokePixel(x0,y0);
            if (x0 === x1 && y0 === y1) break;
            var e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
    }


    // ================  Fonts and Text Drawing

    this.setFont = function(family, size) {
        this._settings.font.family = family;
        if(!_fonts[family]) {
            console.log("WARNING. MISSING FONT FAMILY",family);
            this._settings.font.family = DEFAULT_FONT_FAMILY;
        }
        this._settings.font.size = size;
    }


    this.fillText = function(text, x, y) {
        var self = this;
        var ctx = self;
        var font = _fonts[self._settings.font.family];
        var path = font.font.getPath(text, x, y, self._settings.font.size);
        ctx.beginPath();
        path.commands.forEach(function(cmd) {
            switch(cmd.type) {
                case 'M': ctx.moveTo(cmd.x,cmd.y); break;
                //case 'Q': ctx.quadraticCurveTo(cmd.x,cmd.y,cmd.x1,cmd.y1); break;
                case 'Q': ctx.quadraticCurveTo(cmd.x1,cmd.y1,cmd.x,cmd.y); break;
                case 'L': ctx.lineTo(cmd.x,cmd.y); break;
                case 'Z': ctx.closePath(); ctx.fill(); ctx.beginPath(); break;
            }
        });
    }

    this.measureText = function(text) {
        var font = _fonts[this._settings.font.family];
        var fsize = this._settings.font.size;
        var glyphs = font.font.stringToGlyphs(text);
        var advance = 0;
        glyphs.forEach(function(g) {
            advance += g.advanceWidth;
        });

        return {
            width: advance/font.font.unitsPerEm*fsize,
            emHeightAscent: font.font.ascender/font.font.unitsPerEm*fsize,
            emHeightDescent: font.font.descender/font.font.unitsPerEm*fsize,
        };
    }
}

exports.make = function(w,h) {
    return new Bitmap4BBP(w,h);
}

exports.encodePNG = function(bitmap, outstream, cb) {
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


var _fonts = {

}

exports.registerFont = function(binary, family, weight, style, variant) {
    _fonts[family] = {
        binary: binary,
        family: family,
        weight: weight,
        style: style,
        variant: variant,
        loaded: false,
        font: null,
        load: function(cb) {
            if(this.loaded) {
                if(cb)cb();
                return;
            }
            console.log("loading ", binary);
            var self = this;
            opentype.load(binary, function (err, font) {
                if (err) throw new Error('Could not load font: ' + err);
                self.loaded = true;
                self.font = font;
                if(cb)cb();
            });
        }
    };
    return _fonts[family];
}

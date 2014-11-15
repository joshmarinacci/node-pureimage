// Pure Image uses existing libraries for font parsing, jpeg/png encode/decode
// and borrowed code for transform management and unsigned integer manipulation

//2014-11-14  line count: 418, 411, 407, 376, 379


var opentype = require('opentype.js');
var fs = require('fs');
var PNG = require('pngjs').PNG;
var JPEG = require('jpeg-js');
var trans = require('./transform');
var uint32 = require('./uint32');

var NAMED_COLORS = {
    'white':0xFFFFFFff, 'black':0x000000ff,  'red':0xFF0000ff,  'green':0x00FF00ff, 'blue':0x0000FFff,
}
var DEFAULT_FONT_FAMILY = 'source';

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


    // === Canvas context ===================
    this.save = function() {           this.transform.save();           }
    this.restore = function() {        this.transform.restore();        }
    this.translate = function(x,y) {   this.transform.translate(x,y);   }


    // ==========  Pixel Access =============

    this._index = function(x,y) {
        var pt = this.transform.transformPoint(x,y);
        return (this._bitmap.width * Math.floor(pt.y) + Math.floor(pt.x))*4;
    }

    this.getPixeli32 = function(x,y) {
        return this._bitmap._buffer.readUInt32BE(this._index(x,y));
    }

    // ===============  style state

    this._fillColor = 0xFFFFFFFF;   // the real int holding the RGBA value
    this._fillStyle_text = "black"; // the text version set by using the fillStyle setter.
    this._strokeColor = 0x000000FF;
    this._strokeStyle_text = "black";
    Object.defineProperty(this, 'fillStyle', {
        get: function() { return this._fillStyle_text; },
        set: function(val) {
            this._fillColor = colorStringToUint32(val);
            this._fillStyle_text = val;
        }
    });
    Object.defineProperty(this, 'strokeStyle', {
        get: function() { return this._strokeStyle_text; },
        set: function(val) {
            this._strokeColor = colorStringToUint32(val);
            this._strokeStyle_text = val;
        }
    });

    // ================= drawing commands
    //sets a pixel with proper alpha compositing
    this.compositePixel  = function(x,y, new_int) {
        if(x<0) return;
        if(y<0) return;
        if(x >= this._bitmap.width) return;
        if(y >= this._bitmap.height) return;
        var n = this._index(Math.floor(x),Math.floor(y));
        var old_int = this._bitmap._buffer.readUInt32BE(n);
        var final_int = exports.compositePixel(new_int,old_int);
        this._bitmap._buffer.writeUInt32BE(final_int,n);
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
                        this.compositePixel(ii,j, int);
                        continue;
                    }
                    if(ii == end) {
                        //last
                        var int = uint32.or(rgb,fendf*255);
                        this.compositePixel(ii,j, int);
                        continue;
                    }
                    //console.log("filling",ii,j);
                    this.compositePixel(ii,j, this._fillColor);
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
                drawLine(self,cx,cy,cmd[1],cmd[2], self._strokeColor);
                cx = cmd[1];
                cy = cmd[2];
            }
            if(cmd[0] == 'q') {
                drawLine(self,cx,cy,cmd[3],cmd[4], self._strokeColor);
                cx = cmd[3];
                cy = cmd[4];
            }
        })
    }

    function makeRectPath(ctx,x,y,w,h) {
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x+w,y);
        ctx.lineTo(x+w,y+h);
        ctx.lineTo(x,y+h);
        ctx.closePath();
    }

    this.fillRect = function(x,y,w,h) {    makeRectPath(this,x,y,w,h);   this.fill();    }

    this.strokeRect = function(x,y,w,h) {  makeRectPath(this,x,y,w,h);   this.stroke();  }



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
        var ctx = this;
        var font = _fonts[this._settings.font.family];
        var path = font.font.getPath(text, x, y, this._settings.font.size);
        ctx.beginPath();
        path.commands.forEach(function(cmd) {
            switch(cmd.type) {
                case 'M': ctx.moveTo(cmd.x,cmd.y); break;
                case 'Q': ctx.quadraticCurveTo(cmd.x1,cmd.y1,cmd.x,cmd.y); break;
                case 'L': ctx.lineTo(cmd.x,cmd.y); break;
                case 'Z': ctx.closePath(); ctx.fill(); ctx.beginPath(); break;
            }
        });
    }

    this.measureText = function(text) {
        var font = _fonts[this._settings.font.family];
        if(!font) console.log("WARNING. Can't find font family ", this._settings.font.family);
        var fsize = this._settings.font.size;
        var glyphs = font.font.stringToGlyphs(text);
        var advance = 0;
        glyphs.forEach(function(g) { advance += g.advanceWidth; });

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

    png.pack().pipe(outstream).on('close', cb);
}

exports.encodeJPEG = function(bitmap, outstream, cb) {
    var data = {
        data:bitmap._buffer,
        width:bitmap.width,
        height:bitmap.height,
    }
    outstream.write(JPEG.encode(data, 50).data);
    if(cb)cb();
}


var _fonts = { }

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



// =============== Utility functions

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

function intToFloatArray(int) {
    var r = uint32.getByteBigEndian(int,0);
    var g = uint32.getByteBigEndian(int,1);
    var b = uint32.getByteBigEndian(int,2);
    var a = uint32.getByteBigEndian(int,3);
    var parts = [r,g,b,a];
    return parts;
}

function makePoint(x,y) {
    return {x:x, y:y};
}

function calcQuadraticAtT(p, t) {
    var x = (1 - t) * (1 - t) * p[0].x + 2 * (1 - t) * t * p[1].x + t * t * p[2].x;
    var y = (1 - t) * (1 - t) * p[0].y + 2 * (1 - t) * t * p[1].y + t * t * p[2].y;
    return {x:x,y:y};
}

function pathToPolygon(path) {
    var poly = [];
    var last = null;
    path.forEach(function(cmd) {
        if(cmd[0] == 'm') {
            last = makePoint(cmd[1],cmd[2]);
            poly.push(last);
        }


        if(cmd[0] == 'l') {
            last = makePoint(cmd[1],cmd[2]);
            poly.push(last);
        }
        if(cmd[0] == 'q') {
            var pts = [];
            pts.push(last);
            pts.push(makePoint(cmd[1],cmd[2]));
            pts.push(makePoint(cmd[3],cmd[4]));

            poly.push(calcQuadraticAtT(pts,0.33));
            poly.push(calcQuadraticAtT(pts,0.66));
            poly.push(calcQuadraticAtT(pts,1.0));
            last = pts[2];
        }
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


//Bresenham's from Rosetta Code
// http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
drawLine = function(image,x0,y0, x1,y1, color) {
    x0 = Math.floor(x0);
    y0 = Math.floor(y0);
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var err = (dx>dy ? dx : -dy)/2;

    while (true) {
        image.compositePixel(x0,y0,color);
        if (x0 === x1 && y0 === y1) break;
        var e2 = err;
        if (e2 > -dx) { err -= dy; x0 += sx; }
        if (e2 < dy) { err += dx; y0 += sy; }
    }
}

function lerp(a,b,t) {
    return a + (b-a)*t;
}

exports.compositePixel  = function(src,dst) {
    var src_rgba = intToFloatArray(src);
    var dst_rgba = intToFloatArray(dst);
    var src_alpha = src_rgba[3]/255;
    var dst_alpha = dst_rgba[3]/255;

    var final_rgba = [
        lerp(dst_rgba[0],src_rgba[0],src_alpha),
        lerp(dst_rgba[1],src_rgba[1],src_alpha),
        lerp(dst_rgba[2],src_rgba[2],src_alpha),
        dst_rgba[3],
    ];
    return uint32.fromBytesBigEndian(final_rgba[0], final_rgba[1], final_rgba[2], final_rgba[3]);
}

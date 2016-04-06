// Pure Image uses existing libraries for font parsing, jpeg/png encode/decode
// and borrowed code for transform management and unsigned integer manipulation

//2014-11-14  line count: 418, 411, 407, 376, 379, 367
//2014-11-15  line count: 401, 399, 386, 369, 349,


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

function Bitmap4BBP(w,h,options) {
    this.width = w;
    this.height = h;
    var fillval = 0x000000FF;
    if(options && (typeof options.fillval) !== undefined) {
        fillval = options.fillval;
    }
    this._buffer = new Buffer(this.width*this.height*4);
    for(var i=0; i<this.width; i++) {
        for(var j=0; j<this.height; j++) {
            this._buffer.writeUInt32BE(fillval, (j*this.width+i)*4);
        }
    }
    this._index = function(x,y) {
        return (this.width * Math.floor(y) + Math.floor(x))*4;
    }

    this.getContext = function(type) {
        return new Bitmap4BBPContext(this);
    }
}

function Bitmap4BBPContext(bitmap) {
    //we get more than a factor 2x speedup by using caching
    this.USE_FONT_GLYPH_CACHING = true;

    this._bitmap = bitmap;
    this.transform = new trans.Transform();
    this.mode = "OVER";
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
    this.setPixeli32 = function(x,y, int) {
        return this._bitmap._buffer.writeUInt32BE(int,this._index(x,y));
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
        var final_int = exports.compositePixel(new_int,old_int,this.mode);
        this._bitmap._buffer.writeUInt32BE(final_int,n);
    }

    this.drawImage2 = function(img2,
        sx,sy,sw,sh,
        dx,dy,dw,dh) {
        //console.log('draw image2 invoked',sx,sy,sw,sh, dx,dy,dw,dh);
        //console.log("this image = ", this._bitmap.width, this._bitmap.height);
        var i2w = img2.width;
        var i2h = img2.height;
        var i1w = this._bitmap.width;
        var i1h = this._bitmap.height;
        for(var j=0; j<sh; j++) {
            for(var i=0; i<sw; i++) {
                var ns = ((sy+j)*i2w + (sx+i))*4;
                var nd = ((dy+j)*i1w + (dx+i))*4;
                var oval = this._bitmap._buffer.readUInt32BE(nd);
                var nval = img2._buffer.readUInt32BE(ns);
                var fval = exports.compositePixel(nval,oval, this.mode);
                this._bitmap._buffer.writeUInt32BE(fval,nd);
            }
        }

    }
    this.drawImage = function(img2, fx,fy) {
        var x = Math.floor(fx);
        var y = Math.floor(fy);
        var i2w = img2.width;
        var i2h = img2.height;
        var i1w = this._bitmap.width;
        var i1h = this._bitmap.height;
        for(var j=0; j<i2h; j++) {
            for(var i=0; i<i2w; i++) {
                if(x+i >= i1w) continue;
                if(x+i < 0) continue;
                if(y+j >= i1h) continue;
                if(y+j < 0) continue;
                if(i > i2w) continue;
                if(j > i2h) continue;
                var ns = (j*i2w + i)*4;
                var nd = ((j+y)*i1w + (x+i))*4;
                var oval = this._bitmap._buffer.readUInt32BE(nd);
                var nval = img2._buffer.readUInt32BE(ns);
                var fval = exports.compositePixel(nval,oval, this.mode);
                this._bitmap._buffer.writeUInt32BE(fval,nd);
            }
        }
    }


    this.beginPath = function() {
        this.path = [];
    }

    this.moveTo = function(x,y) {
        this.pathstart = makePoint(x,y);
        this.path.push(['m',x,y]);
    }
    this.closePath = function() {
        this.lineTo(this.pathstart.x,this.pathstart.y);
    }
    this.lineTo = function(x,y) {
        this.path.push(['l',x,y]);
    }
    this.quadraticCurveTo = function(cp1x, cp1y, x, y) {
        this.path.push(['q', cp1x, cp1y, x, y]);
    }
    this.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.path.push(['b', cp1x, cp1y, cp2x, cp2y, x, y]);
    }
    this.arc = function(x,y, rad, start, end, clockwise) {
        function addCirclePoint(ctx,type,a) {
            ctx.path.push([type,x+Math.sin(a)*rad,y+Math.cos(a)*rad]);
        }
        addCirclePoint(this,'m',start);
        for(var a=start; a<=end; a+=Math.PI/16)  addCirclePoint(this,'l',a);
        addCirclePoint(this,'l',end);
    }

    this.fill = function() {
        //get just the color part
        var rgb = uint32.and(this._fillColor,0xFFFFFF00);
        var lines = pathToLines(this.path);
        var bounds = calcMinimumBounds(lines);

        for(var j=bounds.y2-1; j>=bounds.y; j--) {
            var ints = calcSortedIntersections(lines,j);
            //fill between each pair of intersections
            for(var i=0; i<ints.length; i+=2) {
                var fstartf = fract(ints[i]);
                var fendf   = fract(ints[i+1]);
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
        var lines = pathToLines(this.path);
        var ctx = this;
        lines.forEach(function(line){
            drawLine(ctx, line, ctx._strokeColor);
        });
    }

    function makeRectPath(ctx,x,y,w,h) {
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x+w,y);
        ctx.lineTo(x+w,y+h);
        ctx.lineTo(x,y+h);
        ctx.closePath();
    }

    this.fillRect   = function(x,y,w,h) {  makeRectPath(this,x,y,w,h);   this.fill();    }

    this.strokeRect = function(x,y,w,h) {  makeRectPath(this,x,y,w,h);   this.stroke();  }

    this.clearRect  = function(x,y,w,h) {
      for(var i=x; i<x+w; i++) {
        for(var j=y; j<y+h; j++) {
          this.setPixeli32(i,j,0x00000000);
        }
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


    function renderGlyphToBitmap(font, ch, size) {
        var ysize = (font.font.ascender - font.font.descender)/font.font.unitsPerEm*size;
        var glyph = font.font.charToGlyph(ch);
        var ysize = (glyph.yMax-glyph.yMin)/font.font.unitsPerEm*size;
        var xsize = (glyph.xMax-glyph.xMin)/font.font.unitsPerEm*size + 3;

        var path = font.font.getPath(ch, 0, glyph.yMax/font.font.unitsPerEm*size, size);
        var bitmap = exports.make(
                Math.ceil(xsize),
                Math.ceil(ysize), { fillval: uint32.toUint32(0x00000000) });
        var ctx = bitmap.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.mode = "REPLACE";

        ctx.beginPath();
        var fill = true;
        path.commands.forEach(function(cmd) {
            switch(cmd.type) {
                case 'M': ctx.moveTo(cmd.x,cmd.y); break;
                case 'Q': ctx.quadraticCurveTo(cmd.x1,cmd.y1,cmd.x,cmd.y); break;
                case 'L': ctx.lineTo(cmd.x,cmd.y); break;
                case 'Z': ctx.closePath(); fill?ctx.fill():ctx.stroke(); ctx.beginPath(); break;
            }
        });
        ctx.mode = "OVER";
        return {
            path: path,
            bitmap: bitmap,
            glyph: glyph,
            advance: glyph.advanceWidth/font.font.unitsPerEm*size,
            ascent: glyph.yMax/font.font.unitsPerEm*size,
            descent: glyph.yMin/font.font.unitsPerEm*size,
        }
    }

    this.copyImage = function(img2, fx,fy, color) {
        var crgb = uint32.getBytesBigEndian(color);
        var x = Math.floor(fx);
        var y = Math.floor(fy);
        var i2w = img2.width;
        var i2h = img2.height;
        var i1w = this._bitmap.width;
        var i1h = this._bitmap.height;
        for(var j=0; j<i2h; j++) {
            for(var i=0; i<i2w; i++) {
                if(x+i >= i1w) continue;
                if(x+i < 0) continue;
                if(y+j >= i1h) continue;
                if(y+j < 0) continue;
                var ns = (j*i2w + i)*4;
                var alpha = img2._buffer[ns+3];
                //skip fully transparent pixels
                if(alpha == 0) continue;

                var nd = ((j+y)*i1w + (x+i))*4;
                var oval = this._bitmap._buffer.readUInt32BE(nd);
                var nval2 = uint32.fromBytesBigEndian(crgb[0],crgb[1],crgb[2],alpha);
                var fval = exports.compositePixel(nval2,oval, this.mode);
                this._bitmap._buffer.writeUInt32BE(fval,nd);
            }
        }
    }

    function processTextPath(ctx,text,x,y, fill) {
        var font = _fonts[ctx._settings.font.family];
        var size = ctx._settings.font.size;
        if(ctx.USE_FONT_GLYPH_CACHING) {
            var off = 0;
            for(var i=0; i<text.length; i++) {
                var ch = text[i];
                if(!cache.contains(font,size,ch)) {
                    var glyph = renderGlyphToBitmap(font,ch,size);
                    cache.insert(font,size,ch,glyph);
                }
                var glyph = cache.get(font,size,ch);
                var fx = x+off;
                var fy = y-glyph.ascent;
                var fpt = ctx.transform.transformPoint(fx,fy);
                ctx.copyImage(glyph.bitmap, Math.floor(fpt.x), Math.floor(fpt.y), ctx._fillColor);
                off += glyph.advance;
            }
        } else {
            var path = font.font.getPath(text, x, y, ctx._settings.font.size);
            ctx.beginPath();
            path.commands.forEach(function(cmd) {
                switch(cmd.type) {
                    case 'M': ctx.moveTo(cmd.x,cmd.y); break;
                    case 'Q': ctx.quadraticCurveTo(cmd.x1,cmd.y1,cmd.x,cmd.y); break;
                    case 'L': ctx.lineTo(cmd.x,cmd.y); break;
                    case 'Z': ctx.closePath(); fill?ctx.fill():ctx.stroke(); ctx.beginPath(); break;
                }
            });
        }
    }
    this.fillText   = function(text, x, y) {  processTextPath(this, text, x,y, true);  }
    this.strokeText = function(text, x, y) {  processTextPath(this, text, x,y, false); }

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

    this.getImageData = function(x, y, widh, height) {
      return {
        data: new Uint8Array(this._bitmap._buffer)
      };
    };
}

exports.make = function(w,h,options) {
    return new Bitmap4BBP(w,h,options);
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

    png.pack().pipe(outstream).on('finish', cb);
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

//TODO: Josh: finish this. turn it into a real bitmap object
exports.decodeJPEG = function(data) {
    var rawImageData = JPEG.decode(data);
    console.log("Raw = ", rawImageData);
    return rawImageData;
}

exports.decodePNG = function(instream, cb) {
    instream.pipe(new PNG())
    .on("parsed", function() {
        var bitmap =  new Bitmap4BBP(this.width,this.height);
        for(var i=0; i<bitmap._buffer.length; i++) {
            bitmap._buffer[i] = this.data[i];
        };
        if(cb) cb(bitmap);
    });
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
            console.log("PureImage loading", family,weight,style,variant);
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
exports.debug_list_of_fonts = _fonts;



// =============== Utility functions

function colorStringToUint32(str) {
    if(!str) return 0x000000;
    //hex values always get 255 for the alpha channel
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

function makePoint (x,y)       {  return {x:x, y:y} }
function makeLine  (start,end) {  return {start:start, end:end} }
function fract(v) {  return v-Math.floor(v);   }
function lerp(a,b,t) {  return a + (b-a)*t; }

function calcQuadraticAtT(p, t) {
    var x = (1-t)*(1-t)*p[0].x + 2*(1-t)*t*p[1].x + t*t*p[2].x;
    var y = (1-t)*(1-t)*p[0].y + 2*(1-t)*t*p[1].y + t*t*p[2].y;
    return {x:x,y:y};
}

function calcBezierAtT(p, t) {
    var x = (1-t)*(1-t)*(1-t)*p[0].x + 3*(1-t)*(1-t)*t*p[1].x + 3*(1-t)*t*t*p[2].x + t*t*t*p[3].x;
    var y = (1-t)*(1-t)*(1-t)*p[0].y + 3*(1-t)*(1-t)*t*p[1].y + 3*(1-t)*t*t*p[2].y + t*t*t*p[3].y;
    return {x:x,y:y};
}

function pathToLines(path) {
    var lines = [];
    var curr = null;
    path.forEach(function(cmd) {
        if(cmd[0] == 'm') {
            curr = makePoint(cmd[1],cmd[2]);
        }
        if(cmd[0] == 'l') {
            var pt = makePoint(cmd[1],cmd[2]);
            lines.push(makeLine(curr,pt));
            curr = pt;
        }
        if(cmd[0] == 'q') {
            var pts = [curr, makePoint(cmd[1],cmd[2]), makePoint(cmd[3],cmd[4])];
            for(var t=0; t<1; t+=0.1) {
                var pt = calcQuadraticAtT(pts,t);
                lines.push(makeLine(curr,pt));
                curr = pt;
            }
        }
        if(cmd[0] == 'b') {
            var pts = [curr, makePoint(cmd[1],cmd[2]), makePoint(cmd[3],cmd[4]), makePoint(cmd[5],cmd[6])];
            for(var t=0; t<1; t+=0.1) {
                var pt = calcBezierAtT(pts,t);
                lines.push(makeLine(curr,pt));
                curr = pt;
            }
        }
    });
    return lines;
}


function calcMinimumBounds(lines) {
    var bounds = {  x:  Number.MAX_VALUE, y:  Number.MAX_VALUE,  x2: Number.MIN_VALUE, y2: Number.MIN_VALUE }
    function checkPoint(pt) {
        bounds.x  = Math.min(bounds.x,pt.x);
        bounds.y  = Math.min(bounds.y,pt.y);
        bounds.x2 = Math.max(bounds.x2,pt.x);
        bounds.y2 = Math.max(bounds.y2,pt.y);
    }
    lines.forEach(function(line) {
        checkPoint(line.start);
        checkPoint(line.end);
    })
    return bounds;
}

//adapted from http://alienryderflex.com/polygon
function calcSortedIntersections(lines,y) {
    var xlist = [];
    for(var i=0; i<lines.length; i++) {
        var A = lines[i].start;
        var B = lines[i].end;
        if(A.y<y && B.y>=y || B.y<y && A.y>=y) {
            var xval = A.x + (y-A.y) / (B.y-A.y) * (B.x-A.x);
            xlist.push(xval);
        }
    }
    return xlist.sort(function(a,b) {  return a>b; });
}



//Bresenham's from Rosetta Code
// http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
drawLine = function(image, line, color) {
    var x0 = Math.floor(line.start.x);
    var y0 = Math.floor(line.start.y);
    var x1 = Math.floor(line.end.x);
    var y1 = Math.floor(line.end.y);
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


//composite pixel doubles the time. need to implement replace with a better thing
exports.compositePixel  = function(src,dst,omode) {
    if(omode == 'REPLACE') {
        return src;
    }
    var src_rgba = uint32.getBytesBigEndian(src);
    var dst_rgba = uint32.getBytesBigEndian(dst);

    var src_alpha = src_rgba[3]/255;
    var dst_alpha = dst_rgba[3]/255;
    var final_a = dst_rgba[3];

    var final_rgba = [
        lerp(dst_rgba[0],src_rgba[0],src_alpha),
        lerp(dst_rgba[1],src_rgba[1],src_alpha),
        lerp(dst_rgba[2],src_rgba[2],src_alpha),
        final_a,
    ];
    return uint32.fromBytesBigEndian(final_rgba[0], final_rgba[1], final_rgba[2], final_rgba[3]);
}


var cache = {
    glyphs:{},
    makeKey: function(font,size,ch) {
        var key = font.family + "_"+size+ "_"+ch;
        return key;
    },
    contains: function(font, size, ch) {
        return (typeof this.glyphs[this.makeKey(font,size,ch)]) !== 'undefined';
    },
    insert: function(font, size, ch,bitmap) {
        this.glyphs[this.makeKey(font,size,ch)] = bitmap;
    },
    get: function(font, size, ch) {
        return this.glyphs[this.makeKey(font,size,ch)];
    }
}

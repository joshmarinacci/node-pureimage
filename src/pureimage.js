var opentype = require('opentype.js');
var fs = require('fs');
var PNG = require('pngjs').PNG;

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
    this._settings = {
        font: {
            family:'serif',
            size: 14,
        }
    }

    this._index = function(x,y) {
        return (this._bitmap.width * y + x)*4;
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



    this.fill = function() {
        //this.stroke();
        var poly = pathToPolygon(this.path);
        var bounds = calcMinimumBounds(poly);
        for(var j=bounds.y; j<=bounds.y2; j++) {
        //for(var j=bounds.y; j<=bounds.y+5; j++) {
            //console.log('drawing line', j);
            var ints = calcSortedIntersections(poly,j);
            //console.log('intersections',ints);
            //fill between each pair of intersections
            for(var i=0; i<ints.length; i+=2) {
                //console.log("segment on ", j);
                var start = Math.floor(ints[i]);
                var end   = Math.floor(ints[i+1]);
                //console.log('drawing',start,end);
                for(var ii=start; ii<=end; ii++) {
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
            image.fillPixel(x0,y0);
            if (x0 === x1 && y0 === y1) break;
            var e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
    }


    // ================  Fonts and Text Drawing

    this.setFont = function(family, size) {
        this._settings.font.family = family;
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
        var yMin = 0;
        var yMax = 0;
        glyphs.forEach(function(g) {
            advance += g.advanceWidth;
            yMin = Math.min(g.yMin,yMin);
            yMax = Math.max(g.yMax,yMax);
        });

        return {
            width: advance/font.font.unitsPerEm*fsize,
            emHeightAscent:yMax/font.font.unitsPerEm*fsize,
            emHeightDescent:yMin/font.font.unitsPerEm*fsize,
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

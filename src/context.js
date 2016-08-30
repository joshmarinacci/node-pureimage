"use strict";
var uint32 = require('./uint32');
var NAMED_COLORS = require('./named_colors');

class Context {
    constructor(bitmap) {
        this.bitmap = bitmap;
        this._fillColor = 0x000000FF;
        this._strokeColor = 0x000000FF;
        Object.defineProperty(this, 'fillStyle', {
            get: function() { return this._fillStyle_text; },
            set: function(val) {
                this._fillColor = Context.colorStringToUint32(val);
                this._fillStyle_text = val;
            }
        });
    }

    fillRect(x,y,w,h) {
        x = Math.floor(x);
        y = Math.floor(y);
        w = Math.floor(w);
        h = Math.floor(h);
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.fillPixel(i,j);
            }
        }
    }

    fillPixel(i,j) {
        i = Math.floor(i);
        j = Math.floor(j);
        var new_pixel = this.calculateRGBA(i,j);
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }
    strokePixel(i,j) {
        var new_pixel = this.calculateRGBA_stroke(i,j);
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }

    composite(i,j,old_pixel, new_pixel) {
        return new_pixel;
    }

    calculateRGBA(x,y) {
        return this._fillColor;
    }
    calculateRGBA_stroke(x,y) {
        return this._strokeColor;
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
        console.log("pretending to do something");
        return this.bitmap;
    }
    putImageData(id, x, y) {
        console.log("pretending to do something");
    }

    drawImage(bitmap, sx,sy,sw,sh, dx, dy, dw, dh) {
        for(var i=dx; i<dx+dw; i++) {
            for(var j=dy; j<dy+dh; j++) {
                var tx = (i-dx)/(dx+dw);
                var ssx = Math.floor(tx * bitmap.width);
                var ty = (j-dy)/(dy+dh);
                var ssy = Math.floor(ty * bitmap.height);
                var rgba = bitmap.getPixelRGBA(ssx,ssy);
                this.bitmap.setPixelRGBA(i, j, rgba);
            }
        }
    }

    beginPath() {
        this.path = [];
    }
    moveTo(x,y) {
        this.pathstart = makePoint(x,y);
        this.path.push(['m',x,y]);
    }
    lineTo(x,y) {
        this.path.push(['l',x,y]);
    }
    closePath() {
        this.lineTo(this.pathstart.x,this.pathstart.y);
    }

    stroke() {
        pathToLines(this.path).forEach((line)=> this.drawLine(line));
    }
    drawLine(line) {
        //Bresenham's from Rosetta Code
        // http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
        var x0 = Math.floor(line.start.x);
        var y0 = Math.floor(line.start.y);
        var x1 = Math.floor(line.end.x);
        var y1 = Math.floor(line.end.y);
        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var err = (dx>dy ? dx : -dy)/2;

        while (true) {
            this.strokePixel(x0,y0);
            if (x0 === x1 && y0 === y1) break;
            var e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
    }

    fill() {
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
                        //var int = uint32.or(rgb,(1-fstartf)*255);
                        //this.compositePixel(ii,j, int);
                        this.fillPixel(ii,j);
                        continue;
                    }
                    if(ii == end) {
                        //last
                        //var int = uint32.or(rgb,fendf*255);
                        //this.compositePixel(ii,j, int);
                        this.fillPixel(ii,j);
                        continue;
                    }
                    //console.log("filling",ii,j);
                    //this.compositePixel(ii,j, this._fillColor);
                    this.fillPixel(ii,j);
                }
            }
        }
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


function fract(v) {  return v-Math.floor(v);   }

function makePoint (x,y)       {  return {x:x, y:y} }

function makeLine  (start,end) {  return {start:start, end:end} }


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




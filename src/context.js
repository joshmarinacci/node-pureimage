"use strict";
var uint32 = require('./uint32');
var NAMED_COLORS = require('./named_colors');
var trans = require('./transform');
var TEXT = require('./text');

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

        this._strokeColor = 0x000000FF;
        Object.defineProperty(this, 'strokeStyle', {
            get: function() { return this._strokeStyle_text; },
            set: function(val) {
                this._strokeColor = Context.colorStringToUint32(val);
                this._strokeStyle_text = val;
            }
        });

        this._lineWidth = 1;
        Object.defineProperty(this, 'lineWidth', {
            get: function() { return this._lineWidth; },
            set: function(val) {
                this._lineWidth = val;
            }
        });

        this._globalAlpha = 1;
        Object.defineProperty(this, 'globalAlpha', {
            get: function() { return this._globalAlpha; },
            set: function(val) {
                this._globalAlpha = clamp(val,0,1);
            }
        });

        this.transform = new trans.Transform();
        this._font = {
            family:'invalid',
            size:12
        };
        Object.defineProperty(this,'font', {
            get: function() {

            },
            set: function(val) {
                val = val.trim();
                var n = val.indexOf(' ');
                var size = parseInt(val.slice(0,n));
                var name = val.slice(n);
                this._font.family = name;
                this._font.size = size;
            }
        });

        this.imageSmoothingEnabled = true;
        this._clip = null;
    }

    // transforms and state saving
    save() {
        this.transform.save();
    }
    translate(x,y) {
        this.transform.translate(x,y);
    }
    rotate(angle) {
        this.transform.rotate(angle);
    }
    scale(sx,sy) {
        this.transform.scale(sx,sy);
    }
    restore() {
        this.transform.restore();
    }


    //simple rect
    fillRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.fillPixel(i,j);
            }
        }
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
            this.bitmap.setPixelRGBA(i, y, this._strokeColor);
            this.bitmap.setPixelRGBA(i, y+h, this._strokeColor);
        }
        for(var j=y; j<y+h; j++) {
            this.bitmap.setPixelRGBA(x, j, this._strokeColor);
            this.bitmap.setPixelRGBA(x+w, j, this._strokeColor);
        }
    }


    //set single pixel
    fillPixel(i,j) {
        if(!this.pixelInsideClip(i,j)) return;
        var new_pixel = this.calculateRGBA(i,j);
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }
    strokePixel(i,j) {
        if(!this.pixelInsideClip(i,j)) return;
        var new_pixel = this.calculateRGBA_stroke(i,j);
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }
    fillPixelWithColor(i,j,col) {
        if(!this.pixelInsideClip(i,j)) return;
        var new_pixel = col;
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }

    composite(i,j,old_pixel, new_pixel) {
        const old_rgba = uint32.getBytesBigEndian(old_pixel);
        const new_rgba = uint32.getBytesBigEndian(new_pixel);

        //convert to range of 0->1
        const A = new_rgba.map((b)=>b/255);
        const B = old_rgba.map((b)=>b/255);
        //multiply by global alpha
        A[3] = A[3]*this._globalAlpha;

        //do a standard composite (SRC_OVER)
        function compit(ca,cb,aa,ab) {
            return (ca*aa + cb*ab * (1-aa)) / (aa+ab*(1-aa));
        }
        const C = A.map((comp,i)=> compit(A[i],B[i],A[3],B[3]));

        //convert back to 0->255 range
        const Cf = C.map((c)=>c*255);
        //convert back to int
        return uint32.fromBytesBigEndian(Cf[0],Cf[1],Cf[2],Cf[3]);
    }
    calculateRGBA(x,y) {
        return this._fillColor;
    }
    calculateRGBA_stroke(x,y) {
        return this._strokeColor;
    }


    //get set image data
    getImageData(x,y,w,h) {
        // console.log("pretending to do something");
        return this.bitmap;
    }
    putImageData(id, x, y) {
        // console.log("pretending to do something");
    }


    drawImage(bitmap, sx,sy,sw,sh, dx, dy, dw, dh) {
        for(var i=0; i<dw; i++) {
            var tx = i/dw;
            var ssx = Math.floor(tx*sw)+sx;
            for(var j=0; j<dh; j++) {
                var ty = j/dh;
                var ssy = sy+Math.floor(ty * sh);
                var rgba = bitmap.getPixelRGBA(ssx,ssy);
                this.bitmap.setPixelRGBA(dx+i, dy+j, rgba);
            }
        }
    }


    // paths
    beginPath() {
        this.path = [];
    }
    moveTo(x,y) {
        return this._moveTo({x:x,y:y});
    }
    _moveTo(pt) {
        pt = this.transform.transformPoint(pt);
        this.pathstart = pt;
        this.path.push(['m',pt]);
    }
    lineTo(x,y) {
        return this._lineTo({x:x, y:y});
    }
    _lineTo(pt) {
        this.path.push(['l',this.transform.transformPoint(pt)]);
    }
    quadraticCurveTo(cp1x, cp1y, x,y) {
        let cp1 = this.transform.transformPoint({x:cp1x, y:cp1y});
        let pt = this.transform.transformPoint({x:x, y:y});
        this.path.push(['q', cp1, pt]);
    }
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._bezierCurveTo({x:cp1x,y:cp1y},{x:cp2x,y:cp2y}, {x:x,y:y});
    }
    _bezierCurveTo(cp1, cp2, pt) {
        cp1 = this.transform.transformPoint(cp1);
        cp2 = this.transform.transformPoint(cp2);
        pt  = this.transform.transformPoint(pt);
        this.path.push(['b', cp1, cp2, pt]);
    }

    arc(x,y, rad, start, end, clockwise) {
        function calcPoint(ctx,type,angle) {
            let px = x + Math.sin(angle)*rad;
            let py = y + Math.cos(angle)*rad;
            return {x:px,y:py};
        }
        this._moveTo(calcPoint(this,'m',start));
        for(var a=start; a<=end; a+=Math.PI/16)  {
            this._lineTo(calcPoint(this,'l',a));
        }
        this._lineTo(calcPoint(this,'l',end));
    }
    arcTo() {
        throw new Error("arcTo not yet supported");
    }
    rect() {
        throw new Error("rect not yet supported");
    }
    ellipse() {
        throw new Error("ellipse not yet supported");
    }
    clip() {
        this._clip = pathToLines(this.path);
    }
    measureText() {
        throw new Error("measureText not yet supported");
    }

    closePath() {
        this.path.push(['l',this.pathstart]);
    }


    //stroke and fill paths
    stroke() {
        pathToLines(this.path).forEach((line)=> this.drawLine(line));
    }
    drawLine(line) {
        this.imageSmoothingEnabled?this.drawLine_aa(line):this.drawLine_noaa(line)
    }
    drawLine_noaa(line) {
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
    // antialiased Bresenham's line with width
    // http://members.chello.at/~easyfilter/bresenham.html
    drawLine_aa(line) {
        let width = this._lineWidth;
        let x0 = Math.floor(line.start.x);
        let y0 = Math.floor(line.start.y);
        let x1 = Math.floor(line.end.x);
        let y1 = Math.floor(line.end.y);
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;

        let err = dx - dy, e2, x2, y2;
        let ed = dx + dy === 0 ? 1 : Math.sqrt(dx * dx + dy * dy);
        let rgb = uint32.and(this._strokeColor, 0xFFFFFF00);
        for (width = (width+1)/2; ; ) {
            let alpha = ~~Math.max(0, 255 * (Math.abs(err - dx + dy) / ed - width + 1));
            var pixelColor = uint32.or(rgb,255-alpha);
            this.fillPixelWithColor(x0,y0,pixelColor);
            e2 = err; x2 = x0;
            if (2*e2 >= -dx) {
                for (e2 += dy, y2 = y0; e2 < ed*width && (y1 !== y2 || dx > dy); e2 += dx) {
                    alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
                    var pixelColor = uint32.or(rgb,255-alpha);
                    this.fillPixelWithColor(x0, y2 += sy, pixelColor);
                }
                if (x0 === x1) break;
                e2 = err; err -= dy; x0 += sx;
            }
            if (2*e2 <= dy) {
                for (e2 = dx-e2; e2 < ed*width && (x1 !== x2 || dx < dy); e2 += dy) {
                    alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
                    var pixelColor = uint32.or(rgb,255-alpha);
                    this.fillPixelWithColor(x2 += sx, y0, pixelColor);
                }
                if (y0 === y1) break;
                err += dx; y0 += sy;
            }
        }
    }

    fill() {
        this.imageSmoothingEnabled ? this.fill_aa() : this.fill_noaa();
    }
    fill_aa() {
        //get just the color part
        var rgb = uint32.and(this._fillColor,0xFFFFFF00);
        var lines = pathToLines(this.path);
        var bounds = calcMinimumBounds(lines);

        var startY = Math.min(bounds.y2-1, this.bitmap.height);
        var endY = Math.max(bounds.y, 0);

        for(var j=startY; j>=endY; j--) {
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
                        this.fillPixelWithColor(ii,j, int);
                        continue;
                    }
                    if(ii == end) {
                        //last
                        var int = uint32.or(rgb,fendf*255);
                        this.fillPixelWithColor(ii,j, int);
                        continue;
                    }
                    //console.log("filling",ii,j);
                    this.fillPixelWithColor(ii,j, this._fillColor);
                }
            }
        }
    }
    fill_noaa() {
        //get just the color part
        var rgb = uint32.and(this._fillColor, 0xFFFFFF00);
        var lines = pathToLines(this.path);
        var bounds = calcMinimumBounds(lines);
        for(var j=bounds.y2-1; j>=bounds.y; j--) {
            var ints = calcSortedIntersections(lines,j);
            //fill between each pair of intersections
            for(var i=0; i<ints.length; i+=2) {
                var start = Math.floor(ints[i]);
                var end   = Math.floor(ints[i+1]);
                for(var ii=start; ii<=end; ii++) {
                    if(ii == start) {
                        //first
                        this.fillPixel(ii,j);
                        continue;
                    }
                    if(ii == end) {
                        //last
                        this.fillPixel(ii,j);
                        continue;
                    }
                    this.fillPixel(ii,j);
                }
            }
        }
    }

    //even/odd rule. https://en.wikipedia.org/wiki/Point_in_polygon
    //technically this is not correct as the default algorithm for
    //html canvas is supposed to be the non-zero winding rule instead
    pixelInsideClip(i,j) {
        if(!this._clip) return true;
        // console.log("checking for clip",i,j,this._clip);
        //turn into a list of lines
        // calculate intersections with a horizontal line at j
        var ints = calcSortedIntersections(this._clip,j);
        // find the intersections to the left of i (where x < i)
        var left = ints.filter((inter) => inter<i);
        // console.log("intersections = ", ints, left);
        if(left.length%2 === 0) {
            // console.log("is even");
            return false;
        }else {
            // console.log("is odd");
            return true;
        }
    }



    //stroke and fill text
    fillText(text, x ,y) { TEXT.processTextPath(this, text, x,y, true);  }
    strokeText(text, x ,y) { TEXT.processTextPath(this, text, x,y, false);  }


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


function makeLine  (start,end) {  return {start:start, end:end} }


function pathToLines(path) {
    var lines = [];
    var curr = null;
    path.forEach(function(cmd) {
        if(cmd[0] == 'm') {
            curr = cmd[1];
        }
        if(cmd[0] == 'l') {
            var pt = cmd[1];
            lines.push(makeLine(curr,pt));
            curr = pt;
        }
        if(cmd[0] == 'q') {
            var pts = [curr, cmd[1], cmd[2]];
            for(var t=0; t<1; t+=0.1) {
                var pt = calcQuadraticAtT(pts,t);
                lines.push(makeLine(curr,pt));
                curr = pt;
            }
        }
        if(cmd[0] == 'b') {
            var pts = [curr, cmd[1], cmd[2], cmd[3]];
            for(var t=0; t<1; t+=0.1) {
                var pt = calcBezierAtT(pts,t);
                lines.push(makeLine(curr,pt));
                curr = pt;
            }
        }
    });
    return lines;
}

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
    return xlist.sort(function(a,b) {  return a-b; });
}



function lerp(a,b,t) {  return a + (b-a)*t; }
function clamp(v,min,max) {
    if(v < min) return min;
    if(v > max) return max;
    return v;
}

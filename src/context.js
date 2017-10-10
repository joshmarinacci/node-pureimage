"use strict";
/**@ignore */
var uint32 = require('./uint32');
/**@ignore */
var NAMED_COLORS = require('./named_colors');
/**@ignore */
var trans = require('./transform');
/**@ignore */
var TEXT = require('./text');

/**
 * Context
 * 
 * @class Context
 */
class Context {

    /**
     * Creates a new pure image Context
     * 
     * @param {Bitmap} bitmap An instance of the {@link Bitmap} class
     * @memberof Context
     */
    constructor(bitmap) {
        /**
         * @type {Bitmap}
         */
        this.bitmap = bitmap;

        /**
         * @type {number}
         */
        this._fillColor = 0x000000FF;
        Object.defineProperty(this, 'fillStyle', {
            get: function() { return this._fillStyle_text; },
            set: function(val) {
                this._fillColor = Context.colorStringToUint32(val);
                /**
                 * @type {string}
                 */
                this._fillStyle_text = val;
            }
        });

        /**
         * @type {number}
         */
        this._strokeColor = 0x000000FF;
        Object.defineProperty(this, 'strokeStyle', {
            get: function() { return this._strokeStyle_text; },
            set: function(val) {
                this._strokeColor = Context.colorStringToUint32(val);
                /**
                 * @type {string}
                 */
                this._strokeStyle_text = val;
            }
        });

        /**
         * @type {number}
         */
        this._lineWidth = 1;
        Object.defineProperty(this, 'lineWidth', {
            get: function() { return this._lineWidth; },
            set: function(val) {
                this._lineWidth = val;
            }
        });

        /**
         * @type {number}
         */
        this._globalAlpha = 1;
        Object.defineProperty(this, 'globalAlpha', {
            get: function() { return this._globalAlpha; },
            set: function(val) {
                this._globalAlpha = clamp(val,0,1);
            }
        });

        /**
         * @type {Transform}
         */
        this.transform = new trans.Transform();
        
        /**
         * @type {object}
         */
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

        /**
         * @type {boolean}
         */
        this.imageSmoothingEnabled = true;
        
        /**
         * @type {?any}
         */
        this._clip = null;
    }

    /**
     * Save
     * 
     * Save the current state of the transform
     * 
     * @see {@link Transform}
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    save() {
        this.transform.save();
    }

    /**
     * Translate
     * 
     * Translate the context according to the X and Y co-ordinates passed in
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    translate(x,y) {
        this.transform.translate(x,y);
    }

    /**
     * Rotate
     * 
     * Rorate the 
     * 
     * @param {number} angle The degrees of rotation (in radians)
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    rotate(angle) {
        this.transform.rotate(angle);
    }

    /**
     * Scale
     * 
     * Scale the current context by the amount given
     * 
     * @param {number} sx Scale X amount
     * @param {number} sy Scale Y amount
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    scale(sx,sy) {
        this.transform.scale(sx,sy);
    }

    /**
     * Restore
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    restore() {
        this.transform.restore();
    }


    /**
     * Fill Rect
     * 
     * Draw a simple rectangle
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} w Width
     * @param {number} h Height
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    fillRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.fillPixel(i,j);
            }
        }
    }

    /**
     * Clear Rect
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} w Width
     * @param {number} h Height
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    clearRect(x,y,w,h) {
        for(var i=x; i<x+w; i++) {
            for(var j=y; j<y+h; j++) {
                this.bitmap.setPixelRGBA(i,j,0x00000000);
            }
        }
    }

    /**
     * Stroke Rect
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} w Width
     * @param {number} h Height
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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

    /**
     * Fill Pixel
     * 
     * Set a single pixel
     * 
     * @param {number} i 
     * @param {number} j 
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    fillPixel(i,j) {
        if(!this.pixelInsideClip(i,j)) return;
        var new_pixel = this.calculateRGBA(i,j);
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }

    /**
     * Stroke Pixel
     * 
     * @param {number} i
     * @param {number} j
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    strokePixel(i,j) {
        if(!this.pixelInsideClip(i,j)) return;
        var new_pixel = this.calculateRGBA_stroke(i,j);
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }

    /**
     * Fill Pixel With Color
     * 
     * @param {number} i 
     * @param {number} j
     * @param {number} col
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    fillPixelWithColor(i,j,col) {
        if(!this.pixelInsideClip(i,j)) return;
        var new_pixel = col;
        var old_pixel = this.bitmap.getPixelRGBA(i,j);
        var final_pixel = this.composite(i,j,old_pixel,new_pixel);
        this.bitmap.setPixelRGBA(i,j,final_pixel);
    }

    /**
     * Composite
     * 
     * @param {number} i
     * @param {number} j
     * @param {number} old_pixel
     * @param {number} new_pixel
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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

    /**
     * Calculate RGBA
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {number}
     * 
     * @memberof Context
     */
    calculateRGBA(x,y) {
        return this._fillColor;
    }

    /**
     * Calculate RGBA Stroke
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {number}
     * 
     * @memberof Context
     */
    calculateRGBA_stroke(x,y) {
        return this._strokeColor;
    }


    /**
     * Get Image Data
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} w Width
     * @param {number} h Height
     * 
     * @returns {Bitmap}
     * 
     * @memberof Context
     */
    getImageData(x,y,w,h) {
        return this.bitmap;
    }

    /**
     * @ignore
     * 
     * *Put Image Data
     * 
     * @param {number} id Image ID
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    putImageData(id, x, y) {
        throw new ("Method not yet implemented");
    }

    /**
     * Draw Image
     * 
     * @param {Bitmap} bitmap An instance of the {@link Bitmap} class to use for drawing
     * @param {number} sx
     * @param {number} sy
     * @param {number} sw
     * @param {number} sh
     * @param {number} dx
     * @param {number} dy
     * @param {number} dw
     * @param {number} dh
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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


    /**
     * Begin Path
     * 
     * Initialize the `path` attribue to hold the path points
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    beginPath() {
        /**
         * @type {Array}
         */
        this.path = [];
    }

    /**
     * Move the "pen" to a given point specified by `x` and `y`. API sugar for {@link _moveTo}
     * 
     * @param {number} x X position
     * @param {number} y Y position 
     * 
     * @returns {void}
     * 
     * @memberof Context
    * */
    moveTo(x,y) {
        return this._moveTo({x:x,y:y});
    }

    /**
     * Move the "pen" to a given point
     * 
     * @param {object} pt A `point` object representing a set of co-ordinates to move the "pen" to.
     * @example this._moveTo({x: 20, y: 40})
     * 
     * @returns {void}
     * 
     * @memberof Context
    * */
    _moveTo(pt) {
        pt = this.transform.transformPoint(pt);
        /**
         * @type {object}
         */
        this.pathstart = pt;
        this.path.push(['m',pt]);
    }

    /**
     * Line To
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    lineTo(x,y) {
        return this._lineTo({x:x, y:y});
    }

    /**
     * Line To
     * 
     * @param {{x: 20, y: 52}} pt A point object to draw a line to from the current set of co-ordinates
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    _lineTo(pt) {
        this.path.push(['l',this.transform.transformPoint(pt)]);
    }

    /**
     * Quadratic Curve To
     * 
     * Create a quadratic curve
     * 
     * @param {number} cp1x Curve point X position
     * @param {number} cp1y Curve point Y position
     * @param {number} x Curve X position
     * @param {number} y Curve Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    quadraticCurveTo(cp1x, cp1y, x,y) {
        let cp1 = this.transform.transformPoint({x:cp1x, y:cp1y});
        let pt = this.transform.transformPoint({x:x, y:y});
        this.path.push(['q', cp1, pt]);
    }

    /**
     * Bezier Curve To
     * 
     * Create a bezier curve betweeen two points
     * 
     * @param {number} cp1x Curve point 1 X position
     * @param {number} cp1y Curve point 1 Y position
     * @param {number} cp2x Curve point 2 X position
     * @param {number} cp2y Curve point 2 Y position
     * @param {number} x Curve X position
     * @param {number} y Curve Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._bezierCurveTo({x:cp1x,y:cp1y},{x:cp2x,y:cp2y}, {x:x,y:y});
    }

    /**
     * Bezier Curve To
     * 
     * @param {number} cp1 Curve point 1
     * @param {number} cp2 Curve point 2
     * @param {number} pt 
     * 
     * @returns {void}
     * 
     * @memberof Context
    * */
    _bezierCurveTo(cp1, cp2, pt) {
        cp1 = this.transform.transformPoint(cp1);
        cp2 = this.transform.transformPoint(cp2);
        pt  = this.transform.transformPoint(pt);
        this.path.push(['b', cp1, cp2, pt]);
    }

    /**
     * Arc
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} rad Arc radius
     * @param {number} start Arc start
     * @param {number} end Arc end
     * @param {boolean} clockwise Set arc direction (`true` for clockwise, `false` for anti-clockwise)
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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

    /**
     * Arc To
     * 
     * @throws {Error} Method is not yet implemented
     * 
     * @memberof Context
     */
    arcTo() {
        throw new Error("arcTo not yet supported");
    }

    /**
     * Rect
     * 
     * @throws {Error} Method is not yet implemented
     * 
     * @memberof Context
     */
    rect() {
        throw new Error("rect not yet supported");
    }

    /**
     * Ellipse
     * 
     * @throws {Error} Method is not yet implemented
     * 
     * @memberof Context
     */
    ellipse() {
        throw new Error("ellipse not yet supported");
    }

    /**
     * Clip
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    clip() {
        this._clip = pathToLines(this.path);
    }

    /**
     * Measure Text
     * 
     * @throws {Error} Method is not yet implemented
     * 
     * @memberof Context
     */
    measureText() {
        throw new Error("measureText not yet supported");
    }

    /**
     * Close Path
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    closePath() {
        this.path.push(['l',this.pathstart]);
    }


    /**
     * Stroke
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    stroke() {
        pathToLines(this.path).forEach((line)=> this.drawLine(line));
    }

    /**
     * Draw Line
     * 
     * @param {{start: {x: 42, y: 30}, end: {x: 10, y: 20}}} line A set of co-ordinates representing the start and end of the line
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    drawLine(line) {
        this.imageSmoothingEnabled?this.drawLine_aa(line):this.drawLine_noaa(line)
    }

    /**
     * Draw Line NoAA
     * 
     * Draw a line with anti-aliasing disabled
     * 
     * @param {{start: {x: 42, y: 30}, end: {x: 10, y: 20}}} line A set of co-ordinates representing the start and end of the line
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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
    
    /**
     * Draw Line Anti-aliased
     * 
     * Anti-aliased Bressenham's line with width
     * 
     * @see http://members.chello.at/~easyfilter/bresenham.html
     * 
     * @param {{start: {x: 42, y: 30}, end: {x: 10, y: 20}}} line A set of co-ordinates representing the start and end of the line
     * @memberof Context
     */
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

    /**
     * Fill
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    fill() {
        this.imageSmoothingEnabled ? this.fill_aa() : this.fill_noaa();
    }

    /**
     * Fill Anti-aliased
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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

    /**
     * Fill No Anti-aliased
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
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

    /**
     * Pixel Inside Clip
     * 
     * Even/odd rule. https://en.wikipedia.org/wiki/Point_in_polygon
     * technically this is not correct as the default algorithm for
     * html canvas is supposed to be the non-zero winding rule instead
     * 
     * @see https://en.wikipedia.org/wiki/Point_in_polygon
     *  
     * @param {number} i
     * @param {number} j
     * 
     * @returns {void}
     *  
     * @memberof Context
     */
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



    /**
     * Fill Text
     * 
     * @param {string} text The text to fill
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    fillText(text, x ,y) { TEXT.processTextPath(this, text, x,y, true);  }

    /**
     * Stroke Text
     * 
     * @param {string} text The text to stroke
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {void}
     * 
     * @memberof Context
     */
    strokeText(text, x ,y) { TEXT.processTextPath(this, text, x,y, false);  }


    /**
     * Color String To Unint32
     * 
     * Convert a color string to Uint32 notation
     * 
     * @static
     * @param {number} str The color string to convert
     * 
     * @returns {number}
     * 
     * @example 
     * var uInt32 = colorStringToUint32('#FF00FF');
     * console.log(uInt32); // Prints 4278255615
     * 
     * @memberof Context
     */
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

/**
 * Fract
 * 
 * @param {number} v
 * 
 * @returns {number}
 */
function fract(v) {  return v-Math.floor(v);   }

/**
 * Make Line
 * 
 * @param {number} start
 * @param {number} end
 * 
 * @returns {{start: start, end: end}}
 */
function makeLine  (start,end) {  return {start:start, end:end} }

/**
 * Path to Lines
 * 
 * Convert a path of points to an array of lines
 * 
 * @param {Array} path 
 * @returns 
 */
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

/**
 * Calculate Quadratic
 * 
 * @param {number} p
 * @param {number} t
 * 
 * @returns {void} 
 */
function calcQuadraticAtT(p, t) {
    var x = (1-t)*(1-t)*p[0].x + 2*(1-t)*t*p[1].x + t*t*p[2].x;
    var y = (1-t)*(1-t)*p[0].y + 2*(1-t)*t*p[1].y + t*t*p[2].y;
    return {x:x,y:y};
}

/**
 * Calculate Bezier at T
 * 
 * @param {number} p
 * @param {number} t
 * 
 * @returns {void}
 */
function calcBezierAtT(p, t) {
    var x = (1-t)*(1-t)*(1-t)*p[0].x + 3*(1-t)*(1-t)*t*p[1].x + 3*(1-t)*t*t*p[2].x + t*t*t*p[3].x;
    var y = (1-t)*(1-t)*(1-t)*p[0].y + 3*(1-t)*(1-t)*t*p[1].y + 3*(1-t)*t*t*p[2].y + t*t*t*p[3].y;
    return {x:x,y:y};
}

/**
 * Calculate Minimum Bounds
 * 
 * @param {Array} lines
 * 
 * @returns {{x: Number.MAX_VALUE, y: Number.MAX_VALUE, x2: Number.MIN_VALUE, y2: Number.MIN_VALUE}}
 */
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


/**
 * Calculate Sorted Intersections
 * 
 * Adopted from http://alienryderflex.com/polygon
 * 
 * @see http://alienryderflex.com/polygon
 * 
 * @param {Array} lines An {@link Array} of Lines
 * @param {number} y 
 * 
 * @returns {Array}
 */
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


/**
 * Lerp
 * 
 * In mathematics, linear interpolation is a method of curve fitting using linear polynomials to construct new data
 * points within the range of a discrete set of known data points.
 * 
 * @param {number} a 
 * @param {number} b 
 * @param {number} t 
 * 
 * @see https://en.wikipedia.org/wiki/Linear_interpolation
 * 
 * @returns {number}
 */
function lerp(a,b,t) {  return a + (b-a)*t; }

/**
 * Clamp
 * 
 * @param {number} v 
 * @param {number} min 
 * @param {number} max 
 * 
 * @returns {number}
 */
function clamp(v,min,max) {
    if(v < min) return min;
    if(v > max) return max;
    return v;
}

"use strict";

import {Line} from "./line.js"
import {NAMED_COLORS} from './named_colors.js'
import {Bounds, calc_min_bounds, Point, toDeg, toRad} from "./point.js"
import * as TEXT from "./text.js"
import * as trans from "./transform.js"
import * as G from "./gradients.js"
import {and, fromBytesBigEndian, getBytesBigEndian, or, shiftLeft, toUint32} from './uint32.js'
import {clamp, colorStringToUint32} from './util.js'

/**
 * Enum for path commands (used for encoding and decoding lines, curves etc. to and from a path)
 * @enum {string}
 */
const PATH_COMMAND = {
    MOVE: 'm',
    LINE: 'l',
    QUADRATIC_CURVE: 'q',
    BEZIER_CURVE: 'b'
};

/**
 * Used for drawing rectangles, text, images and other objects onto the canvas element. It provides the 2D rendering context for a drawing surface.
 *
 * It has the same API as [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) from the HTML5 canvas spec
 *
 * @class Context
 */
export class Context {
    /**
     * Creates a new pure image Context
     *
     * @param {Bitmap} bitmap An instance of the {@link Bitmap} class
     * @memberof Context
     */
    constructor(bitmap) {
        /**
         * An instance of the {@link Bitmap} class. Used for direct pixel manipulation(for example setting pixel colours)
         * @type {Bitmap}
         */
        this.bitmap = bitmap;

        /**
         *  A 32-bit unsigned integer (uint32) number representing the fill color of the 2D drawing context
         *
         * @type {number}
         */
        this._fillColor = NAMED_COLORS.black;

        /**
         * @type {number}
         */
        this._strokeColor = NAMED_COLORS.black;

        /**
         * @type {number}
         */
        this._lineWidth = 1;

        /**
         * @type {number}
         */
        this._globalAlpha = 1;

        /**
         * @type {Transform}
         */
        this._transform = new trans.Transform();

        /**
         * @type {object} Plain js object wrapping the font name and size
         */
        this._font = {
            family:'invalid',
            size:12
        };

        /** @type {string} horizontal text alignment, one of start, end, left, center, right. start is the default */
        this.textAlign = 'start'

        /** @type {string} vertical text alignment, relative to the baseline. one of top, middle, alphabetic(default) and bottom. */
        this.textBaseline = 'alphabetic'


        /**
         * @type {boolean} Enable or disable image smoothing(anti-aliasing)
         */
        this.imageSmoothingEnabled = true;

        /**
         * @type {?any}
         */
        this._clip = null;

        /**
         * @type {string}
         */
        this._fillStyle_text = '';

        /**
         * @type {string}
         */
        this._strokeStyle_text = '';
    }

    /**
     * The color or style to use inside shapes. The default is #000 (black).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle
     * @type {string}
     */
    get fillStyle () {
        return this._fillStyle_text;
    };

    /**
     * @param {string} val
     * @example ctx.fillStyle = 'rgba(0, 25, 234, 0.6)';
     */
    set fillStyle (val) {
        if(val instanceof G.CanvasGradient) {
            this._fillColor = val
        } else {
            this._fillColor = colorStringToUint32(val);
            this._fillStyle_text = val;
        }
    };

    /**
     * The color or style to use for the lines around shapes. The default is #000 (black).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     * @type {string}
     */
    get strokeStyle () {
        return this._strokeStyle_text
    };

    /**
     * @param {string} val
     * @example ctx.strokeStyle = 'rgba(0, 25, 234, 0.6)';
     */
    set strokeStyle (val) {
        if(val instanceof G.CanvasGradient) {
            this._strokeStyle_text = val
        } else {
            this._strokeColor = colorStringToUint32(val);
            this._strokeStyle_text = val;
        }
    };

    /**
     * The thickness of lines in space units. When getting, it returns the current value (1.0 by default). When setting, zero, negative, `Infinity` and `NaN` values are ignored; otherwise the current value is set to the new value.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineWidth
     * @type {number}
     */
    get lineWidth() {
        return this._lineWidth;
    };

    /**
     * @param {string} val
     * @example ctx.lineWidth = 15;
     */
    set lineWidth(val) {
        this._lineWidth = val;
    };

    /**
     * The alpha value that is applied to shapes and images before they are drawn onto the canvas. The value is in the range from 0.0 (fully transparent) to 1.0 (fully opaque).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha
     * @type {Boolean}
     */
    get globalAlpha() {
        return this._globalAlpha;
    };

    /**
     * @param {boolean} val
     * @example ctx.globalAlpha = 1;
     */
    set globalAlpha(val) {
        this._globalAlpha = clamp(val,0,1);
    }

    /**
     * The current text style being used when drawing text. This string uses the same syntax as the CSS font specifier
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font
     * @type {string} a string representing the font size and family to use
     */
    get font() {};

    /**
     * @param {string} font to use. Note that the font weight is not supported.
     * @example ctx.font = '16px serif'
     */
    set font(val) {
        const n = val.trim().indexOf(' ')
        this._font.size   = parseInt(val.slice(0, n))
        this._font.family = val.slice(n).trim();
    }


    createLinearGradient(x0,y0, x1,y1) {
        return new G.LinearGradient(x0,y0,x1,y1)
    }
    createRadialGradient(x0,y0) {
        return new G.RadialGradient(x0,y0)
    }


    /**
     * Saves the entire state of the canvas by pushing the current state onto a stack
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save
     *
     * @returns {void}
     *
     * @memberof Context
     */
    save() {
        this._transform.save();
    }

    /**
     * Adds a translation transformation by moving the canvas and its origin `x` horizontally and `y` vertically on the grid
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/translate
     *
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @returns {void}
     *
     * @memberof Context
     */
    translate(x,y) {
        this._transform.translate(x,y);
    }

    /**
     * Add a rotation to the transformation matrix. The angle argument represents a clockwise rotation angle and is expressed in adians
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     *
     * @param {number} angle Degrees of rotation (in radians)
     *
     * @returns {void}
     *
     * @memberof Context
     */
    rotate(angle) {
        this._transform.rotate(angle);
    }

    /**
     * Adds a scaling transformation to the canvas units by `x` horizontally and by `y` vertically
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     *
     * @param {number} sx Scale X amount
     * @param {number} sy Scale Y amount
     *
     * @returns {void}
     *
     * @memberof Context
     */
    scale(sx,sy) {
        this._transform.scale(sx,sy);
    }

    transform(...args) {
        let new_mat = [...args]
        this._transform.multiply(new_mat)
    }

    setTransform(...args) {
        this._transform.identity()
        if(args[0].is2D) {
            let new_mat = this._transform.fromDomMatrix(args[0])
            this._transform.multiply(new_mat)
        } else {
            this._transform.multiply([...args])
        }
    }
    getTransform() {
        return this._transform.asDomMatrix()
    }


    /**
     * Restores the most recently saved canvas state by popping the top entry in the drawing state stack. If there is no saved state, this method does nothing.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/restore
     *
     * @returns {void}
     *
     * @memberof Context
     */
    restore() {
        this._transform.restore();
    }


    /**
     * Draws a filled rectangle whose starting point is at the coordinates `(x, y)` with the specified width and height and whose style is determined by the fillStyle attribute.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillRect
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
        for(let i=x; i<x+w; i++) {
            for(let j=y; j<y+h; j++) {
                this.fillPixel(i,j);
            }
        }
    }

    /**
     * Sets all pixels in the rectangle defined by starting point `(x, y)` and size `(width, height)` to transparent black, erasing any previously drawn content.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clearRect
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
        for(let i=x; i<x+w; i++) {
            for(let j=y; j<y+h; j++) {
                this.bitmap.setPixelRGBA(i,j,0x00000000);
            }
        }
    }

    /**
     * Paints a rectangle which has a starting point at `(x, y)` and has a `w` width and an `h` height onto the canvas, using the current stroke style.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeRect
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
        for(let i=x; i<x+w; i++) {
            this.bitmap.setPixelRGBA(i, y, this._strokeColor);
            this.bitmap.setPixelRGBA(i, y+h, this._strokeColor);
        }
        for(let j=y; j<y+h; j++) {
            this.bitmap.setPixelRGBA(x, j, this._strokeColor);
            this.bitmap.setPixelRGBA(x+w, j, this._strokeColor);
        }
    }

    /**
     * Set the background colour of a single pixel denoted by the `x` and `y` co-ordinates
     *
     * @param {number} x The x axis of the pixel
     * @param {number} y The y axis of the pixel
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fillPixel(x,y) {
        if(!this.pixelInsideClip(x,y)) {
            return
        }

        const new_pixel = this.calculateRGBA(x, y)
        const old_pixel = this.bitmap.getPixelRGBA(x, y)
        const final_pixel = this.composite(x, y, old_pixel, new_pixel)

        this.bitmap.setPixelRGBA(x,y,final_pixel);
    }

    /**
     * Paints a pixel which has an x axis position of `x` and a y axis position of `y`
     *
     * @param {number} x The x axis of the pixel to stroke
     * @param {number} y The y axis of the pixel to stroke
     *
     * @returns {void}
     *
     * @memberof Context
     */
    strokePixel(x,y) {
        if(!this.pixelInsideClip(x,y)) {
            return
        }

        const new_pixel = this.calculateRGBA_stroke(x, y)
        const old_pixel = this.bitmap.getPixelRGBA(x, y)
        const final_pixel = this.composite(x, y, old_pixel, new_pixel)

        this.bitmap.setPixelRGBA(x,y,final_pixel);
    }

    /**
     * Fill Pixel With Color
     *
     * @param {number} x   The x axis of the pixel to fill
     * @param {number} y   The y axis of the pixel to fill
     * @param {number} col
     *
     * @ignore
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fillPixelWithColor(x,y,col) {
        if(!this.pixelInsideClip(x,y)) {
            return
        }

        const new_pixel = col
        const old_pixel = this.bitmap.getPixelRGBA(x, y)
        const final_pixel = this.composite(x, y, old_pixel, new_pixel)

        this.bitmap.setPixelRGBA(x,y,final_pixel);
    }

    /**
     * Composite
     *
     * @param {number} i Unused
     * @param {number} j Unused
     * @param {number} old_pixel
     * @param {number} new_pixel
     *
     * @ignore
     *
     * @returns {void}
     *
     * @memberof Context
     */
    composite(i,j,old_pixel, new_pixel) {
        const old_rgba = getBytesBigEndian(old_pixel);
        const new_rgba = getBytesBigEndian(new_pixel);

        // convert to range of 0->1
        const A = new_rgba.map((b) => b / 255);
        const B = old_rgba.map((b) => b / 255);

        // multiply by global alpha
        A[3] = A[3] * this._globalAlpha;

        // do a standard composite (SRC_OVER) on RGB values
        function compit(ca, cb, aa, ab) {
            return (ca*aa + cb*ab * (1-aa)) / (aa+ab*(1-aa));
        }
        const C = A.slice(0, 3).map((comp, i) => compit(A[i], B[i], A[3], B[3]));

        // convert back to 0->255 range
        const Cf = C.map((c) => c * 255);

        // convert back to int
        return fromBytesBigEndian(
            Cf[0], Cf[1], Cf[2], // R, G, B,
            Math.max(old_rgba[3], new_rgba[3]) // alpha
        );
    }

    /**
     * Calculate RGBA
     *
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @ignore
     *
     * @returns {number}
     *
     * @memberof Context
     */
    calculateRGBA(x,y) {
        if(this._fillColor instanceof G.CanvasGradient) {
            return this._fillColor.colorAt(x,y)
        }
        return this._fillColor;
    }

    /**
     * Calculate RGBA Stroke
     *
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @ignore
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
     * @ignore
     *
     * @returns {Bitmap}
     *
     * @memberof Context
     */
    getImageData(x,y,w,h) {
        return this.bitmap._copySubBitmap(x,y,w,h)
    }

    /**
     * *Put Image Data
     *
     * @param {Bitmap} imageData Image ID
     * @param {number} x  X position
     * @param {number} y  Y position
     *
     * @ignore
     *
     * @returns {void}
     *
     * @memberof Context
     */
    putImageData(imageData, x, y) {
        this.bitmap._pasteSubBitmap(imageData,x,y)
    }

    /**
     * Provides different ways to draw an image onto the canvas.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
     *
     * @param {Bitmap} bitmap An instance of the {@link Bitmap} class to use for drawing
     * @param {number} sx     The X coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
     * @param {number} sy     The Y coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
     * @param {number} sw     The width of the sub-rectangle of the source {@link Bitmap} to draw into the destination context. If not specified, the entire rectangle from the coordinates specified by `sx` and `sy` to the bottom-right corner of the image is used.
     * @param {number} sh     The height of the sub-rectangle of the source {@link Bitmap} to draw into the destination context.
     * @param {number} dx     The X coordinate in the destination canvas at which to place the top-left corner of the source {@link Bitmap}
     * @param {number} dy     The Y coordinate in the destination canvas at which to place the top-left corner of the source {@link Bitmap}
     * @param {number} dw     The width to draw the {@link Bitmap} in the destination canvas. This allows scaling of the drawn image. If not specified, the image is not scaled in width when drawn
     * @param {number} dh     The height to draw the {@link Bitmap} in the destination canvas. This allows scaling of the drawn image. If not specified, the image is not scaled in height when drawn
     *
     * @returns {void}
     *
     * @memberof Context
     */
    drawImage(bitmap, sx,sy,sw,sh, dx, dy, dw, dh) {
        // two argument form
        if(typeof sw === 'undefined') return this.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, sx, sy, bitmap.width, bitmap.height)
        // four argument form
        if(typeof dx === 'undefined') return this.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, sx, sy, sw, sh)

        let src_bounds = new Bounds(sx,sy,sx+sw,sy+sh)
        let pts = [
            new Point(dx,dy),
            new Point(dx+dw,dy),
            new Point(dx+dw,dy+dh),
            new Point(dx,dy+dh),
            ]
        pts = pts.map(pt => this._transform.transformPoint(pt))
        let dst_bounds = calc_min_bounds(pts)

        let bitmap_bounds = new Bounds(0,0, this.bitmap.width, this.bitmap.height)
        dst_bounds = dst_bounds.intersect(bitmap_bounds)

        let inv = this._transform.cloneTransform()
        inv.invert()

        //map dx to dx+dw  from sx to sx+sw
        function remap(n, a1, a2, b1, b2) {
            let t = (n-a1)/(a2-a1)
            return t*(b2-b1) + b1
        }

        for(let i=dst_bounds.x1; i<dst_bounds.x2; i++) {
            for(let j=dst_bounds.y1; j<dst_bounds.y2; j++) {
                let dst_pt = new Point(i,j)
                let src_pt = inv.transformPoint(dst_pt).round()
                src_pt = new Point(
                    remap(src_pt.x, dx,dx+dw, sx,sx+sw),
                    remap(src_pt.y, dy,dy+dh, sy,sy+sh)
                )
                if(src_bounds.contains(src_pt)) {
                    const rgba = bitmap.getPixelRGBA(src_pt.x, src_pt.y)
                    if(this.pixelInsideClip(dst_pt.x,dst_pt.y)) {
                        this.bitmap.setPixelRGBA(dst_pt.x, dst_pt.y, rgba)
                    }
                }
            }
        }
    }


    /**
     * Starts a new path by emptying the list of sub-paths. Call this method when you want to create a new path.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/beginPath
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
        this._closed = false;
    }

    /**
     * Moves the starting point of a new sub-path to the (x, y) coordinates.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/moveTo
     *
     * @param {number} x The x axis of the point.
     * @param {number} y The y axis of the point.
     *
     * @returns {void}
     *
     * @memberof Context
    * */
    moveTo(x,y) {
        return this._moveTo(new Point(x, y));
    }

    /**
     * Moves the starting point of a new sub-path to the (x, y) coordinates.
     *
     * @param {Point} pt A `point` object representing a set of co-ordinates to move the "pen" to.
     *
     * @example
     * //All of the following are valid:
     * this._moveTo({x: 20, y: 40})
     * this._moveTo(new Point(20, 40))
     *
     * @returns {void}
     *
     * @memberof Context
    * */
    _moveTo(pt) {
        pt = this._transform.transformPoint(pt);
        /**
         * Set the starting co-ordinates for the path starting point
         * @type {Point}
         */
        this.pathstart = pt;
        this.path.push([PATH_COMMAND.MOVE, pt]);
    }

    /**
     * Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo
     *
     * @param {number} x The x axis of the coordinate for the end of the line.
     * @param {number} y The y axis of the coordinate for the end of the line.
     *
     * @returns {void}
     *
     * @memberof Context
     */
    lineTo(x,y) {
        return this._lineTo(new Point(x, y));
    }

    /**
     * Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it).
     *
     * @param {Point} pt A point object to draw a line to from the current set of co-ordinates
     *
     * @returns {void}
     *
     * @memberof Context
     */
    _lineTo(pt) {
        this.path.push([PATH_COMMAND.LINE, this._transform.transformPoint(pt)]);
    }

    /**
     * Adds a quadratic Bézier curve to the path. It requires two points. The first point is a control point and the second one is the end point. The starting point is the last point in the current path, which can be changed using moveTo() before creating the quadratic Bézier curve.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/quadraticCurveTo
     *
     * @param {number} cp1x The x axis of the coordinate for the control point.
     * @param {number} cp1y The y axis of the coordinate for the control point.
     * @param {number} x    The x axis of the coordinate for the end point.
     * @param {number} y    The y axis of the coordinate for the end point.
     *
     * @returns {void}
     *
     * @memberof Context
     */
    quadraticCurveTo(cp1x, cp1y, x,y) {
        let cp1 = this._transform.transformPoint(new Point(cp1x, cp1y));
        let pt  = this._transform.transformPoint(new Point(x, y));
        this.path.push([PATH_COMMAND.QUADRATIC_CURVE, cp1, pt]);
    }

    /**
     * Adds a cubic Bézier curve to the path. It requires three points. The first two points are control points and the third one is the end point. The starting point is the last point in the current path, which can be changed using moveTo() before creating the Bézier curve.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/bezierCurveTo
     *
     * @param {number} cp1x The x axis of the coordinate for the first control point.
     * @param {number} cp1y The y axis of the coordinate for first control point.
     * @param {number} cp2x The x axis of the coordinate for the second control point.
     * @param {number} cp2y The y axis of the coordinate for the second control point.
     * @param {number} x    The x axis of the coordinate for the end point.
     * @param {number} y    The y axis of the coordinate for the end point.
     *
     * @returns {void}
     *
     * @memberof Context
     */
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._bezierCurveTo(new Point(cp1x, cp1y), new Point(cp2x, cp2y), new Point(x, y));
    }

    /**
     * Bezier Curve To
     *
     * @param {number} cp1 Curve point 1
     * @param {number} cp2 Curve point 2
     * @param {Point}  pt
     *
     * @returns {void}
     *
     * @memberof Context
    * */
    _bezierCurveTo(cp1, cp2, pt) {
        cp1 = this._transform.transformPoint(cp1);
        cp2 = this._transform.transformPoint(cp2);
        pt  = this._transform.transformPoint(pt);
        this.path.push([PATH_COMMAND.BEZIER_CURVE, cp1, cp2, pt]);
    }

    /**
     * Adds an arc to the path which is centered at (x, y) position with radius r starting at startAngle and ending at endAngle going in the given direction by anticlockwise (defaulting to clockwise).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
     *
     * @param {number}  x         The x coordinate of the arc's center
     * @param {number}  y         The y coordinate of the arc's center
     * @param {number}  rad       The arc's radius
     * @param {number}  start     The angle at which the arc starts, measured clockwise from the positive x axis and expressed in radians
     * @param {number}  end       The angle at which the arc ends, measured clockwise from the positive x axis and expressed in radians
     * @param {boolean} anticlockwise A boolean which, if true, causes the arc to be drawn anticlockwise between the two angles.
     *
     * @returns {void}
     *
     * @memberof Context
     */
    arc(x,y, rad, start, end, anticlockwise) {
        function calcPoint(angle) {
            let px = x + Math.cos(angle)*rad;
            let py = y + Math.sin(angle)*rad;
            return new Point(px, py);
        }

        if(start > end) end += Math.PI*2;

        let step = Math.PI / 16
        if (anticlockwise) {
            let temp = end;
            end = start + Math.PI * 2;
            start = temp;
        }
        this._moveTo(calcPoint(start));
        for (let a = start; a <= end; a += step) {
            this._lineTo(calcPoint(a));
        }
        this._lineTo(calcPoint(end));
    }

    /**
     * Arc To
     *
     * @ignore
     *
     * @throws {Error} Method is not yet implemented
     *
     * @memberof Context
     */
    arcTo() {
        throw new Error("arcTo not yet supported");
    }

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rect
     * Draws a rectangle with the upper left corner at the specified (x, y)
     *
     * @returns {void}
     *
     * @memberof Context
     *
     *
     * @param {number}  x         The x coordinate of the rectangle
     * @param {number}  y         The y coordinate of the rectangle
     * @param {number}  width     The width of the rectangle
     * @param {number}  height    The height of the rectangle
     *
     *
     * @memberof Context
     */
    rect(x,y,width,height) {
        this.moveTo(x,y);
        this.lineTo(x+width,y);
        this.lineTo(x+width,y+height);
        this.lineTo(x,y+height);
        this.lineTo(x,y);
    }

    /**
     * Ellipse
     *
     * @ignore
     *
     * @throws {Error} Method is not yet implemented
     *
     * @memberof Context
     */
    ellipse() {
        throw new Error("ellipse not yet supported");
    }

    /**
     * Turns the path currently being built into the current clipping path.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip
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
     * @ignore
     *
     * @throws {Error} Method is not yet implemented
     *
     * @memberof Context
     */
    measureText(string) {
        return TEXT.measureText(this,string)
    }

    /**
     * Causes the point of the pen to move back to the start of the current sub-path. It tries to add a straight line (but does not actually draw it) from the current point to the start. If the shape has already been closed or has only one point, this function does nothing.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/closePath
     *
     * @returns {void}
     *
     * @memberof Context
     */
    closePath() {
        if(!this._closed) {
            this.path.push([PATH_COMMAND.LINE, this.pathstart]);
            this._closed = true
        }
    }


    /**
     * Strokes the current or given path with the current stroke style
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/stroke
     *
     * @returns {void}
     *
     * @memberof Context
     */
    stroke() {
        let flat_path = flatten_path(this.path)
        let stroke_path = path_to_stroked_path(flat_path,this.lineWidth/2)
        const lines = pathToLines(stroke_path)
        const old_fillStyle = this.fillStyle
        this.fillStyle = this.strokeStyle
        this.imageSmoothingEnabled ? this.fill_aa(lines) : this.fill_noaa(lines);
        this.fillStyle = old_fillStyle

        if(this.debug) {
            this.save()
            let old_ss = this.strokeStyle
            let old_lw = this.lineWidth
            this.strokeStyle = 'red'
            this.lineWidth = 1
            console.log("path is",this.path)
            pathToLines(this.path).forEach((line) => this.drawLine(line));
            console.log("flat path is",flat_path)
            pathToLines(flat_path).forEach((line) => this.drawLine(line));
            console.log("stroke path is",stroke_path)
            pathToLines(stroke_path).forEach(line => this.drawLine(line))
            console.log("final lines are",lines)
            this.strokeStyle = old_ss
            this.lineWidth = old_lw
            this.restore()
        }
    }

    /**
     * Draw a line using the correct anti-aliased, or non-anti-aliased line drawing function based on the value of {@link imageSmoothingEnabled}
     *
     * @param {Line} line A set of co-ordinates representing the start and end of the line. You can also pass a plain js object if you wish
     * @example
     * //All of the following are valid:
     * ctx.drawLine({start: {x: 20, y:42}, end: {x: 20, y:90}})
     * ctx.drawLine(new Line(new Point(20, 42), new Point(20, 90)))
     * ctx.drawLine(new Line(20, 42, 20, 90))
     *
     * @returns {void}
     *
     * @memberof Context
     */
    drawLine(line) {
        if(line.is_invalid()) return console.error('cannot draw line',line)
        this.imageSmoothingEnabled?this.drawLine_aa(line):this.drawLine_noaa(line)
    }

    /**
     *
     * Draw a line without anti-aliasing using Bresenham's algorithm
     *
     * @param {Line} line A set of co-ordinates representing the start and end of the line. You can also pass a plain js object if you wish
     * @example
     * //All of the following are valid:
     * ctx.drawLine({start: {x: 20, y:42}, end: {x: 20, y:90}})
     * ctx.drawLine(new Line(new Point(20, 42), new Point(20, 90)))
     * ctx.drawLine(new Line(20, 42, 20, 90))
     *
     * @returns {void}
     *
     * @memberof Context
     */
    drawLine_noaa(line) {
        //Bresenham's from Rosetta Code
        // http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
        let x0 = Math.floor(line.start.x)
        let y0 = Math.floor(line.start.y)
        const x1 = Math.floor(line.end.x)
        const y1 = Math.floor(line.end.y)
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1
        const dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1
        let err = (dx > dy ? dx : -dy) / 2

        while (true) {
            this.strokePixel(x0,y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = err
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
    }

    /**
     * Draw Line Anti-aliased
     *
     * Draw anti-aliased line using Bresenham's algorithm
     *
     * @see http://members.chello.at/~easyfilter/bresenham.html
     *
     * @param {Line} line A set of co-ordinates representing the start and end of the line. You can also pass a plain js object if you wish
     * @example
     * //All of the following are valid:
     * ctx.drawLine({start: {x: 20, y:42}, end: {x: 20, y:90}})
     * ctx.drawLine(new Line(new Point(20, 42), new Point(20, 90)))
     * ctx.drawLine(new Line(20, 42, 20, 90))
     *
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
        let rgb = and(this._strokeColor, 0xFFFFFF00);
        let a1 = and(this._strokeColor,0x000000FF);
        for (width = (width+1)/2; ; ) {
            const alpha = ~~Math.max(0, 255 * (Math.abs(err - dx + dy) / ed - width + 1));
            const a2 = 255-alpha
            const color = or(rgb,(a1*a2)/255);
            this.fillPixelWithColor(x0,y0,color);
            e2 = err; x2 = x0;
            if (2*e2 >= -dx) {
                for (e2 += dy, y2 = y0; e2 < ed*width && (y1 !== y2 || dx > dy); e2 += dx) {
                    const alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
                    const a2 = 255-alpha
                    const color = or(rgb,(a1*a2)/255);
                    this.fillPixelWithColor(x0, y2 += sy, color);
                }
                if (x0 === x1) break;
                e2 = err; err -= dy; x0 += sx;
            }
            if (2*e2 <= dy) {
                for (e2 = dx-e2; e2 < ed*width && (x1 !== x2 || dx < dy); e2 += dy) {
                    const alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
                    const a2 = 255-alpha
                    const color = or(rgb,(a1*a2)/255);
                    this.fillPixelWithColor(x2 += sx, y0, color);
                }
                if (y0 === y1) break;
                err += dx; y0 += sy;
            }
        }
    }

    /**
     * Fills the current or given path with the current fill style. Uses {@link fill_aa} and {@link fill_noaa} depending on the the value of {@link imageSmoothingEnabled}
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fill
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fill() {
        if(!this._closed) this.closePath()
        const lines = pathToLines(this.path)
        this.imageSmoothingEnabled ? this.fill_aa(lines) : this.fill_noaa(lines);
    }

    /**
     * Fill Anti-aliased
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fill_aa(lines) {
        //get just the color part
        const rgb = and(this._fillColor, 0xFFFFFF00)
        const alpha = and(this._fillColor, 0xFF)
        const bounds = calcMinimumBounds(lines)

        const startY = Math.min(bounds.y2 - 1, this.bitmap.height)
        const endY = Math.max(bounds.y, 0)

        for(let j=startY; j>=endY; j--) {
            const ints = calcSortedIntersections(lines, j)
            //fill between each pair of intersections
            // if(ints.length %2 !==0) console.log("warning. uneven number of intersections");
            for(let i=0; i<ints.length; i+=2) {
                const fstartf = fract(ints[i])
                const fendf = fract(ints[i + 1])
                const start = Math.floor(ints[i])
                const end = Math.floor(ints[i + 1])
                for(let ii=start; ii<=end; ii++) {
                    let col = this.calculateRGBA(ii,j)
                    if(ii === start) {
                        //first
                        const int = or(rgb,(1-fstartf)*alpha);
                        this.fillPixelWithColor(ii,j, int);
                        continue;
                    }
                    if(ii === end) {
                        //last
                        const int = or(rgb,fendf*alpha);
                        this.fillPixelWithColor(ii,j, int);
                        continue;
                    }
                    //console.log("filling",ii,j);
                    this.fillPixelWithColor(ii,j, col);
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
    fill_noaa(lines) {
        //get just the color part
        const rgb = and(this._fillColor, 0xFFFFFF00)
        const bounds = calcMinimumBounds(lines)
        for(let j=bounds.y2-1; j>=bounds.y; j--) {
            const ints = calcSortedIntersections(lines, j)
            //fill between each pair of intersections
            for(let i=0; i<ints.length; i+=2) {
                const start = Math.floor(ints[i])
                const end = Math.floor(ints[i + 1])
                for(let ii=start; ii<=end; ii++) {
                    let col = this.calculateRGBA(ii,j)
                    if(ii === start) {
                        //first
                        this.fillPixelWithColor(ii,j,col);
                        continue;
                    }
                    if(ii === end) {
                        //last
                        this.fillPixelWithColor(ii,j,col);
                        continue;
                    }
                    this.fillPixelWithColor(ii,j,col);
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
     * @param {number} x
     * @param {number} y
     *
     * @returns {void}
     *
     * @memberof Context
     */
    pixelInsideClip(x,y) {
        if(!this._clip) return true;
        //turn into a list of lines
        // calculate intersections with a horizontal line at j
        const ints = calcSortedIntersections(this._clip, y)
        // find the intersections to the left of i (where x < i)
        const left = ints.filter((inter) => inter < x)
        if(left.length%2 === 0) {
            return false;
        } else {
            return true;
        }
    }

    /**
     *  Draws a text string at the specified coordinates, filling the string's characters with the current foreground color
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText
     *
     * @param {string} text A string specifying the text string to render into the context. The text is rendered using the settings specified by {@link font}.
     * @param {number} x    The x -coordinate of the point at which to begin drawing the text, in pixels.
     * @param {number} y    The y-coordinate of the point at which to begin drawing the text, in pixels.
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fillText(text, x ,y) { TEXT.processTextPath(this, text, x,y, true, this.textAlign, this.textBaseline);  }

    /**
     * Draws the outlines of the characters of a specified text string at the given (x, y) position.
     *
     * @param {string} text The text to draw using the current {@link font} values.
     * @param {number} x    The x axis of the coordinate for the text starting point.
     * @param {number} y    The y axis of the coordinate for the text starting point.
     *
     * @returns {void}
     *
     * @memberof Context
     */
    strokeText(text, x ,y) { TEXT.processTextPath(this, text, x,y, false, this.textAlign, this.textBaseline);  }



}

/**
 * Returns the decimal portion of a given floating point number
 *
 * @param {number} v The number to return the declimal fration of
 * @example
 * console.log(fract(12.35))
 * // Prints out 0.34999999999999964
 *
 * @returns {number}
 */
function fract(v) {  return v-Math.floor(v);   }

/**
 * Convert a path of points to an array of lines
 *
 * @param {Array} path List of sub-paths
 *
 * @returns {Array<Line>}
 */
function pathToLines(path) {
    const lines = []
    let curr = null

    path.forEach(function(cmd) {
        if(cmd[0] === PATH_COMMAND.MOVE) {
            curr = cmd[1];
        }
        if(cmd[0] === PATH_COMMAND.LINE) {
            const pt = cmd[1]
            lines.push(new Line(curr, pt));
            curr = pt;
        }
        if(cmd[0] === PATH_COMMAND.QUADRATIC_CURVE) {
            const pts = [curr, cmd[1], cmd[2]];
            for(let t=0; t<1; t+=0.1) {
                let pt = calcQuadraticAtT(pts,t);
                lines.push(new Line(curr, pt));
                curr = pt;
            }
        }
        if(cmd[0] === PATH_COMMAND.BEZIER_CURVE) {
            const pts = [curr, cmd[1], cmd[2], cmd[3]];
            bezierToLines(pts,10).forEach(pt => {
                lines.push(new Line(curr,pt))
                curr = pt
            })
        }
    });
    return lines;
}

function flatten_path(A) {
    let B = []
    let curr = null
    A.forEach(cmd => {
        if(cmd[0] === PATH_COMMAND.MOVE) {
            curr = cmd[1];
            // console.log("move",curr)
            return B.push([PATH_COMMAND.MOVE, new Point(curr.x,curr.y)])
        }
        if(cmd[0] === PATH_COMMAND.LINE) {
            curr = cmd[1];
            // console.log("line",curr)
            return B.push([PATH_COMMAND.LINE, new Point(curr.x,curr.y)])
        }
        if(cmd[0] === PATH_COMMAND.BEZIER_CURVE) {
            const pts = [curr, cmd[1], cmd[2], cmd[3]];
            let pts2 = bezierToLines(pts,10)
            for(let i=1; i<pts2.length; i+=2) {
                B.push([PATH_COMMAND.LINE,new Point(pts2[i].x,pts2[i].y)])
            }
            curr = cmd[3]
        }
    })
    return B
}

function path_to_stroked_path(path, w) {
    //split the path into sub-paths based on the MOVE command
    let subs = []
    let curr_sub = []
    path.forEach(pth => {
        if(pth[0] === PATH_COMMAND.MOVE) {
            if(curr_sub.length > 0) subs.push(curr_sub)
            curr_sub = []
        }
        curr_sub.push(pth)
    })
    if(curr_sub.length > 0) subs.push(curr_sub)

    // warn if there's missing MOVEs
    subs.forEach(sub => {
        if(sub[0][0] !== PATH_COMMAND.MOVE) console.warn("missing a starting move command!");
    })

    // stroke each sub-path
    let fsubs = subs.map(sub => sub_path_to_stroked_sub_path(sub,w))
    // flatten back into a single string of commands
    let final_path = []
    fsubs.forEach(sub => sub.forEach(cmd => final_path.push(cmd)))
    return final_path
}
function sub_path_to_stroked_sub_path(path, w) {
    let curr = null
    let outside = []
    let inside = []
    let path_start = 0

    function project(A,B,scale) {
        if(A.equals(B)) console.log("same points!",A,B)
        let delta_unit = A.subtract(B).unit()
        let C_unit = delta_unit.rotate(toRad(90))
        let D_unit = delta_unit.rotate(toRad(-90))
        // console.log(C_unit, D_unit)
        return [
            C_unit.scale(scale).add(B),
            D_unit.scale(scale).add(B)
        ]
    }


    let prev_cmd = null

    function normalize_angle(turn) {
        if(turn < -Math.PI) return turn + Math.PI*2
        if(turn > +Math.PI) return turn - Math.PI*2
        return turn
    }

    function average(a, b) {
        return a.add(b).divide(2)
    }

    path.forEach(function(cmd,i) {
        // console.log("converting",cmd)
        if(cmd[0] === PATH_COMMAND.MOVE) {
            curr = cmd[1];
            prev_cmd = cmd
            path_start = curr.clone()
            outside.push([PATH_COMMAND.MOVE,path_start.clone()])
        }

        function first(arr) {
            return arr[0]
        }
        function last(arr) {
            return arr[arr.length-1]
        }

        if(cmd[0] === PATH_COMMAND.LINE) {
            const A = curr
            const B = cmd[1]
            if(A.equals(B)) return console.log("can't project the same paths",i,cmd,A,B)
            // console.log(i,"====",B)
            let next = path[i+1]
            //if first
            if(prev_cmd[0] === PATH_COMMAND.MOVE) {
                // console.log("doing the first")
                let pts1 = project(B,A,w)
                outside.push([PATH_COMMAND.LINE, pts1[1]])
                inside.push([PATH_COMMAND.LINE,pts1[0]])
            }
            prev_cmd = cmd
            // if last
            if(!next) {
                // console.log("doing last")
                let pts1 = project(A,B,w)
                outside.push([PATH_COMMAND.LINE, pts1[0]])
                inside.push([PATH_COMMAND.LINE, pts1[1]])
                return
            }
            const C = next[1]
            if(C.equals(B)) return console.log("can't project the same paths",i,cmd,A,B)
            // console.log(i,A,B,C)
            // console.log("next",next)
            let BA = A.subtract(B)
            let BC = C.subtract(B)
            // console.log(i,'B',B,'BA',BA,'BC',BC)
            let BA_angle = Math.atan2(BA.y,BA.x)
            let BC_angle = Math.atan2(BC.y,BC.x)
            // console.log("angles",toDeg(turn))
            let turn = normalize_angle(BC_angle-BA_angle)

            let pts1 = project(A,B,w)
            let pts2 = project(C,B,w)
            // console.log(i,'B',pts1)
            // console.log(i,'B',pts2)
            if(turn < 0) {
                //if turning right
                //outside is normal
                outside.push([PATH_COMMAND.LINE, pts1[0]])
                outside.push([PATH_COMMAND.LINE, pts2[1]])
                //adjust inside
                let h = w/Math.cos((Math.PI+turn)/2)
                let C_unit = A.subtract(B).unit().rotate(turn/2).scale(h).add(B)
                inside.push([PATH_COMMAND.LINE,C_unit])

            } else {
                //if turning left
                //adjust outside
                let h = w/Math.cos(-(Math.PI-turn)/2)
                let C_unit = C.subtract(B).unit().rotate(-turn/2).scale(h).add(B)
                outside.push([PATH_COMMAND.LINE,C_unit])
                //inside is normal
                inside.push([PATH_COMMAND.LINE, pts1[1]])
                inside.push([PATH_COMMAND.LINE, pts2[0]])
            }
            curr = B
        }
    })

    inside.reverse()
    let final = [].concat(outside).concat(inside)
    // console.log("path_to_stroked_path output")
    // console.log('outside',outside)
    // console.log('inside',inside)
    final.push([PATH_COMMAND.LINE, path_start]);
    // console.log("final")
    // console.log(final)
    return final
}

/**
 * Calculate Quadratic
 *
 * @param {number} p
 * @param {number} t
 *
 * @ignore
 *
 * @returns {Point}
 */
function calcQuadraticAtT(p, t) {
    const x = (1 - t) * (1 - t) * p[0].x + 2 * (1 - t) * t * p[1].x + t * t * p[2].x
    const y = (1 - t) * (1 - t) * p[0].y + 2 * (1 - t) * t * p[1].y + t * t * p[2].y
    return new Point(x, y);
}

/**
 * Calculate Bezier at T
 *
 * @param {number} p
 * @param {number} t
 *
 * @returns {Point}
 */
function calcBezierAtT(p, t) {
    const x = (1 - t) * (1 - t) * (1 - t) * p[0].x + 3 * (1 - t) * (1 - t) * t * p[1].x + 3 * (1 - t) * t * t * p[2].x + t * t * t * p[3].x
    const y = (1 - t) * (1 - t) * (1 - t) * p[0].y + 3 * (1 - t) * (1 - t) * t * p[1].y + 3 * (1 - t) * t * t * p[2].y + t * t * t * p[3].y
    return new Point(x, y);
}

function bezierToLines(curve, THRESHOLD) {
    function recurse(curve) {
        if(flatness(curve) < THRESHOLD) return [curve[0],curve[3]]
        const split = splitCurveAtT(curve,0.5,false)
        return recurse(split[0]).concat(recurse(split[1]))
    }
    return recurse(curve)
}

function splitCurveAtT(p,t, debug) {
    let p1 = p[0]
    let p2 = p[1]
    let p3 = p[2]
    let p4 = p[3]

    let p12 = midpoint(p1,p2,t)
    let p23 = midpoint(p2,p3,t)
    let p34 = midpoint(p4,p3,t)


    let p123 = midpoint(p12,p23,t)
    let p234 = midpoint(p23, p34,t)
    let p1234 = { x: (p234.x-p123.x)*t+p123.x, y: (p234.y-p123.y)*t+p123.y}

    return [[p1, p12, p123, p1234],[p1234,p234,p34,p4]]
}

function flatness(curve) {
    const pointA = curve[0]
    const controlPointA = curve[1]
    const controlPointB = curve[2]
    const pointB = curve[3]
    let ux = Math.pow( 3 * controlPointA.x - 2 * pointA.x - pointB.x, 2 );
    let uy = Math.pow( 3 * controlPointA.y - 2 * pointA.y - pointB.y, 2 );
    let vx = Math.pow( 3 * controlPointB.x - 2 * pointB.x - pointA.x, 2 );
    let vy = Math.pow( 3 * controlPointB.y - 2 * pointB.y - pointA.y, 2 );
    if( ux < vx )
        ux = vx;
    if( uy < vy )
        uy = vy;
    return ux + uy;
}

function midpoint(p1,p2,t) {
    return { x: (p2.x-p1.x)*t+p1.x, y: (p2.y-p1.y)*t+p1.y}
}

/**
 * Calculate Minimum Bounds
 *
 * @param {Array} lines
 *
 * @ignore
 *
 * @returns {{x: Number.MAX_VALUE, y: Number.MAX_VALUE, x2: Number.MIN_VALUE, y2: Number.MIN_VALUE}}
 */
function calcMinimumBounds(lines) {
    const bounds = {
        x: Number.MAX_VALUE,
        y: Number.MAX_VALUE,
        x2: Number.MIN_VALUE,
        y2: Number.MIN_VALUE
    }

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
 * @param {Array} lines An {@link Array} of Line
 * @param {number} y
 *
 * @ignore
 *
 * @returns {Array}
 */
function calcSortedIntersections(lines,y) {
    const xlist = []
    for(let i=0; i<lines.length; i++) {
        const A = lines[i].start
        const B = lines[i].end
        if(A.y<y && B.y>=y || B.y<y && A.y>=y) {
            const xval = A.x + (y - A.y) / (B.y - A.y) * (B.x - A.x)
            xlist.push(xval);
        }
    }
    return xlist.sort(function(a,b) {  return a-b; });
}






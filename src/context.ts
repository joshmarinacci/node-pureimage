import {Line} from './line.js';
import {NAMED_COLORS} from './named_colors.js';
import {Bounds, calc_min_bounds, Point, PointIsh, PointIshQuad, PointIshTri, toRad} from './point.js';
import * as TEXT from './text.js';
import * as trans from './transform.js';
import * as G from './gradients.js';
import {and, fromBytesBigEndian, getBytesBigEndian, or, shiftLeft, toUint32} from './uint32.js';
import {clamp, hasOwnProperty} from './util.js';
import type {Bitmap} from './bitmap.js';
import type { Transform } from './transform.js';
import {
    PATH_COMMAND,
    Font,
    TextAlign,
    TextBaseline,
    PathCmd,
    RGBA,
    RGB,
} from './types.js';


/**
 * Used for drawing rectangles, text, images and other objects onto the canvas element. It provides the 2D rendering context for a drawing surface.
 *
 * It has the same API as [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) from the HTML5 canvas spec
 */
export class Context {
    /**  A 32-bit unsigned integer (uint32) number representing the fill color of the 2D drawing context */
    private _fillColor: number | G.ColorGradient;
    private _strokeColor: number;
    private _lineWidth: number;
    private _globalAlpha: number;
    private _clip?: Line[];
    private _fillStyle_text: string;
    private _strokeStyle_text: string;
    private _closed?: boolean;
    private pathStart?: Point;
    private debug?: boolean;
    public path?: PathCmd[];
    /** Plain js object wrapping the font name and size */
    public _font: Font & {size:number};
    public transform: Transform;
    /** Horizontal text alignment, one of start, end, left, center, right. start is the default */
    public textAlign: TextAlign;
    /** vertical text alignment, relative to the baseline. one of top, middle, alphabetic(default) and bottom. */
    public textBaseline: TextBaseline;
    /** Enable or disable image smoothing(anti-aliasing)*/
    public imageSmoothingEnabled: boolean;

    /** Creates a new pure image Context */
    constructor(
        /** An instance of the {@link Bitmap} class. Used for direct pixel manipulation(for example setting pixel colours) */
        public bitmap: Bitmap
    ) {
        this._fillColor = NAMED_COLORS.black;
        this._strokeColor = NAMED_COLORS.black;
        this._lineWidth = 1;
        this._globalAlpha = 1;
        this.transform = new trans.Transform();
        this._font = {
            family:'invalid',
            size:12
        };
        this.textAlign = 'start';
        this.textBaseline = 'alphabetic';
        this.imageSmoothingEnabled = true;
        this._clip = null;
        this._fillStyle_text = '';
        this._strokeStyle_text = '';
    }

    /**
     * The color or style to use inside shapes. The default is #000 (black).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle
     */
    get fillStyle(): string {
        return this._fillStyle_text;
    }

    /** @example ctx.fillStyle = 'rgba(0, 25, 234, 0.6)'; */
    set fillStyle(val: string | G.ColorGradient) {
        if(val instanceof G.CanvasGradient) {
            this._fillColor = val;
        } else {
            this._fillColor = Context.colorStringToUint32(val);
            this._fillStyle_text = val;
        }
    }

    /**
     * The color or style to use for the lines around shapes. The default is #000 (black).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    get strokeStyle(): string {
        return this._strokeStyle_text;
    }

    /** @example ctx.strokeStyle = 'rgba(0, 25, 234, 0.6)'; */
    set strokeStyle(val: string) {
        this._strokeColor = Context.colorStringToUint32(val);
        this._strokeStyle_text = val;
    }

    /**
     * The thickness of lines in space units. When getting, it returns the current value (1.0 by default). When setting, zero, negative, `Infinity` and `NaN` values are ignored; otherwise the current value is set to the new value.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineWidth
     */
    get lineWidth() {
        return this._lineWidth;
    }

    /** @example ctx.lineWidth = 15; */
    set lineWidth(val) {
        this._lineWidth = val;
    }

    /**
     * The alpha value that is applied to shapes and images before they are drawn onto the canvas. The value is in the range from 0.0 (fully transparent) to 1.0 (fully opaque).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha
     */
    get globalAlpha(): number {
        return this._globalAlpha;
    }

    /** @example ctx.globalAlpha = 1; */
    set globalAlpha(val: number) {
        this._globalAlpha = clamp(val,0,1);
    }

    /**
     * The current text style being used when drawing text. This string uses the same syntax as the CSS font specifier
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font
     */
    get font(): string {
        return `${this._font.size} ${this._font.family}`;
    }

    /** @example ctx.font = '12 someFont'; */
    set font(val: string) {
        const n = val.trim().indexOf(' ');
        const font_size = parseInt(val.slice(0, n));
        const font_name = val.slice(n).trim();

        this._font.family = font_name;
        this._font.size   = font_size;
    }

    createLinearGradient(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
    ) {
        return new G.LinearGradient(x0,y0,x1,y1);
    }
    createRadialGradient(
        x0: number,
        y0: number,
    ) {
        return new G.RadialGradient(x0,y0);
    }


    /**
     * Saves the entire state of the canvas by pushing the current state onto a stack
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save
     */
    save() {
        this.transform.save();
    }

    /**
     * Adds a translation transformation by moving the canvas and its origin `x` horizontally and `y` vertically on the grid
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/translate
     */
    translate(
        /** X position */
        x: number,
        /** Y position */
        y: number,
    ) {
        this.transform.translate(x,y);
    }

    /**
     * Add a rotation to the transformation matrix. The angle argument represents a clockwise rotation angle and is expressed in radians
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     */
    rotate(
        /** Degrees of rotation (in radians) */
        angle: number
    ) {
        this.transform.rotate(angle);
    }

    /**
     * Adds a scaling transformation to the canvas units by `x` horizontally and by `y` vertically
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     */
    scale(
        /** Scale X amount */
        sx: number,
        /** Scale Y amount */
        sy: number,
    ) {
        this.transform.scale(sx,sy);
    }

    /**
     * Restores the most recently saved canvas state by popping the top entry in the drawing state stack. If there is no saved state, this method does nothing.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/restore
     */
    restore() {
        this.transform.restore();
    }


    /**
     * Draws a filled rectangle whose starting point is at the coordinates `(x, y)` with the specified width and height and whose style is determined by the fillStyle attribute.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillRect
     */
    fillRect(
        /** X position */
        x: number,
        /** Y position */
        y: number,
        /** Width */
        w: number,
        /** Height */
        h: number,
    ) {
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
     */
    clearRect(
        /** X position */
        x: number,
        /** Y position */
        y: number,
        /** Width */
        w: number,
        /** Height */
        h: number,
    ) {
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
     */
    strokeRect(
        /** X position */
        x: number,
        /** Y position */
        y: number,
        /** Width */
        w: number,
        /** Height */
        h: number,
    ) {
        for(let i=x; i<x+w; i++) {
            this.bitmap.setPixelRGBA(i, y, this._strokeColor);
            this.bitmap.setPixelRGBA(i, y+h, this._strokeColor);
        }
        for(let j=y; j<y+h; j++) {
            this.bitmap.setPixelRGBA(x, j, this._strokeColor);
            this.bitmap.setPixelRGBA(x+w, j, this._strokeColor);
        }
    }

    /** Set the background colour of a single pixel denoted by the `x` and `y` co-ordinates */
    fillPixel(
        /** The x axis of the pixel */
        x: number,
        /** The y axis of the pixel */
        y: number,
    ) {
        if(!this.pixelInsideClip(x,y)) {
            return;
        }

        const new_pixel = this.calculateRGBA(x, y);
        const old_pixel = this.bitmap.getPixelRGBA(x, y);
        const final_pixel = this.composite(x, y, old_pixel, new_pixel);

        this.bitmap.setPixelRGBA(x,y,final_pixel);
    }

    /** Paints a pixel which has an x axis position of `x` and a y axis position of `y` */
    strokePixel(
        /** The x axis of the pixel to stroke */
        x: number,
        /** The y axis of the pixel to stroke */
        y: number,
    ) {
        if(!this.pixelInsideClip(x,y)) {
            return;
        }

        const new_pixel = this.calculateRGBA_stroke(x, y);
        const old_pixel = this.bitmap.getPixelRGBA(x, y);
        const final_pixel = this.composite(x, y, old_pixel, new_pixel);

        this.bitmap.setPixelRGBA(x,y,final_pixel);
    }

    /** Fill Pixel With Color */
    fillPixelWithColor(
        /** The x axis of the pixel to fill */
        x: number,
        /** The y axis of the pixel to fill */
        y: number,
        col: number,
    ) {
        if(!this.pixelInsideClip(x,y)) {
            return;
        }

        const new_pixel = col;
        const old_pixel = this.bitmap.getPixelRGBA(x, y);
        const final_pixel = this.composite(x, y, old_pixel, new_pixel);

        this.bitmap.setPixelRGBA(x,y,final_pixel);
    }

    /** Composite */
    composite(
        /** Unused */
        _i: number,
        /** Unused */
        _j: number,
        old_pixel: number,
        new_pixel: number,
    ) {
        const old_rgba = getBytesBigEndian(old_pixel);
        const new_rgba = getBytesBigEndian(new_pixel);

        // convert to range of 0->1
        const A = (<RGBA>new_rgba.map((b) => b / 255));
        const B = (<RGBA>old_rgba.map((b) => b / 255));

        // multiply by global alpha
        A[3] = A[3] * this._globalAlpha;

        // do a standard composite (SRC_OVER) on RGB values
        function compos(
            ca: number,
            cb: number,
            aa: number,
            ab: number,
        ) {
            return (ca*aa + cb*ab * (1-aa)) / (aa+ab*(1-aa));
        }
        const C = (<RGB>A.slice(0, 3).map(
            (_comp, i) => compos(A[i], B[i], A[3], B[3])
        ));

        // convert back to 0->255 range
        const Cf = (<RGB>C.map((c) => c * 255));

        // convert back to int
        return fromBytesBigEndian(
            Cf[0], Cf[1], Cf[2], // R, G, B,
            Math.max(old_rgba[3], new_rgba[3]) // alpha
        );
    }

    /**
     * Calculate RGBA
     *
     * @ignore
     */
    calculateRGBA(
        /** X position */
        x: number,
        /** Y position */
        y: number,
    ) {
        if(this._fillColor instanceof G.CanvasGradient) {
            return this._fillColor.colorAt(x,y);
        }
        return this._fillColor;
    }

    /**
     * Calculate RGBA Stroke
     * @ignore
     */
    calculateRGBA_stroke(
        /** X position */
        _x: number,
        /** Y position */
        _y: number,
    ) {
        return this._strokeColor;
    }


    /**
     * Get Image Data
     *
     * @ignore
     */
    getImageData(
        /** X position */
        x: number,
        /** Y position */
        y: number,
        /** Width */
        w: number,
        /** Height */
        h: number,
    ) {
        return this.bitmap._copySubBitmap(x,y,w,h);
    }

    /**
     * Put Image Data
     *
     * @ignore
     */
    putImageData(
        /** Image ID */
        id: Bitmap,
        /** X position */
        x: number,
        /** Y position */
        y: number,
    ) {
        this.bitmap._pasteSubBitmap(id,x,y);
    }

    /**
     * Provides different ways to draw an image onto the canvas.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
     */
    drawImage(
        /** An instance of the {@link Bitmap} class to use for drawing */
        bitmap: Bitmap,
        /** The X coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context. */
        sx: number,
        /** The Y coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context. */
        sy: number,
        /** The width of the sub-rectangle of the source {@link Bitmap} to draw into the destination context. If not specified, the entire rectangle from the coordinates specified by `sx` and `sy` to the bottom-right corner of the image is used. */
        sw?: number,
        /** The height of the sub-rectangle of the source {@link Bitmap} to draw into the destination context. */
        sh?: number,
        /** The X coordinate in the destination canvas at which to place the top-left corner of the source {@link Bitmap} */
        dx?: number,
        /** The Y coordinate in the destination canvas at which to place the top-left corner of the source {@link Bitmap} */
        dy?: number,
        /** The width to draw the {@link Bitmap} in the destination canvas. This allows scaling of the drawn image. If not specified, the image is not scaled in width when drawn */
        dw?: number,
        /** The height to draw the {@link Bitmap} in the destination canvas. This allows scaling of the drawn image. If not specified, the image is not scaled in height when drawn */
        dh?: number,
    ) {
        // two argument form
        if(typeof sw === 'undefined') return this.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, sx, sy, bitmap.width, bitmap.height);
        // four argument form
        if(typeof dx === 'undefined') return this.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, sx, sy, sw, sh);

        const src_bounds = new Bounds(sx,sy,sx+sw,sy+sh);
        let pts = [
            new Point(dx,dy),
            new Point(dx+dw,dy),
            new Point(dx+dw,dy+dh),
            new Point(dx,dy+dh),
        ];
        pts = pts.map(pt => this.transform.transformPoint(pt));
        let dst_bounds = calc_min_bounds(pts);

        const bitmap_bounds = new Bounds(0,0, this.bitmap.width, this.bitmap.height);
        dst_bounds = dst_bounds.intersect(bitmap_bounds);

        const inv = this.transform.cloneTransform();
        inv.invert();

        //map dx to dx+dw  from sx to sx+sw
        function remap(
            n: number,
            a1: number,
            a2: number,
            b1: number,
            b2: number,
        ) {
            const t = (n-a1)/(a2-a1);
            return t*(b2-b1) + b1;
        }

        for(let i=dst_bounds.x1; i<dst_bounds.x2; i++) {
            for(let j=dst_bounds.y1; j<dst_bounds.y2; j++) {
                const dst_pt = new Point(i,j);
                let src_pt = inv.transformPoint(dst_pt).round();
                src_pt = new Point(
                    remap(src_pt.x, dx,dx+dw, sx,sx+sw),
                    remap(src_pt.y, dy,dy+dh, sy,sy+sh)
                );
                if(src_bounds.contains(src_pt)) {
                    const rgba = bitmap.getPixelRGBA(src_pt.x, src_pt.y);
                    this.bitmap.setPixelRGBA(dst_pt.x, dst_pt.y, rgba);
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
     */
    beginPath() {
        this.path = [];
        this._closed = false;
    }

    /**
     * Moves the starting point of a new sub-path to the (x, y) coordinates.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/moveTo
    * */
    moveTo(
        /** The x axis of the point. */
        x: number,
        /** The y axis of the point. */
        y: number,
    ) {
        return this._moveTo(new Point(x, y));
    }

    /**
     * Moves the starting point of a new sub-path to the (x, y) coordinates.
     *
     * @example
     * //All of the following are valid:
     * this._moveTo({x: 20, y: 40})
     * this._moveTo(new Point(20, 40))
    * */
    _moveTo(
        pt: Point,
    ) {
        pt = this.transform.transformPoint(pt);
        this.pathStart = pt;
        this.path.push([PATH_COMMAND.MOVE, pt]);
    }

    /**
     * Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo
     */
    lineTo(
        /** The x axis of the coordinate for the end of the line. */
        x: number,
        /** The y axis of the coordinate for the end of the line. */
        y: number,
    ) {
        return this._lineTo(new Point(x, y));
    }

    /** Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it). */
    _lineTo(
        /** A point object to draw a line to from the current set of co-ordinates */
        pt: Point
    ) {
        this.path.push([PATH_COMMAND.LINE, this.transform.transformPoint(pt)]);
    }

    /**
     * Adds a quadratic Bézier curve to the path. It requires two points.
     * The first point is a control point and the second one is the end point.
     * The starting point is the last point in the current path,
     * which can be changed using moveTo() before creating the quadratic Bézier curve.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/quadraticCurveTo
     */
    quadraticCurveTo(
        /** The x axis of the coordinate for the control point. */
        cp1x: number,
        /** The y axis of the coordinate for the control point. */
        cp1y: number,
        /** The x axis of the coordinate for the end point. */
        x: number,
        /** The y axis of the coordinate for the end point. */
        y: number,
    ) {
        const cp1 = this.transform.transformPoint(new Point(cp1x, cp1y));
        const pt  = this.transform.transformPoint(new Point(x, y));
        this.path.push([PATH_COMMAND.QUADRATIC_CURVE, cp1, pt]);
    }

    /**
     * Adds a cubic Bézier curve to the path. It requires three points. The first two points are control points and the third one is the end point. The starting point is the last point in the current path, which can be changed using moveTo() before creating the Bézier curve.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/bezierCurveTo
     */
    bezierCurveTo(
        /** The x axis of the coordinate for the first control point. */
        cp1x: number,
        /** The y axis of the coordinate for first control point. */
        cp1y: number,
        /** The x axis of the coordinate for the second control point. */
        cp2x: number,
        /** The y axis of the coordinate for the second control point. */
        cp2y: number,
        /** The x axis of the coordinate for the end point. */
        x: number,
        /** The y axis of the coordinate for the end point. */
        y: number,
    ) {
        this._bezierCurveTo(new Point(cp1x, cp1y), new Point(cp2x, cp2y), new Point(x, y));
    }

    /** Bezier Curve To */
    _bezierCurveTo(
        /** Curve point 1 */
        cp1: Point,
        /** Curve point 2 */
        cp2: Point,
        pt: Point,
    ) {
        cp1 = this.transform.transformPoint(cp1);
        cp2 = this.transform.transformPoint(cp2);
        pt  = this.transform.transformPoint(pt);
        this.path.push([PATH_COMMAND.BEZIER_CURVE, cp1, cp2, pt]);
    }

    /**
     * Adds an arc to the path which is centered at (x, y) position with radius r starting at startAngle and ending at endAngle going in the given direction by anticlockwise (defaulting to clockwise).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
     */
    arc(
        /** The x coordinate of the arc's center */
        x: number,
        /** The y coordinate of the arc's center */
        y: number,
        /** The arc's radius */
        rad: number,
        /** The angle at which the arc starts, measured clockwise from the positive x axis and expressed in radians */
        start: number,
        /** The angle at which the arc ends, measured clockwise from the positive x axis and expressed in radians */
        end: number,
        /** A boolean which, if true, causes the arc to be drawn anticlockwise between the two angles. */
        anticlockwise: boolean,
    ) {
        function calcPoint(angle: number) {
            const px = x + Math.cos(angle)*rad;
            const py = y + Math.sin(angle)*rad;
            return new Point(px, py);
        }

        if(start > end) end += Math.PI*2;

        const step = Math.PI / 16;
        if (anticlockwise) {
            const temp = end;
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
     */
    arcTo() {
        throw new Error('arcTo not yet supported');
    }

    /**
     * Draws a rectangle with the upper left corner at the specified (x, y)
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rect
     */
    rect(
        /** The x coordinate of the rectangle */
        x: number,
        /** The y coordinate of the rectangle */
        y: number,
        /** The width of the rectangle */
        width: number,
        /** The height of the rectangle */
        height: number,
    ) {
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
     */
    ellipse() {
        throw new Error('ellipse not yet supported');
    }

    /**
     * Turns the path currently being built into the current clipping path.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip
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
     */
    measureText(string: string) {
        return TEXT.measureText(this,string);
    }

    /**
     * Causes the point of the pen to move back to the start of the current sub-path. It tries to add a straight line (but does not actually draw it) from the current point to the start. If the shape has already been closed or has only one point, this function does nothing.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/closePath
     */
    closePath() {
        if(!this._closed) {
            this.path.push([PATH_COMMAND.LINE, this.pathStart]);
            this._closed = true;
        }
    }


    /**
     * Strokes the current or given path with the current stroke style
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/stroke
     */
    stroke() {
        const flat_path = flatten_path(this.path);
        const stroke_path = path_to_stroked_path(flat_path,this.lineWidth/2);
        const lines = pathToLines(stroke_path);
        const old_fillStyle = this.fillStyle;
        this.fillStyle = this.strokeStyle;
        this.imageSmoothingEnabled ? this.fill_aa(lines) : this.fill_no_aa(lines);
        this.fillStyle = old_fillStyle;

        if(this.debug) {
            this.save();
            const old_ss = this.strokeStyle;
            const old_lw = this.lineWidth;
            this.strokeStyle = 'red';
            this.lineWidth = 1;
            console.log('path is',this.path);
            pathToLines(this.path).forEach((line) => this.drawLine(line));
            console.log('flat path is',flat_path);
            pathToLines(flat_path).forEach((line) => this.drawLine(line));
            console.log('stroke path is',stroke_path);
            pathToLines(stroke_path).forEach(line => this.drawLine(line));
            console.log('final lines are',lines);
            this.strokeStyle = old_ss;
            this.lineWidth = old_lw;
            this.restore();
        }
    }

    /**
     * Draw a line using the correct anti-aliased,
     * or non-anti-aliased line drawing function based on the value of {@link imageSmoothingEnabled}
     *
     * @example
     * //All of the following are valid:
     * ctx.drawLine({start: {x: 20, y:42}, end: {x: 20, y:90}})
     * ctx.drawLine(new Line(new Point(20, 42), new Point(20, 90)))
     * ctx.drawLine(new Line(20, 42, 20, 90))
     */
    drawLine(
        /** A set of co-ordinates representing the start and end of the line. You can also pass a plain js object if you wish */
        line: Line,
    ) {
        if(line.is_invalid()) return console.error('cannot draw line',line);
        this.imageSmoothingEnabled?this.drawLine_aa(line):this.drawLine_no_aa(line);
    }

    /**
     *
     * Draw a line without anti-aliasing using Bresenham's algorithm
     *
     * @example
     * //All of the following are valid:
     * ctx.drawLine({start: {x: 20, y:42}, end: {x: 20, y:90}})
     * ctx.drawLine(new Line(new Point(20, 42), new Point(20, 90)))
     * ctx.drawLine(new Line(20, 42, 20, 90))
     */
    drawLine_no_aa(
        /** A set of co-ordinates representing the start and end of the line. You can also pass a plain js object if you wish */
        line: Line,
    ) {
        // Bresenham's from Rosetta Code
        // http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
        let x0 = Math.floor(line.start.x);
        let y0 = Math.floor(line.start.y);
        const x1 = Math.floor(line.end.x);
        const y1 = Math.floor(line.end.y);
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        const dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = (dx > dy ? dx : -dy) / 2;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            this.strokePixel(x0,y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx }
            if (e2 < dy) { err += dx; y0 += sy }
        }
    }

    /**
     * Draw Line Anti-aliased
     *
     * Draw anti-aliased line using Bresenham's algorithm
     *
     * @see http://members.chello.at/~easyfilter/bresenham.html
     *
     * @example
     * //All of the following are valid:
     * ctx.drawLine({start: {x: 20, y:42}, end: {x: 20, y:90}})
     * ctx.drawLine(new Line(new Point(20, 42), new Point(20, 90)))
     * ctx.drawLine(new Line(20, 42, 20, 90))
     */
    drawLine_aa(
        /** A set of co-ordinates representing the start and end of the line. You can also pass a plain js object if you wish */
        line: Line,
    ) {
        let width = this._lineWidth;
        let x0 = Math.floor(line.start.x);
        let y0 = Math.floor(line.start.y);
        const x1 = Math.floor(line.end.x);
        const y1 = Math.floor(line.end.y);
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        const dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;

        let err = dx - dy, e2: number, x2: number, y2: number;
        const ed = dx + dy === 0 ? 1 : Math.sqrt(dx * dx + dy * dy);
        const rgb = and(this._strokeColor, 0xFFFFFF00);
        const a1 = and(this._strokeColor,0x000000FF);
        for (width = (width+1)/2; ; ) {
            const alpha = ~~Math.max(0, 255 * (Math.abs(err - dx + dy) / ed - width + 1));
            const a2 = 255-alpha;
            const color = or(rgb,(a1*a2)/255);
            this.fillPixelWithColor(x0,y0,color);
            e2 = err; x2 = x0;
            if (2*e2 >= -dx) {
                for (e2 += dy, y2 = y0; e2 < ed*width && (y1 !== y2 || dx > dy); e2 += dx) {
                    const alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
                    const a2 = 255-alpha;
                    const color = or(rgb,(a1*a2)/255);
                    this.fillPixelWithColor(x0, y2 += sy, color);
                }
                if (x0 === x1) break;
                e2 = err; err -= dy; x0 += sx;
            }
            if (2*e2 <= dy) {
                for (e2 = dx-e2; e2 < ed*width && (x1 !== x2 || dx < dy); e2 += dy) {
                    const alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
                    const a2 = 255-alpha;
                    const color = or(rgb,(a1*a2)/255);
                    this.fillPixelWithColor(x2 += sx, y0, color);
                }
                if (y0 === y1) break;
                err += dx; y0 += sy;
            }
        }
    }

    /**
     * Fills the current or given path with the current fill style.
     * Uses {@link fill_aa} and {@link fill_no_aa} depending on the the value of {@link imageSmoothingEnabled}
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fill
     */
    fill() {
        if(!this._closed) this.closePath();
        const lines = pathToLines(this.path);
        this.imageSmoothingEnabled ? this.fill_aa(lines) : this.fill_no_aa(lines);
    }

    /** Fill Anti-aliased */
    fill_aa(
        lines: Line[]
    ) {
        const fillColor = typeof this._fillColor === 'number'
            ? this._fillColor
            : this._fillColor.colorAt(0,0);

        //get just the color part
        const rgb = and(fillColor, 0xFFFFFF00);
        const alpha = and(fillColor, 0xFF);
        const bounds = calcMinimumBounds(lines);

        const startY = Math.min(bounds.y2 - 1, this.bitmap.height);
        const endY = Math.max(bounds.y, 0);

        for(let j=startY; j>=endY; j--) {
            const intArr = calcSortedIntersections(lines, j);
            //fill between each pair of intersections
            // if(intArr.length %2 !==0) console.log("warning. uneven number of intersections");
            for(let i=0; i<intArr.length; i+=2) {
                const fStartF = fract(intArr[i]);
                const fEndF = fract(intArr[i + 1]);
                const start = Math.floor(intArr[i]);
                const end = Math.floor(intArr[i + 1]);
                for(let ii=start; ii<=end; ii++) {
                    if(ii === start) {
                        //first
                        const int = or(rgb,(1-fStartF)*alpha);
                        this.fillPixelWithColor(ii,j, int);
                        continue;
                    }
                    if(ii === end) {
                        //last
                        const int = or(rgb,fEndF*alpha);
                        this.fillPixelWithColor(ii,j, int);
                        continue;
                    }
                    //console.log("filling",ii,j);
                    this.fillPixelWithColor(ii,j, fillColor);
                }
            }
        }
    }

    /** Fill No Anti-aliased */
    fill_no_aa(
        lines: Line[]
    ) {
        /* const fillColor = typeof this._fillColor === 'number'
            ? this._fillColor
            : this._fillColor.colorAt(0,0); */
        //get just the color part
        //const rgb = and(fillColor, 0xFFFFFF00);
        const bounds = calcMinimumBounds(lines);
        for(let j=bounds.y2-1; j>=bounds.y; j--) {
            const intArr = calcSortedIntersections(lines, j);
            //fill between each pair of intersections
            for(let i=0; i<intArr.length; i+=2) {
                const start = Math.floor(intArr[i]);
                const end = Math.floor(intArr[i + 1]);
                for(let ii=start; ii<=end; ii++) {
                    if(ii === start) {
                        //first
                        this.fillPixel(ii,j);
                        continue;
                    }
                    if(ii === end) {
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
     */
    pixelInsideClip(
        x: number,
        y: number,
    ) {
        if(!this._clip) return true;
        //turn into a list of lines
        // calculate intersections with a horizontal line at j
        const intArr = calcSortedIntersections(this._clip, y);
        // find the intersections to the left of i (where x < i)
        const left = intArr.filter((inter) => inter < x);
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
     */
    fillText(
        /** A string specifying the text string to render into the context. The text is rendered using the settings specified by {@link font}. */
        text: string,
        /** The x -coordinate of the point at which to begin drawing the text, in pixels. */
        x: number,
        /** The y-coordinate of the point at which to begin drawing the text, in pixels. */
        y: number,
    ) {
        TEXT.processTextPath(this, text, x,y, true, this.textAlign, this.textBaseline);
    }

    /** Draws the outlines of the characters of a specified text string at the given (x, y) position. */
    strokeText(
        /** The text to draw using the current {@link font} values. */
        text: string,
        /** The x axis of the coordinate for the text starting point. */
        x: number,
        /** The y axis of the coordinate for the text starting point. */
        y: number,
    ) { TEXT.processTextPath(this, text, x,y, false, this.textAlign, this.textBaseline)  }


    /**
     * Color String To Uint32
     *
     * Convert a color string to Uint32 notation
     *
     * @example
     * var uInt32 = colorStringToUint32('#FF00FF');
     * console.log(uInt32); // Prints 4278255615
     */
    static colorStringToUint32(
        /** The color string to convert */
        str: string,
    ): number {
        if(!str) return 0x000000;
        if(str.indexOf('#')===0) {
            if(str.length===4) {
                //Color format is #RGB
                //Will get 255 for the alpha channel
                const redNibble = parseInt(str[1], 16);
                const red = (redNibble << 4) | redNibble;
                const greenNibble = parseInt(str[2], 16);
                const green = (greenNibble << 4) | greenNibble;
                const blueNibble = parseInt(str[3], 16);
                const blue = (blueNibble << 4) | blueNibble;

                let int = toUint32(red << 16 | green << 8 | blue);
                int = shiftLeft(int,8);
                return or(int,0xff);
            } else if(str.length===5) {
                //Color format is #RGBA
                const redNibble = parseInt(str[1], 16);
                const red = (redNibble << 4) | redNibble;
                const greenNibble = parseInt(str[2], 16);
                const green = (greenNibble << 4) | greenNibble;
                const blueNibble = parseInt(str[3], 16);
                const blue = (blueNibble << 4) | blueNibble;
                const alphaNibble = parseInt(str[4], 16);
                const alpha = (alphaNibble << 4) | alphaNibble;

                let int = toUint32(red << 16 | green << 8 | blue);
                int = shiftLeft(int,8);
                return or(int,alpha);
            } else if(str.length===7) {
                //Color format is #RRGGBB
                //Will get 255 for the alpha channel
                let int = toUint32(parseInt(str.substring(1),16));
                int = shiftLeft(int,8);
                return or(int,0xff);
            } else if(str.length===9) {
                //Color format is #RRGGBBAA
                return toUint32(parseInt(str.substring(1),16));
            }
        }
        if(str.indexOf('rgba')===0) {
            const parts = str.trim().substring(4).replace('(','').replace(')','').split(',');
            return fromBytesBigEndian(
                parseInt(parts[0]),
                parseInt(parts[1]),
                parseInt(parts[2]),
                Math.floor(parseFloat(parts[3])*255));
        }
        if(str.indexOf('rgb')===0) {
            const parts = str.trim().substring(3).replace('(','').replace(')','').split(',');
            return fromBytesBigEndian(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 255);
        }
        if(hasOwnProperty.call(NAMED_COLORS,str)) {
            return NAMED_COLORS[str];
        }
        throw new Error('unknown style format: ' + str );
    }

}

/**
 * Returns the decimal portion of a given floating point number
 *
 * @example
 * console.log(fract(12.35))
 * // Prints out 0.34999999999999964
 */
function fract(
    /** The number to return the decimal fraction of */
    v: number,
) {  return v-Math.floor(v)   }

/**
 * Convert a path of points to an array of lines
 */
function pathToLines(
    /** List of sub-paths */
    path: PathCmd[]
): Line[] {
    const lines: Line[] = [];
    let curr: Point = null;

    path.forEach(function(cmd) {
        if(cmd[0] === PATH_COMMAND.MOVE) {
            curr = cmd[1];
        }
        if(cmd[0] === PATH_COMMAND.LINE) {
            const pt = cmd[1];
            lines.push(new Line(curr, pt));
            curr = pt;
        }
        if(cmd[0] === PATH_COMMAND.QUADRATIC_CURVE) {
            const pts: PointIshTri = [curr, cmd[1], cmd[2]];
            for(let t=0; t<1; t+=0.1) {
                const pt = calcQuadraticAtT(pts,t);
                lines.push(new Line(curr, pt));
                curr = pt;
            }
        }
        if(cmd[0] === PATH_COMMAND.BEZIER_CURVE) {
            const pts: PointIshQuad = [curr, cmd[1], cmd[2], cmd[3]];
            bezierToLines(pts,10).forEach(pt => {
                const ptP = new Point(pt.x,pt.y);
                lines.push(new Line(curr,ptP));
                curr = ptP;
            });
            curr = cmd[3]
        }
    });
    return lines;
}

function flatten_path(
    A: PathCmd[]
) {
    const B: PathCmd[] = [];
    let curr: Point = null;
    A.forEach((cmd): void => {
        if(cmd[0] === PATH_COMMAND.MOVE) {
            curr = cmd[1];
            // console.log("move",curr)
            B.push([PATH_COMMAND.MOVE, new Point(curr.x,curr.y)]);
            return;
        }
        if(cmd[0] === PATH_COMMAND.LINE) {
            curr = cmd[1];
            // console.log("line",curr)
            B.push([PATH_COMMAND.LINE, new Point(curr.x,curr.y)]);
            return;
        }
        if(cmd[0] === PATH_COMMAND.BEZIER_CURVE) {
            const pts: PointIshQuad = [curr, cmd[1], cmd[2], cmd[3]];
            const pts2 = bezierToLines(pts,10);
            for(let i=1; i<pts2.length; i+=2) {
                B.push([PATH_COMMAND.LINE,new Point(pts2[i].x,pts2[i].y)]);
            }
            curr = cmd[3]
        }
    });
    return B;
}

function path_to_stroked_path(
    path: PathCmd[],
    w: number,
) {
    let curr: Point = null;
    const outside = [];
    const inside = [];
    let path_start: Point;
    let prev_cmd: PathCmd = null;

    function project(A: Point,B: Point,scale: number) {
        if(A.equals(B)) console.log('same points!',A,B);
        const delta_unit = A.subtract(B).unit();
        const C_unit = delta_unit.rotate(toRad(90));
        const D_unit = delta_unit.rotate(toRad(-90));
        // console.log(C_unit, D_unit)
        return [
            C_unit.scale(scale).add(B),
            D_unit.scale(scale).add(B)
        ];
    }

    function normalize_angle(turn: number) {
        if(turn < -Math.PI) return turn + Math.PI*2;
        if(turn > +Math.PI) return turn - Math.PI*2;
        return turn;
    }

    /* function average(a: Point, b: Point) {
        return a.add(b).divide(2);
    } */

    path.forEach(function(cmd,i) {
        // console.log("converting",cmd)
        if(cmd[0] === PATH_COMMAND.MOVE) {
            curr = cmd[1];
            prev_cmd = cmd;
            path_start = curr.clone();
            outside.push([PATH_COMMAND.MOVE,path_start.clone()]);
        }

        /* function first(arr) {
            return arr[0];
        }
        function last(arr) {
            return arr[arr.length-1];
        } */

        if(cmd[0] === PATH_COMMAND.LINE) {
            const A = curr;
            const B = cmd[1];
            if(A.equals(B)) return console.log("can't project the same paths",i,cmd,A,B);
            // console.log(i,"====",B)
            const next = path[i+1];
            //if first
            if(prev_cmd[0] === PATH_COMMAND.MOVE) {
                // console.log("doing the first")
                const pts1 = project(B,A,w);
                outside.push([PATH_COMMAND.LINE, pts1[1]]);
                inside.push([PATH_COMMAND.LINE,pts1[0]]);
            }
            prev_cmd = cmd;
            // if last
            if(!next) {
                // console.log("doing last")
                const pts1 = project(A,B,w);
                outside.push([PATH_COMMAND.LINE, pts1[0]]);
                inside.push([PATH_COMMAND.LINE, pts1[1]]);
                return;
            }
            const C = next[1];
            if(C.equals(B)) return console.log("can't project the same paths",i,cmd,A,B);
            // console.log(i,A,B,C)
            // console.log("next",next)
            const BA = A.subtract(B);
            const BC = C.subtract(B);
            // console.log(i,'B',B,'BA',BA,'BC',BC)
            const BA_angle = Math.atan2(BA.y,BA.x);
            const BC_angle = Math.atan2(BC.y,BC.x);
            // console.log("angles",toDeg(turn))
            const turn = normalize_angle(BC_angle-BA_angle);

            const pts1 = project(A,B,w);
            const pts2 = project(C,B,w);
            // console.log(i,'B',pts1)
            // console.log(i,'B',pts2)
            if(turn < 0) {
                //if turning right
                //outside is normal
                outside.push([PATH_COMMAND.LINE, pts1[0]]);
                outside.push([PATH_COMMAND.LINE, pts2[1]]);
                //adjust inside
                const h = w/Math.cos((Math.PI+turn)/2);
                const C_unit = A.subtract(B).unit().rotate(turn/2).scale(h).add(B);
                inside.push([PATH_COMMAND.LINE,C_unit]);

            } else {
                //if turning left
                //adjust outside
                const h = w/Math.cos(-(Math.PI-turn)/2);
                const C_unit = C.subtract(B).unit().rotate(-turn/2).scale(h).add(B);
                outside.push([PATH_COMMAND.LINE,C_unit]);
                //inside is normal
                inside.push([PATH_COMMAND.LINE, pts1[1]]);
                inside.push([PATH_COMMAND.LINE, pts2[0]]);
            }
            curr = B;
        }
    });

    inside.reverse();
    const final = [].concat(outside).concat(inside);
    // console.log("path_to_stroked_path output")
    // console.log('outside',outside)
    // console.log('inside',inside)
    final.push([PATH_COMMAND.LINE, path_start]);
    // console.log("final")
    // console.log(final)
    return final;
}

/**
 * Calculate Quadratic
 *
 * @ignore
 */
function calcQuadraticAtT(
    p: PointIshTri,
    t: number,
) {
    const x = (1 - t) * (1 - t) * p[0].x + 2 * (1 - t) * t * p[1].x + t * t * p[2].x;
    const y = (1 - t) * (1 - t) * p[0].y + 2 * (1 - t) * t * p[1].y + t * t * p[2].y;
    return new Point(x, y);
}

/** Calculate Bezier at T */
/* function calcBezierAtT(
    p: PointIshQuad,
    t: number,
) {
    const x = (1 - t) * (1 - t) * (1 - t) * p[0].x + 3 * (1 - t) * (1 - t) * t * p[1].x + 3 * (1 - t) * t * t * p[2].x + t * t * t * p[3].x;
    const y = (1 - t) * (1 - t) * (1 - t) * p[0].y + 3 * (1 - t) * (1 - t) * t * p[1].y + 3 * (1 - t) * t * t * p[2].y + t * t * t * p[3].y;
    return new Point(x, y);
} */

function bezierToLines(
    curve: PointIshQuad,
    THRESHOLD: number,
): [PointIsh,PointIsh] {
    function recurse(curve: PointIshQuad) {
        if(flatness(curve) < THRESHOLD) return [curve[0],curve[3]];
        const split = splitCurveAtT(curve,0.5,false);
        return recurse(split[0]).concat(recurse(split[1]));
    }
    return recurse(curve);
}

function splitCurveAtT(
    p: PointIshQuad,
    t: number,
    _debug: unknown,
): [PointIshQuad,PointIshQuad] {
    const p1 = p[0];
    const p2 = p[1];
    const p3 = p[2];
    const p4 = p[3];

    const p12 = midpoint(p1,p2,t);
    const p23 = midpoint(p2,p3,t);
    const p34 = midpoint(p4,p3,t);


    const p123 = midpoint(p12,p23,t);
    const p234 = midpoint(p23, p34,t);
    const p1234 = { x: (p234.x-p123.x)*t+p123.x, y: (p234.y-p123.y)*t+p123.y};

    return [[p1, p12, p123, p1234],[p1234,p234,p34,p4]];
}

function flatness(
    curve: PointIshQuad
) {
    const pointA = curve[0];
    const controlPointA = curve[1];
    const controlPointB = curve[2];
    const pointB = curve[3];
    let ux = Math.pow( 3 * controlPointA.x - 2 * pointA.x - pointB.x, 2 );
    let uy = Math.pow( 3 * controlPointA.y - 2 * pointA.y - pointB.y, 2 );
    const vx = Math.pow( 3 * controlPointB.x - 2 * pointB.x - pointA.x, 2 );
    const vy = Math.pow( 3 * controlPointB.y - 2 * pointB.y - pointA.y, 2 );
    if( ux < vx )
        ux = vx;
    if( uy < vy )
        uy = vy;
    return ux + uy;
}

function midpoint(
    p1: PointIsh,
    p2: PointIsh,
    t: number
) {
    return { x: (p2.x-p1.x)*t+p1.x, y: (p2.y-p1.y)*t+p1.y};
}

type MinimumBounds = {
    x: number,
    y: number,
    x2: number,
    y2: number,
}

/**
 * Calculate Minimum Bounds
 *
 * @ignore
 */
function calcMinimumBounds(
    lines: Line[],
): MinimumBounds {
    const bounds = {
        x: Number.MAX_VALUE,
        y: Number.MAX_VALUE,
        x2: Number.MIN_VALUE,
        y2: Number.MIN_VALUE
    };

    function checkPoint(pt: PointIsh) {
        bounds.x  = Math.min(bounds.x,pt.x);
        bounds.y  = Math.min(bounds.y,pt.y);
        bounds.x2 = Math.max(bounds.x2,pt.x);
        bounds.y2 = Math.max(bounds.y2,pt.y);
    }
    lines.forEach(function(line) {
        checkPoint(line.start);
        checkPoint(line.end);
    });
    return bounds;
}


/**
 * Calculate Sorted Intersections
 *
 * Adopted from http://alienryderflex.com/polygon
 *
 * @see http://alienryderflex.com/polygon
 *
 * @ignore
 */
function calcSortedIntersections(
    /** An {@link Array} of Line */
    lines: Line[],
    y: number,
) {
    const xList: number[] = [];
    for(let i=0; i<lines.length; i++) {
        const A = lines[i].start;
        const B = lines[i].end;
        if(A.y<y && B.y>=y || B.y<y && A.y>=y) {
            const xVal = A.x + (y - A.y) / (B.y - A.y) * (B.x - A.x);
            xList.push(xVal);
        }
    }
    return xList.sort(function(a,b) {  return a-b });
}






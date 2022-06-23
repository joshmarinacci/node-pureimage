import { Line } from './line.js';
import { Point } from './point.js';
import * as trans from './transform.js';
import * as G from './gradients.js';
import { Bitmap } from './bitmap.js';

/**
 * Enum for path commands (used for encoding and decoding lines, curves etc. to and from a path)
 * @enum {string}
 */
type PATH_COMMAND = 'm' | 'l' | 'q' | 'b';
// enum PATH_COMMAND {
//     MOVE = 'm',
//     LINE = 'l',
//     QUADRATIC_CURVE = 'q',
//     BEZIER_CURVE = 'b',
// }
type Font = {
    /** The font family to set */
    family: string;
    /** An integer representing the font size to use */
    size: number;
};
type TextAlign = 'start' | 'end' | 'left' | 'center' | 'right';
type TextBaseline = 'top' | 'middle' | 'alphabetic' | 'bottom';
/**
 * Used for drawing rectangles, text, images and other objects onto the canvas element. It provides the 2D rendering context for a drawing surface.
 *
 * It has the same API as [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) from the HTML5 canvas spec
 *
 * @class Context
 */
export class Context {
    /**
     * An instance of the {@link Bitmap} class. Used for direct pixel manipulation(for example setting pixel colours)
     */
    bitmap: Bitmap;

    /**
     *  A 32-bit unsigned integer (uint32) number representing the fill color of the 2D drawing context
     */
    private _fillColor: number;

    private _strokeColor: number;

    private _lineWidth: number;

    private _globalAlpha: number;

    transform: trans.Transform;

    /**
     * Plain js object wrapping the font name and size
     */
    private _font: Font;

    /** Horizontal text alignment, one of start, end, left, center, right. start is the default */
    textAlign: TextAlign;

    /** @type {string} vertical text alignment, relative to the baseline. one of top, middle, alphabetic(default) and bottom. */
    textBaseline: TextBaseline;

    /**
     * Enable or disable image smoothing(anti-aliasing)
     */
    imageSmoothingEnabled: boolean;

    private _clip?: any | null;

    private _fillStyle_text: string;

    private _strokeStyle_text: string;

    private path?: (PATH_COMMAND | Point)[];
    private pathStart: Point;

    private _closed?: boolean;
    /**
     * Creates a new pure image Context
     *
     * @param {Bitmap} bitmap An instance of the {@link Bitmap} class
     * @memberof Context
     */
    constructor(bitmap: Bitmap);

    /**
     * The color or style to use inside shapes. The default is #000 (black).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle
     */
    get fillStyle(): string;

    /**
     * @param {string} val
     * @example ctx.fillStyle = 'rgba(0, 25, 234, 0.6)';
     */
    set fillStyle(val: string);

    /**
     * The color or style to use for the lines around shapes. The default is #000 (black).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    get strokeStyle(): string;

    /**
     * @param {number} val
     * @example ctx.strokeStyle = 'rgba(0, 25, 234, 0.6)';
     */
    set strokeStyle(val: string);

    /**
     * The thickness of lines in space units. When getting, it returns the current value (1.0 by default). When setting, zero, negative, `Infinity` and `NaN` values are ignored; otherwise the current value is set to the new value.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineWidth
     */
    get lineWidth(): number;

    /**
     * @param {number} val
     * @example ctx.lineWidth = 15;
     */
    set lineWidth(val: number);

    /**
     * The alpha value that is applied to shapes and images before they are drawn onto the canvas. The value is in the range from 0.0 (fully transparent) to 1.0 (fully opaque).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha
     */
    get globalAlpha(): number;

    /**
     * @param {number} val
     * @example ctx.globalAlpha = 1;
     */
    set globalAlpha(val: number);

    /**
     * The current text style being used when drawing text. This string uses the same syntax as the CSS font specifier
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font
     */
    get font(): string;

    /**
     * @param {string} font
     * @example ctx.globalAlpha = 1;
     */
    set font(val: string);

    createLinearGradient(
        x0: number,
        y0: number,
        x1: number,
        y1: number
    ): G.LinearGradient;
    createRadialGradient(x0: number, y0: number): G.LinearGradient;

    /**
     * Saves the entire state of the canvas by pushing the current state onto a stack
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save
     *
     * @memberof Context
     */
    save(): void;

    /**
     * Adds a translation transformation by moving the canvas and its origin `x` horizontally and `y` vertically on the grid
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/translate
     *
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @memberof Context
     */
    translate(x: number, y: number): void;
    /**
     * Add a rotation to the transformation matrix. The angle argument represents a clockwise rotation angle and is expressed in adians
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     *
     * @param {number} angle Degrees of rotation (in radians)
     *
     * @memberof Context
     */
    rotate(angle: number): void;

    /**
     * Adds a scaling transformation to the canvas units by `x` horizontally and by `y` vertically
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
     *
     * @param {number} sx Scale X amount
     * @param {number} sy Scale Y amount
     *
     * @memberof Context
     */
    scale(sx: number, sy: number): void;

    /**
     * Restores the most recently saved canvas state by popping the top entry in the drawing state stack. If there is no saved state, this method does nothing.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/restore
     *
     * @memberof Context
     */
    restore(): void;

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
     * @memberof Context
     */
    fillRect(x: number, y: number, w: number, h: number): void;

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
     * @memberof Context
     */
    clearRect(x: number, y: number, w: number, h: number): void;

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
     * @memberof Context
     */
    strokeRect(x: number, y: number, w: number, h: number): void;

    /**
     * Set the background colour of a single pixel denoted by the `x` and `y` co-ordinates
     *
     * @param {number} x The x axis of the pixel
     * @param {number} y The y axis of the pixel
     *
     * @memberof Context
     */
    fillPixel(x: number, y: number): void;

    /**
     * Paints a pixel which has an x axis position of `x` and a y axis position of `y`
     *
     * @param {number} x The x axis of the pixel to stroke
     * @param {number} y The y axis of the pixel to stroke
     *
     * @memberof Context
     */
    strokePixel(x: number, y: number): void;

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
    fillPixelWithColor(x: number, y: number, col: number): void;

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
    composite(i: number, j: number, old_pixel: number, new_pixel: number): void;

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
    calculateRGBA(x: number, y: number): number;

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
    calculateRGBA_stroke(x: number, y: number): number;

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
    getImageData(x: number, y: number, w: number, h: number): Bitmap;

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
    putImageData(imageData: Bitmap, x: number, y: number): void;

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
    drawImage(
        bitmap: Bitmap,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number
    ): void;
    drawImage(bitmap: Bitmap, dx: number, dy: number): void;
    drawImage(bitmap: Bitmap, dx: number, dy: number, dWidth: number, dHeight: number): void;

    /**
     * Starts a new path by emptying the list of sub-paths. Call this method when you want to create a new path.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/beginPath
     *
     * @returns {void}
     *
     * @memberof Context
     */
    beginPath(): void;

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
    moveTo(x: number, y: number): void;

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
    private _moveTo(pt: Point): void;

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
    lineTo(x: number, y: number): void;

    /**
     * Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it).
     *
     * @param {Point} pt A point object to draw a line to from the current set of co-ordinates
     *
     * @returns {void}
     *
     * @memberof Context
     */
    private _lineTo(pt: Point): void;

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
    quadraticCurveTo(cp1x: number, cp1y: number, x: number, y: number): void;

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
    bezierCurveTo(
        cp1x: number,
        cp1y: number,
        cp2x: number,
        cp2y: number,
        x: number,
        y: number
    ): void;

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
    private _bezierCurveTo(cp1: number, cp2: number, pt: Point): void;

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
    arc(
        x: number,
        y: number,
        rad: number,
        start: number,
        end: number,
        anticlockwise: boolean
    ): void;

    /**
     * Arc To
     *
     * @ignore
     *
     * @throws {Error} Method is not yet implemented
     *
     * @memberof Context
     */
    arcTo(): void;

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
    rect(x: number, y: number, width: number, height: number): void;

    /**
     * Ellipse
     *
     * @ignore
     *
     * @throws {Error} Method is not yet implemented
     *
     * @memberof Context
     */
    ellipse(): void;

    /**
     * Turns the path currently being built into the current clipping path.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip
     *
     * @returns {void}
     *
     * @memberof Context
     */
    clip(): void;

    /**
     * Measure Text
     *
     * @ignore
     *
     * @throws {Error} Method is not yet implemented
     *
     * @memberof Context
     */
    measureText(
        string: string
    ): {
        width: number;
        emHeightAscent: number;
        emHeightDescent: number;
    };

    /**
     * Causes the point of the pen to move back to the start of the current sub-path. It tries to add a straight line (but does not actually draw it) from the current point to the start. If the shape has already been closed or has only one point, this function does nothing.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/closePath
     *
     * @returns {void}
     *
     * @memberof Context
     */
    closePath(): void;

    /**
     * Strokes the current or given path with the current stroke style
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/stroke
     *
     * @returns {void}
     *
     * @memberof Context
     */
    stroke(): void;

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
    drawLine(line: Line): void;

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
    drawLine_noaa(line: Line): void;

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
    drawLine_aa(line: Line): void;

    /**
     * Fills the current or given path with the current fill style. Uses {@link fill_aa} and {@link fill_noaa} depending on the the value of {@link imageSmoothingEnabled}
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fill
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fill(): void;

    /**
     * Fill Anti-aliased
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fill_aa(): void;
    /**
     * Fill No Anti-aliased
     *
     * @returns {void}
     *
     * @memberof Context
     */
    fill_noaa(): void;
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
    pixelInsideClip(x: number, y: number): void;
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
    fillText(text: string, x: number, y: number): void;
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
    strokeText(text: string, x: number, y: number): void;

    /**
     * Color String To Unint32
     *
     * Convert a color string to Uint32 notation
     *
     * @static
     * @param {string} str The color string to convert
     *
     * @returns {number}
     *
     * @example
     * var uInt32 = colorStringToUint32('#FF00FF');
     * console.log(uInt32); // Prints 4278255615
     *
     * @memberof Context
     */
    static colorStringToUint32(str: string): number;
}

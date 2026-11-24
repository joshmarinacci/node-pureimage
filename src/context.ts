import { Line } from "./line.js";
import { NAMED_COLORS, TRANSPARENT_BLACK } from "./named_colors.js";
import { Bounds, calc_min_bounds, Point, PointIsh } from "./point.js";
import * as TEXT from "./text.js";
import { Font } from "./text.js";
import * as G from "./gradients.js";
import { CanvasPattern } from "./pattern.js";
import { and, getBytesBigEndian, or } from "./uint32.js";
import type { Bitmap } from "./bitmap.js";
import {
  MinimumBounds,
  PATH_COMMAND,
  PathCmd,
  TextAlign,
  TextBaseline,
} from "./types.js";
import { parseColor, serializeColor } from "./color.js";
import { CompositeOperation, compositePixel, isCompositeOperation, isUnbounded } from "./composite.js";
import { Matrix, Transform } from "./transform.js";
import { LineCap, LineJoin, strokePolygons, Subpath } from "./stroke.js";
import { allFinite, PathBuilder, requireArgs, samePoint } from "./path.js";
import { mapPath, Path2D } from "./path2d.js";

// Matches a CSS size token: digits+optional-decimal followed by a unit, plus an optional /line-height suffix.
const FONT_SIZE_RE = /^(\d*\.?\d+)(px|pt|em|rem|ex|ch|vw|vh|%)(\/.*)?$/i;
const FONT_WEIGHT_KEYWORDS: Record<string, number> = { bold: 700, bolder: 800, lighter: 300 };

type ParsedFont = {
  size: number;
  family: string;
  style?: string;
  variant?: string;
  weight?: number;
};

type FillRule = "evenodd" | "nonzero";
type ClipRegion = { lines: Line[]; rule: FillRule };

/** A non-color fill or stroke style. */
type FillStyleObject = G.CanvasGradient | CanvasPattern;

const isStyleObject = (val: unknown): val is FillStyleObject =>
  val instanceof G.CanvasGradient || val instanceof CanvasPattern;


function parseFillRule(value: unknown): FillRule {
  if (value === "nonzero" || value === "evenodd") return value;
  throw new TypeError(`'${String(value)}' is not a valid CanvasFillRule`);
}


function parseFontString(val: string): ParsedFont | null {
  const tokens = val.trim().split(/\s+/);
  let style: string | undefined;
  let variant: string | undefined;
  let weight: number | undefined;
  let size: number | undefined;
  let familyStart = 0;

  for (let i = 0; i < tokens.length; i++) {
    const lower = tokens[i].toLowerCase();

    const sizeMatch = lower.match(FONT_SIZE_RE);
    if (sizeMatch) {
      size = parseFloat(sizeMatch[1]);
      familyStart = i + 1;
      break;
    }

    if ((lower === "italic" || lower === "oblique") && style === undefined) {
      style = lower;
      continue;
    }
    if (lower === "small-caps" && variant === undefined) {
      variant = lower;
      continue;
    }
    if (lower in FONT_WEIGHT_KEYWORDS && weight === undefined) {
      weight = FONT_WEIGHT_KEYWORDS[lower];
      continue;
    }
    if (/^\d+$/.test(lower) && weight === undefined) {
      const n = parseInt(lower, 10);
      if (n >= 100 && n <= 900) {
        weight = n;
        continue;
      }
    }
    // unknown pre-size tokens (e.g. "normal") are skipped
  }

  if (size === undefined || familyStart > tokens.length) return null;

  const family = tokens
    .slice(familyStart)
    .join(" ")
    .replace(/['"]/g, "")
    .trim();
  if (!family) return null;

  return { size, family, style, variant, weight };
}

/**
 * Used for drawing rectangles, text, images and other objects onto the canvas element. It provides the 2D rendering context for a drawing surface.
 *
 * It has the same API as [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) from the HTML5 canvas spec
 *
 * @class Context
 */
export class Context extends PathBuilder {
  /** Horizontal text alignment, one of start, end, left, center, right. start is the default */
  public textAlign: TextAlign;
  /** vertical text alignment, relative to the baseline. one of top, middle, alphabetic(default) and bottom. */
  public textBaseline: TextBaseline;
  /** Enable or disable image smoothing(anti-aliasing)*/
  public imageSmoothingEnabled: boolean;
  public imageSmoothingQuality: string;
  public direction: string;
  public filter: string;
  public fontKerning: string;
  public fontStretch: string;
  public fontVariantCaps: string;
  public letterSpacing: string;
  public lineDashOffset: number;
  public textRendering: string;
  public wordSpacing: string;
  public shadowBlur: number;
  public shadowColor: string;
  public shadowOffsetX: number;
  public shadowOffsetY: number;
  /**  A 32-bit unsigned integer (uint32) number representing the fill color of the 2D drawing context */
  private _fillColor: number | FillStyleObject;
  private _strokeColor: number | FillStyleObject;
  /** clip regions; a pixel is drawable only if it is inside every one */
  private _clip?: ClipRegion[];
  private _fillStyle_text: string;
  private _strokeStyle_text: string;
  private _transform: Transform;
  private states: any[];

  /** Creates a new pure image Context */
  constructor(
    /** An instance of the {@link Bitmap} class. Used for direct pixel manipulation(for example setting pixel colours) */
    bitmap: Bitmap,
  ) {
    super();
    this._bitmap = bitmap;
    this._resetState();
  }

  /** Put every piece of drawing state back to its initial value (spec defaults) */
  private _resetState() {
    this._fillColor = NAMED_COLORS.black;
    this._strokeColor = NAMED_COLORS.black;
    this._lineWidth = 1;
    this._globalAlpha = 1;
    this._transform = new Transform();
    this._font = {
      family: "invalid",
      size: 12,
    };
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
    this.imageSmoothingEnabled = true;
    this.imageSmoothingQuality = "low";
    this.direction = "inherit";
    this.filter = "none";
    this.fontKerning = "auto";
    this.fontStretch = "normal";
    this.fontVariantCaps = "normal";
    this.letterSpacing = "0px";
    this.lineDashOffset = 0;
    this.textRendering = "auto";
    this.wordSpacing = "0px";
    this._lineCap = "butt";
    this._lineJoin = "miter";
    this._miterLimit = 10;
    this.shadowBlur = 0;
    this.shadowColor = "rgba(0, 0, 0, 0)";
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.globalCompositeOperation = "source-over";
    this._clip = null;
    this._fillStyle_text = "#000000";
    this._strokeStyle_text = "#000000";
    this.states = [];
    this.path = [];
    this.pathstart = undefined;
  }

  /**
   * Resets the context to its default state and clears the bitmap to transparent black.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/reset
   */
  reset(): void {
    this._bitmap.data.fill(0);
    this._resetState();
  }

  private _bitmap: Bitmap;

  /**
   *  `canvas` is a read only reference to the Bitmap that this context draws into.
   */
  get canvas() {
    return this._bitmap;
  }

  private _lineWidth: number;

  /**
   * The thickness of lines in space units. When getting, it returns the current value (1.0 by default). When setting, zero, negative, `Infinity` and `NaN` values are ignored; otherwise the current value is set to the new value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineWidth
   */
  get lineWidth() {
    return this._lineWidth;
  }

  /** @example ctx.lineWidth = 15; */
  set lineWidth(val: number) {
    const v = Number(val);
    if (Number.isFinite(v) && v > 0) this._lineWidth = v;
  }

  private _lineCap: LineCap;
  private _lineJoin: LineJoin;
  private _miterLimit: number;

  /** How the ends of open subpaths are drawn: butt (the default), round or square. */
  get lineCap(): LineCap {
    return this._lineCap;
  }
  set lineCap(val: LineCap) {
    if (val === "butt" || val === "round" || val === "square") this._lineCap = val;
  }

  /** How corners between segments are drawn: miter (the default), round or bevel. */
  get lineJoin(): LineJoin {
    return this._lineJoin;
  }
  set lineJoin(val: LineJoin) {
    if (val === "miter" || val === "round" || val === "bevel") this._lineJoin = val;
  }

  /** The longest a miter join may be, as a multiple of the line width, before it is bevelled. */
  get miterLimit(): number {
    return this._miterLimit;
  }
  set miterLimit(val: number) {
    const v = Number(val);
    if (Number.isFinite(v) && v > 0) this._miterLimit = v;
  }

  private _globalAlpha: number;

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
    // per spec, out-of-range and non-finite values are ignored, not clamped
    if (!Number.isFinite(val) || val < 0 || val > 1) return;
    this._globalAlpha = val;
  }

  private _compositeOp: CompositeOperation = "source-over";
  /**
   * While a shape is drawn with a non source-over operator, its pixels are collected here
   * and composited onto the bitmap in one pass, so the operator sees the whole shape.
   */
  private _layer: Uint32Array | null = null;

  /**
   * How shapes and images are composited onto the canvas: a Porter-Duff operator or a blend mode.
   * Unsupported values are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
   */
  get globalCompositeOperation(): string {
    return this._compositeOp;
  }

  /** @example ctx.globalCompositeOperation = "multiply"; */
  set globalCompositeOperation(val: string) {
    const op = String(val);
    if (isCompositeOperation(op)) this._compositeOp = op;
  }

  /**
   * Run a drawing operation through the current composite operator. source-over draws
   * straight onto the bitmap; other operators render the shape into a layer first and then
   * composite it, including (for unbounded operators) the pixels the shape doesn't cover.
   */
  private paint(draw: () => void): void {
    const op = this._compositeOp;
    if (op === "source-over" || this._layer) {
      draw();
      return;
    }
    const { width, height } = this._bitmap;
    const layer = new Uint32Array(width * height);
    this._layer = layer;
    try {
      draw();
    } finally {
      this._layer = null;
    }
    const unbounded = isUnbounded(op);
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const src = layer[j * width + i];
        if (src === 0 && !unbounded) continue;
        if (!this.pixelInsideClip(i, j)) continue;
        const dst = this._bitmap.getPixelRGBA(i, j);
        this._bitmap.setPixelRGBA(i, j, compositePixel(op, src, this._globalAlpha, dst));
      }
    }
  }

  /** Write a source pixel into the active layer, combining overlapping writes with source-over. */
  private writeLayer(x: number, y: number, col: number): void {
    const layer = this._layer as Uint32Array;
    const idx = y * this._bitmap.width + x;
    layer[idx] = compositePixel("source-over", col, 1, layer[idx]);
  }

  /** Plain js object wrapping the font name and size */
  public _font: Font;

  /**
   * The current text style being used when drawing text. This string uses the same syntax as the CSS font specifier
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font
   */
  get font(): string {
    const parts: string[] = [];
    if (this._font.style) parts.push(this._font.style);
    if (this._font.variant) parts.push(this._font.variant);
    if (this._font.weight !== undefined) parts.push(String(this._font.weight));
    parts.push(`${this._font.size}px`);
    parts.push(this._font.family);
    return parts.join(" ");
  }

  /** @example ctx.font = 'bold italic 12px Arial'; */
  set font(val: string) {
    const parsed = parseFontString(val);
    if (parsed) {
      this._font.size = parsed.size;
      this._font.family = parsed.family;
      this._font.style = parsed.style;
      this._font.variant = parsed.variant;
      this._font.weight = parsed.weight;
    }
  }

  /**
   * The color or style to use inside shapes. The default is #000 (black).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle
   */
  get fillStyle(): string | FillStyleObject {
    // a gradient or pattern is returned as the same object; colors as their serialized string
    return typeof this._fillColor === "number" ? this._fillStyle_text : this._fillColor;
  }

  /** @example ctx.fillStyle = 'rgba(0, 25, 234, 0.6)'; */
  set fillStyle(val: string | FillStyleObject) {
    if (isStyleObject(val)) {
      this._fillColor = val;
      return;
    }
    // per spec, other values are stringified and invalid colors are ignored
    const color = parseColor(String(val));
    if (color === null) return;
    this._fillColor = color;
    this._fillStyle_text = serializeColor(color);
  }

  /**
   * The color or style to use for the lines around shapes. The default is #000 (black).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
   */
  get strokeStyle(): string | FillStyleObject {
    return typeof this._strokeColor === "number" ? this._strokeStyle_text : this._strokeColor;
  }

  /** @example ctx.strokeStyle = 'rgba(0, 25, 234, 0.6)'; */
  set strokeStyle(val: string | FillStyleObject) {
    if (isStyleObject(val)) {
      this._strokeColor = val;
      return;
    }
    const color = parseColor(String(val));
    if (color === null) return;
    this._strokeColor = color;
    this._strokeStyle_text = serializeColor(color);
  }

  /**
   * Creates a gradient along the line from (x0, y0) to (x1, y1).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient
   */
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): G.CanvasGradient {
    requireArgs(arguments.length, 4, "createLinearGradient");
    return new G.LinearGradient(+x0, +y0, +x1, +y1);
  }

  /**
   * Creates a gradient between the circle at (x0, y0) with radius r0 and the circle at (x1, y1)
   * with radius r1.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createRadialGradient
   */
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): G.CanvasGradient {
    requireArgs(arguments.length, 6, "createRadialGradient");
    return new G.RadialGradient(+x0, +y0, +r0, +x1, +y1, +r1);
  }

  /**
   * Creates a pattern that repeats an image. The pattern copies the image's pixels, so later
   * changes to a source canvas don't affect it.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
   *
   * @param image      a Bitmap, ImageBitmap or ImageData-like object with straight RGBA pixels
   * @param repetition "repeat" (default for null or ""), "repeat-x", "repeat-y" or "no-repeat"
   */
  createPattern(image: unknown, repetition: string | null): CanvasPattern {
    requireArgs(arguments.length, 2, "createPattern");
    return CanvasPattern.create(image, repetition);
  }

  /**
   * Creates a gradient that sweeps clockwise around (x, y), starting at `startAngle` radians.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createConicGradient
   */
  createConicGradient(startAngle: number, x: number, y: number): G.CanvasGradient {
    requireArgs(arguments.length, 3, "createConicGradient");
    return new G.ConicalGradient(+startAngle, +x, +y);
  }

  /**
   * Saves the entire state of the canvas by pushing the current state onto a stack
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save
   */
  save() {
    this.states.push({
      _clip: this._clip,
      _fillColor: this._fillColor,
      _strokeColor: this._strokeColor,
      _fillStyle_text: this._fillStyle_text,
      _strokeStyle_text: this._strokeStyle_text,
      _lineWidth: this._lineWidth,
      _globalAlpha: this._globalAlpha,
      _font: { ...this._font },
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      imageSmoothingEnabled: this.imageSmoothingEnabled,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      miterLimit: this.miterLimit,
      shadowBlur: this.shadowBlur,
      shadowColor: this.shadowColor,
      shadowOffsetX: this.shadowOffsetX,
      shadowOffsetY: this.shadowOffsetY,
      globalCompositeOperation: this.globalCompositeOperation,
    });
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
  translate(
    /** X position */
    x: number,
    /** Y position */
    y: number,
  ) {
    requireArgs(arguments.length, 2, "translate");
    this._transform.translate(x, y);
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
  rotate(
    /** Degrees of rotation (in radians) */
    angle: number,
  ) {
    requireArgs(arguments.length, 1, "rotate");
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
  scale(sx: number, sy: number) {
    requireArgs(arguments.length, 2, "scale");
    this._transform.scale(sx, sy);
  }

  transform(...args) {
    requireArgs(args.length, 6, "transform");
    if (args.length !== 6 || !args.every(Number.isFinite)) return;
    let new_mat = [...args];
    this._transform.multiply(new_mat as Matrix);
  }

  setTransform(...args) {
    if (args.length === 0) {
      this._transform.identity();
      return;
    }
    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      const matrix = args[0];
      const values = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
      if (!values.every(Number.isFinite)) return;
      this._transform.identity();
      let new_mat = this._transform.fromDomMatrix(args[0]);
      this._transform.multiply(new_mat);
    } else {
      requireArgs(args.length, 6, "setTransform");
      if (args.length !== 6 || !args.every(Number.isFinite)) return;
      this._transform.identity();
      this._transform.multiply([...args] as Matrix);
    }
  }

  protected pathTransform(): Transform {
    return this._transform;
  }

  getTransform() {
    return this._transform.asDomMatrix();
  }

  /** Resets the current transform to the identity matrix. */
  resetTransform() {
    this._transform.identity();
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
  restore(): void {
    this._transform.restore();
    let state = this.states.pop();
    if (state) {
      Object.assign(this, state);
    }
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
  fillRect(x: number, y: number, w: number, h: number): void {
    requireArgs(arguments.length, 4, "fillRect");
    if (![x, y, w, h].every(Number.isFinite)) return;
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    const matrix = this._transform.getMatrix();
    if (matrix[0] * matrix[3] - matrix[1] * matrix[2] === 0) return;
    this.paint(() => this.fillRectPixels(x, y, w, h));
  }

  private fillRectPixels(x: number, y: number, w: number, h: number): void {
    if (this._transform.isIdentity()) {
      //fast path for fillRect with non-transparent color
      if (typeof this._fillColor == "number" && this._globalAlpha === 1 && !this._layer) {
        const new_rgba = getBytesBigEndian(this._fillColor as number);
        if (new_rgba[3] === 255) {
          for (let i = x; i < x + w; i++) {
            for (let j = y; j < y + h; j++) {
              if (
                this.pixelInsideClip(i, j) &&
                this._bitmap._isValidCoords(i, j)
              ) {
                this._bitmap.setPixelRGBA(i, j, this._fillColor as number);
              }
            }
          }
          return;
        }
      }
      for (let i = x; i < x + w; i++) {
        for (let j = y; j < y + h; j++) {
          this.fillPixelWithColor(i, j, this.calculateRGBA(i, j));
        }
      }
    } else {
      const old_path = this.path;
      const old_pathstart = this.pathstart;
      this.beginPath();
      this.rect(x, y, w, h);
      this.fill();
      this.path = old_path;
      this.pathstart = old_pathstart;
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
  clearRect(x: number, y: number, w: number, h: number): void {
    requireArgs(arguments.length, 4, "clearRect");
    if (![x, y, w, h].every(Number.isFinite)) return;
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    if (this._transform.isIdentity()) {
      const x1 = Math.max(0, Math.floor(x));
      const y1 = Math.max(0, Math.floor(y));
      const x2 = Math.min(this._bitmap.width, Math.ceil(x + w));
      const y2 = Math.min(this._bitmap.height, Math.ceil(y + h));
      for (let i = x1; i < x2; i++) {
        for (let j = y1; j < y2; j++) {
          if (this.pixelInsideClip(i, j)) this._bitmap.setPixelRGBA(i, j, TRANSPARENT_BLACK);
        }
      }
      return;
    }
    // transformed: clear every pixel whose center falls inside the transformed quad
    const quad = [
      new Point(x, y),
      new Point(x + w, y),
      new Point(x + w, y + h),
      new Point(x, y + h),
    ].map((pt) => this._transform.transformPoint(pt));
    const xs = quad.map((pt) => pt.x);
    const ys = quad.map((pt) => pt.y);
    const x1 = Math.max(0, Math.floor(Math.min(...xs)));
    const y1 = Math.max(0, Math.floor(Math.min(...ys)));
    const x2 = Math.min(this._bitmap.width, Math.ceil(Math.max(...xs)));
    const y2 = Math.min(this._bitmap.height, Math.ceil(Math.max(...ys)));
    for (let i = x1; i < x2; i++) {
      for (let j = y1; j < y2; j++) {
        if (insideConvexQuad(quad, i + 0.5, j + 0.5) && this.pixelInsideClip(i, j)) {
          this._bitmap.setPixelRGBA(i, j, TRANSPARENT_BLACK);
        }
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
  strokeRect(x: number, y: number, w: number, h: number): void {
    requireArgs(arguments.length, 4, "strokeRect");
    if (![x, y, w, h].every(Number.isFinite)) return;
    // per spec, a rect with no width and no height strokes nothing
    if (w === 0 && h === 0) return;
    // stroke a temporary closed rect path so lineWidth, joins and transforms apply
    const old_path = this.path;
    const old_pathstart = this.pathstart;
    // built by hand rather than with rect(): rect() already returns to its start point,
    // and closePath() would then add a zero-length segment the stroker can't handle
    this.beginPath();
    this.moveTo(x, y);
    if (w === 0 || h === 0) {
      // a flat rect is a closed path that doubles back on itself: no caps, but it joins
      // at both ends
      this.lineTo(x + w, y + h);
      this.closePath();
    } else {
      this.lineTo(x + w, y);
      this.lineTo(x + w, y + h);
      this.lineTo(x, y + h);
      this.closePath();
    }
    this.stroke();
    this.path = old_path;
    this.pathstart = old_pathstart;
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
  strokePixel(x: number, y: number): void {
    if (this._layer) {
      if (this._bitmap._isValidCoords(x, y)) this.writeLayer(x, y, this.calculateRGBA_stroke(x, y));
      return;
    }
    if (!this.pixelInsideClip(x, y)) {
      return;
    }

    const new_pixel = this.calculateRGBA_stroke(x, y);
    const old_pixel = this._bitmap.getPixelRGBA(x, y);
    const final_pixel = this.composite(old_pixel, new_pixel);

    this._bitmap.setPixelRGBA(x, y, final_pixel);
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
  fillPixelWithColor(x: number, y: number, col: number): void {
    if (this._layer) {
      if (this._bitmap._isValidCoords(x, y)) this.writeLayer(x, y, col);
      return;
    }
    if (!this.pixelInsideClip(x, y)) {
      return;
    }

    if (!this._bitmap._isValidCoords(x, y)) return;
    const new_pixel = col;
    const old_pixel = this._bitmap.getPixelRGBA(x, y);
    const final_pixel = this.composite(old_pixel, new_pixel);

    this._bitmap.setPixelRGBA(x, y, final_pixel);
  }
  /** Composite a source pixel onto a destination pixel with source-over and globalAlpha. */
  private composite(old_pixel: number, new_pixel: number): number {
    return compositePixel("source-over", new_pixel, this._globalAlpha, old_pixel);
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
  calculateRGBA(x: number, y: number): number {
    return this.styleColorAt(this._fillColor, x, y);
  }

  private styleColorAt(style: number | FillStyleObject, x: number, y: number): number {
    if (typeof style === "number") return style;
    if (style instanceof CanvasPattern) return style.colorAt(x, y, this._transform.getMatrix());
    return style.colorAt(x, y, this._transform.getMatrix());
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
  calculateRGBA_stroke(x: number, y: number): number {
    return this.styleColorAt(this._strokeColor, x, y);
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
  getImageData(x: number, y: number, w: number, h: number): Bitmap {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0 || w * h * 4 > 0x7fffffff) {
      throw new TypeError("image data dimensions are invalid or too large");
    }
    return this._bitmap._copySubBitmap(x, y, w, h);
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
    requireArgs(arguments.length, 3, "putImageData");
    this._bitmap._pasteSubBitmap(imageData, x, y);
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
  drawImage(
    bitmap: Bitmap,
    sx: number,
    sy: number,
    sw?: number,
    sh?: number,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number,
  ) {
    requireArgs(arguments.length, 3, "drawImage");
    // two argument form
    if (typeof sw === "undefined")
      return this.drawImage(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        sx,
        sy,
        bitmap.width,
        bitmap.height,
      );
    // four argument form
    if (typeof dx === "undefined")
      return this.drawImage(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        sx,
        sy,
        sw,
        sh,
      );

    this.paint(() => this.drawImagePixels(bitmap, sx, sy, sw, sh, dx, dy, dw, dh));
  }

  private drawImagePixels(
    bitmap: Bitmap,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    let src_bounds = new Bounds(sx, sy, sx + sw, sy + sh);
    let pts = [
      new Point(dx, dy),
      new Point(dx + dw, dy),
      new Point(dx + dw, dy + dh),
      new Point(dx, dy + dh),
    ];
    pts = pts.map((pt) => this._transform.transformPoint(pt));
    let dst_bounds = calc_min_bounds(pts);

    let bitmap_bounds = new Bounds(
      0,
      0,
      this._bitmap.width,
      this._bitmap.height,
    );
    dst_bounds = dst_bounds.intersect(bitmap_bounds);

    let inv = this._transform.cloneTransform();
    inv.invert();

    //map dx to dx+dw  from sx to sx+sw
    function remap(n, a1, a2, b1, b2) {
      let t = (n - a1) / (a2 - a1);
      return t * (b2 - b1) + b1;
    }

    for (let i = dst_bounds.x1; i < dst_bounds.x2; i++) {
      for (let j = dst_bounds.y1; j < dst_bounds.y2; j++) {
        let dst_pt = new Point(i, j);
        let src_pt = inv.transformPoint(dst_pt).round();
        src_pt = new Point(
          remap(src_pt.x, dx, dx + dw, sx, sx + sw),
          remap(src_pt.y, dy, dy + dh, sy, sy + sh),
        );
        if (src_bounds.contains(src_pt)) {
          if (this._layer) {
            if (this._bitmap._isValidCoords(dst_pt.x, dst_pt.y)) {
              this.writeLayer(dst_pt.x, dst_pt.y, bitmap.getPixelRGBA(src_pt.x, src_pt.y));
            }
          } else if (
            this.pixelInsideClip(dst_pt.x, dst_pt.y) &&
            this._bitmap._isValidCoords(dst_pt.x, dst_pt.y)
          ) {
            const new_pixel = bitmap.getPixelRGBA(src_pt.x, src_pt.y);
            const old_pixel = this._bitmap.getPixelRGBA(dst_pt.x, dst_pt.y);
            const final_pixel = this.composite(old_pixel, new_pixel);
            this._bitmap.setPixelRGBA(dst_pt.x, dst_pt.y, final_pixel);
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
    this.pathstart = undefined;
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
  clip(fillRule?: FillRule): void;
  clip(path: Path2D, fillRule?: FillRule): void;
  clip(...args: unknown[]): void {
    const [path, fillRule] = this.pathAndRule(args, "clip");
    const rule = parseFillRule(fillRule);
    // intersect with any existing clip; build a new array so states saved by save() are untouched
    this._clip = [...(this._clip ?? []), { lines: pathToFillLines(path), rule }];
  }

  /**
   * The device-space path a drawing method acts on: the given Path2D under the current
   * transform, or the context's own path.
   */
  private devicePath(path?: Path2D): PathCmd[] {
    if (!path) return this.path;
    return mapPath(path.path, (pt) => this._transform.transformPoint(pt));
  }

  /**
   * Resolve the `(fillRule?)` / `(path, fillRule?)` overloads of fill() and clip(). Anything
   * but a Path2D first is a fill rule, so a missing or wrong path throws when the rule is parsed.
   */
  private pathAndRule(args: unknown[], method: string): [PathCmd[], unknown] {
    if (args[0] instanceof Path2D) return [this.devicePath(args[0]), args[1] === undefined ? "nonzero" : args[1]];
    if (args.length >= 2) throw new TypeError(`${method}: argument 1 is not a Path2D`);
    return [this.path, args[0] === undefined ? "nonzero" : args[0]];
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
  measureText(text: string) {
    requireArgs(arguments.length, 1, "measureText");
    return TEXT.measureText(this, text);
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
  stroke(path?: Path2D) {
    if (arguments.length > 0 && !(path instanceof Path2D)) {
      throw new TypeError("stroke: argument 1 is not a Path2D");
    }
    const device = this.devicePath(path);
    this.paint(() => this.strokePath(device));
  }

  private strokePath(path: PathCmd[]): void {
    const lines = this.strokeOutline(path);
    if (!lines) return;
    const old_fillStyle = this.fillStyle;
    this.fillStyle = this.strokeStyle;
    // the outline polygons overlap at every join and all wind the same way, so the nonzero
    // rule fills their union
    this.imageSmoothingEnabled
      ? this.fill_aa(lines, "nonzero")
      : this.fill_noaa(lines, "nonzero");
    this.fillStyle = old_fillStyle;
  }

  /** True if the current transform can be inverted (so user space maps onto the canvas). */
  private transformInvertible(): boolean {
    const m = this._transform.getMatrix();
    // compared rather than subtracted: with huge scales the products overflow to Infinity,
    // which still means invertible
    return m.every(Number.isFinite) && m[0] * m[3] !== m[1] * m[2];
  }

  /**
   * The device-space edges of the stroke outline of `path` (in device space), to fill with the
   * nonzero rule, or null if the current transform can't be inverted.
   */
  private strokeOutline(path: PathCmd[]): Line[] | null {
    // the stroke is traced in the user space of the transform in effect now, which need not
    // be the one the path was built with: scale(2, 1) makes vertical lines twice as thick
    const m = this._transform.getMatrix();
    const det = m[0] * m[3] - m[1] * m[2];
    if (!det || !Number.isFinite(det)) return null;
    const inverse = this._transform.cloneTransform();
    inverse.invert();
    const subpaths = pathToSubpaths(path, (pt) => inverse.transformPoint(pt));
    const polygons = strokePolygons(subpaths, {
      width: this._lineWidth,
      cap: this._lineCap,
      join: this._lineJoin,
      miterLimit: this._miterLimit,
      tolerance: 0.125 / Math.sqrt(Math.abs(det)),
    });
    const lines: Line[] = [];
    for (const poly of polygons) {
      const pts = poly.map((pt) => this._transform.transformPoint(new Point(pt.x, pt.y)));
      for (let i = 0; i < pts.length; i++) lines.push(new Line(pts[i], pts[(i + 1) % pts.length]));
    }
    return lines;
  }

  /**
   * Whether the point (x, y), in canvas coordinates (unaffected by the current transform), is
   * inside the current path filled with `fillRule`. Points exactly on the path count as inside.
   *
   * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-ispointinpath
   */
  isPointInPath(x: number, y: number, fillRule?: FillRule): boolean;
  isPointInPath(path: Path2D, x: number, y: number, fillRule?: FillRule): boolean;
  isPointInPath(...args: unknown[]): boolean {
    requireArgs(args.length, 2, "isPointInPath");
    // a Path2D first, or four arguments, means the (path, x, y, fillRule) overload
    const withPath = args[0] instanceof Path2D || args.length >= 4;
    if (withPath && !(args[0] instanceof Path2D)) {
      throw new TypeError("isPointInPath: argument 1 is not a Path2D");
    }
    const [x, y, fillRule] = withPath ? args.slice(1) : args;
    const rule = parseFillRule(fillRule === undefined ? "nonzero" : fillRule);
    if (!allFinite(x, y) || !this.transformInvertible()) return false;
    const path = this.devicePath(withPath ? (args[0] as Path2D) : undefined);
    return pointInLines(pathToFillLines(path), Number(x), Number(y), rule);
  }

  /**
   * Whether the point (x, y), in canvas coordinates, is inside the area that stroking the
   * current path with the current line styles would cover. Points on its edge count as inside.
   *
   * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-ispointinstroke
   */
  isPointInStroke(x: number, y: number): boolean;
  isPointInStroke(path: Path2D, x: number, y: number): boolean;
  isPointInStroke(...args: unknown[]): boolean {
    requireArgs(args.length, 2, "isPointInStroke");
    const withPath = args[0] instanceof Path2D || args.length >= 3;
    if (withPath && !(args[0] instanceof Path2D)) {
      throw new TypeError("isPointInStroke: argument 1 is not a Path2D");
    }
    const [x, y] = withPath ? args.slice(1) : args;
    if (!allFinite(x, y)) return false;
    const lines = this.strokeOutline(this.devicePath(withPath ? (args[0] as Path2D) : undefined));
    return !!lines && pointInLines(lines, Number(x), Number(y), "nonzero");
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
    if (line.is_invalid()) return console.error("cannot draw line", line);
    this.imageSmoothingEnabled
      ? this.drawLine_aa(line)
      : this.drawLine_noaa(line);
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
    // Bresenham's from Rosetta Code
    // http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
    let x0 = Math.floor(line.start.x);
    let y0 = Math.floor(line.start.y);
    const x1 = Math.floor(line.end.x);
    const y1 = Math.floor(line.end.y);
    const dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1;
    const dy = Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;

    while (true) {
      this.strokePixel(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err;
      if (e2 > -dx) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dy) {
        err += dx;
        y0 += sy;
      }
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
  drawLine_aa(line: Line) {
    let width = this._lineWidth;
    let x0 = Math.floor(line.start.x);
    let y0 = Math.floor(line.start.y);
    let x1 = Math.floor(line.end.x);
    let y1 = Math.floor(line.end.y);
    let dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1;
    let dy = Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1;

    let err = dx - dy,
      e2,
      x2,
      y2;
    let ed = dx + dy === 0 ? 1 : Math.sqrt(dx * dx + dy * dy);
    let rgb = and(this.calculateRGBA_stroke(x0, y0), 0xffffff00);
    let a1 = and(this.calculateRGBA_stroke(x0, y0), 0x000000ff);
    for (width = (width + 1) / 2; ; ) {
      const alpha = ~~Math.max(
        0,
        255 * (Math.abs(err - dx + dy) / ed - width + 1),
      );
      const a2 = 255 - alpha;
      const color = or(rgb, (a1 * a2) / 255);
      this.fillPixelWithColor(x0, y0, color);
      e2 = err;
      x2 = x0;
      if (2 * e2 >= -dx) {
        for (
          e2 += dy, y2 = y0;
          e2 < ed * width && (y1 !== y2 || dx > dy);
          e2 += dx
        ) {
          const alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
          const a2 = 255 - alpha;
          const color = or(rgb, (a1 * a2) / 255);
          this.fillPixelWithColor(x0, (y2 += sy), color);
        }
        if (x0 === x1) break;
        e2 = err;
        err -= dy;
        x0 += sx;
      }
      if (2 * e2 <= dy) {
        for (
          e2 = dx - e2;
          e2 < ed * width && (x1 !== x2 || dx < dy);
          e2 += dy
        ) {
          const alpha = ~~Math.max(0, 255 * (Math.abs(e2) / ed - width + 1));
          const a2 = 255 - alpha;
          const color = or(rgb, (a1 * a2) / 255);
          this.fillPixelWithColor((x2 += sx), y0, color);
        }
        if (y0 === y1) break;
        err += dx;
        y0 += sy;
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
  fill(fillRule?: FillRule): void;
  fill(path: Path2D, fillRule?: FillRule): void;
  fill(...args: unknown[]): void {
    const [path, fillRule] = this.pathAndRule(args, "fill");
    const rule = parseFillRule(fillRule);
    // every subpath is filled as if closed, without changing the path itself
    const lines = pathToFillLines(path);
    this.paint(() =>
      this.imageSmoothingEnabled ? this.fill_aa(lines, rule) : this.fill_noaa(lines, rule),
    );
  }

  /**
   * Fill Anti-aliased
   *
   * @returns {void}
   *
   * @memberof Context
   */
  fill_aa(lines, rule: FillRule = "evenodd"): void {
    const bounds = calcMinimumBounds(lines);
    const width = this._bitmap.width;
    // iterate whole pixel rows; the bounds are fractional, so rows must be snapped
    const startY = Math.min(Math.floor(bounds.y2), this._bitmap.height - 1);
    const endY = Math.max(Math.floor(bounds.y), 0);
    // horizontal coverage for the current row, summed over every span before compositing,
    // so spans that meet inside one pixel (e.g. a path that doubles back on itself)
    // don't leave a seam from compositing two partial coverages separately
    const coverage = new Float64Array(width);

    for (let j = startY; j >= endY; j--) {
      // sample each scanline at the pixel centre (j + 0.5), as browsers do
      const ints = calcSpans(lines, j + 0.5, rule);
      let minX = width;
      let maxX = -1;
      for (let i = 0; i + 1 < ints.length; i += 2) {
        const a = Math.max(0, Math.min(width, ints[i]));
        const b = Math.max(0, Math.min(width, ints[i + 1]));
        if (!(b > a)) continue;
        const start = Math.floor(a);
        const end = Math.floor(b);
        if (start === end) {
          coverage[start] += b - a;
        } else {
          coverage[start] += 1 - fract(a);
          for (let ii = start + 1; ii < end; ii++) coverage[ii] += 1;
          if (end < width) coverage[end] += fract(b);
        }
        minX = Math.min(minX, start);
        maxX = Math.max(maxX, Math.min(end, width - 1));
      }
      for (let ii = minX; ii <= maxX; ii++) {
        const cov = coverage[ii];
        coverage[ii] = 0;
        if (cov <= 0) continue;
        const col = this.calculateRGBA(ii, j);
        // floating-point error can leave a fully covered pixel a hair short of 1
        if (cov >= 1 - 1e-9) {
          this.fillPixelWithColor(ii, j, col);
        } else {
          const rgb = and(col, 0xffffff00);
          const alpha = and(col, 0xff);
          this.fillPixelWithColor(ii, j, or(rgb, cov * alpha));
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
  fill_noaa(lines, rule: FillRule = "evenodd"): void {
    const bounds = calcMinimumBounds(lines);
    const width = this._bitmap.width;
    // iterate whole pixel rows; the bounds are fractional, so rows must be snapped
    const startY = Math.min(Math.floor(bounds.y2), this._bitmap.height - 1);
    const endY = Math.max(Math.floor(bounds.y), 0);
    for (let j = startY; j >= endY; j--) {
      // sample each scanline at the pixel centre (j + 0.5), as browsers do
      const ints = calcSpans(lines, j + 0.5, rule);
      for (let i = 0; i + 1 < ints.length; i += 2) {
        // paint the pixels whose centres (ii + 0.5) fall inside [start, end)
        const first = Math.max(0, Math.ceil(ints[i] - 0.5));
        const last = Math.min(width - 1, Math.ceil(ints[i + 1] - 0.5) - 1);
        for (let ii = first; ii <= last; ii++) {
          this.fillPixelWithColor(ii, j, this.calculateRGBA(ii, j));
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
  pixelInsideClip(x: number, y: number): boolean {
    if (!this._clip) return true;
    //turn into a list of lines
    // calculate intersections with a horizontal line at j
    return this._clip.every(({ lines, rule }) => {
      // test the pixel centre (x + 0.5, y + 0.5) so clipping agrees with fill_aa/fill_noaa
      const spans = calcSpans(lines, y + 0.5, rule);
      for (let i = 0; i + 1 < spans.length; i += 2) {
        if (spans[i] < x + 0.5 && x + 0.5 <= spans[i + 1]) return true;
      }
      return false;
    });
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
  fillText(text: string, x: number, y: number): void {
    requireArgs(arguments.length, 3, "fillText");
    // glyphs are filled one at a time, so composite them together as one shape
    this.paint(() =>
      TEXT.processTextPath(this, text, x, y, true, this.textAlign, this.textBaseline),
    );
  }

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
  strokeText(text: string, x: number, y: number): void {
    requireArgs(arguments.length, 3, "strokeText");
    // glyphs are filled one at a time, so composite them together as one shape
    this.paint(() =>
      TEXT.processTextPath(this, text, x, y, false, this.textAlign, this.textBaseline),
    );
  }
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
/** True if (px, py) lies inside (or on the edge of) a convex quad, regardless of winding. */
function insideConvexQuad(quad: Point[], px: number, py: number): boolean {
  let sign = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross === 0) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function fract(v) {
  return v - Math.floor(v);
}

/**
 * Convert a path of points to an array of lines
 *
 * @param {Array} path List of sub-paths
 *
 * @returns {Array<Line>}
 */
/** The lines of a path as filled: each subpath is implicitly closed back to its start. */
function pathToFillLines(path: PathCmd[]): Line[] {
  const lines: Line[] = [];
  let start: Point | null = null;
  let curr: Point | null = null;
  const close = () => {
    if (start && curr && !curr.equals(start)) lines.push(new Line(curr, start));
  };
  for (const cmd of path) {
    if (cmd[0] === PATH_COMMAND.MOVE) {
      close();
      start = curr = cmd[1];
      continue;
    }
    for (const line of pathToLines([[PATH_COMMAND.MOVE, curr], cmd])) lines.push(line);
    curr = cmd[3] ?? cmd[1];
  }
  close();
  return lines;
}

/**
 * Whether (x, y) is inside the polygon edges `lines` under `rule`, counting points on an edge
 * as inside. Infinite coordinates (from a huge transform) are clamped to the largest finite
 * number so the arithmetic stays finite.
 */
function pointInLines(lines: Line[], x: number, y: number, rule: FillRule): boolean {
  const clamp = (v: number) => Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, v));
  const ON_EDGE = 1e-6;
  let winding = 0;
  let crossings = 0;
  for (const line of lines) {
    const ax = clamp(line.start.x);
    const ay = clamp(line.start.y);
    const bx = clamp(line.end.x);
    const by = clamp(line.end.y);
    // on the edge: within its bounding box and (almost) on its line
    if (
      x >= Math.min(ax, bx) - ON_EDGE &&
      x <= Math.max(ax, bx) + ON_EDGE &&
      y >= Math.min(ay, by) - ON_EDGE &&
      y <= Math.max(ay, by) + ON_EDGE
    ) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len === 0 || Math.abs(dx * (y - ay) - dy * (x - ax)) <= ON_EDGE * len) return true;
    }
    // a ray to the right crosses edges that span y (half-open, so shared vertices count once)
    if (ay <= y !== by <= y) {
      const cx = ax + ((y - ay) / (by - ay)) * (bx - ax);
      if (cx > x) {
        crossings++;
        winding += by > ay ? 1 : -1;
      }
    }
  }
  return rule === "evenodd" ? crossings % 2 === 1 : winding !== 0;
}

function pathToLines(path) {
  const lines = [];
  let curr = null;

  path.forEach(function (cmd) {
    if (cmd[0] === PATH_COMMAND.MOVE) {
      curr = cmd[1];
    }
    if (cmd[0] === PATH_COMMAND.LINE || cmd[0] === PATH_COMMAND.CLOSE) {
      const pt = cmd[1];
      if (!samePoint(curr, pt)) lines.push(new Line(curr, pt));
      curr = pt;
    }
    if (cmd[0] === PATH_COMMAND.BEZIER_CURVE) {
      for (const pt of flattenCubic(curr, cmd[1], cmd[2], cmd[3])) {
        lines.push(new Line(curr, pt));
        curr = pt;
      }
    }
  });
  return lines;
}

/**
 * Split a device-space path into the subpaths to stroke, in the space given by `toUser`.
 * Curves are flattened to lines, consecutive duplicate points are dropped, and a subpath
 * that is only a moveTo (no segments, not even zero-length ones) is left out.
 */
function pathToSubpaths(path: PathCmd[], toUser: (pt: Point) => Point): Subpath[] {
  const subpaths: Subpath[] = [];
  let sub: (Subpath & { tangents: (Point | null)[]; segments: number }) | null = null;
  let curr: Point | null = null;
  const finish = () => {
    if (sub && sub.segments > 0) {
      subpaths.push({ points: sub.points, tangents: sub.tangents, closed: sub.closed });
    }
    sub = null;
  };
  const start = (pt: Point) => {
    finish();
    sub = { points: [toUser(pt)], tangents: [null], closed: false, segments: 0 };
  };
  // `tangent` (device space) marks a point inside a curve, where the stroke bends rather
  // than joins
  const lineTo = (pt: PointIsh, tangent: PointIsh | null = null) => {
    if (!sub) start(curr);
    sub.segments++;
    const u = toUser(new Point(pt.x, pt.y));
    let t: Point | null = null;
    if (tangent && (tangent.x || tangent.y)) {
      const v = toUser(new Point(pt.x + tangent.x, pt.y + tangent.y));
      t = new Point(v.x - u.x, v.y - u.y);
    }
    const last = sub.points.length - 1;
    if (samePoint(sub.points[last], u)) {
      if (!t) sub.tangents[last] = null; // a corner wins over a curve point
      return;
    }
    sub.points.push(u);
    sub.tangents.push(t);
  };
  for (const cmd of path) {
    if (cmd[0] === PATH_COMMAND.MOVE) {
      start(cmd[1]);
    } else if (cmd[0] === PATH_COMMAND.LINE) {
      lineTo(cmd[1]);
    } else if (cmd[0] === PATH_COMMAND.BEZIER_CURVE) {
      const curve = [curr, cmd[1], cmd[2], cmd[3]];
      const { points: pts, params: ts } = flattenCubicWithParams(curr, cmd[1], cmd[2], cmd[3]);
      // tiny first and last segments that follow the curve's true end tangents, so caps and
      // joins at its ends are square to the curve even for very wide lines
      const eps = 1e-4;
      const at = (t: number) => lineTo(cubicAt(curve, t), cubicTangent(curve, t));
      at(eps);
      for (let i = 0; i < pts.length - 1; i++) at(ts[i]);
      at(1 - eps);
      lineTo(cmd[3]);
    } else if (cmd[0] === PATH_COMMAND.CLOSE) {
      if (sub) {
        lineTo(cmd[1]);
        sub.closed = true;
      }
      // closing starts a new subpath at the closed one's first point
      start(cmd[1]);
    }
    curr = cmd[3] ?? cmd[1];
  }
  finish();
  return subpaths;
}

/** The point at parameter t on a cubic Bézier curve. */
function cubicAt(p: PointIsh[], t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return new Point(
    a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
    a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
  );
}

/** The derivative of a cubic Bézier curve at parameter t. */
function cubicTangent(p: PointIsh[], t: number): Point {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return new Point(
    a * (p[1].x - p[0].x) + b * (p[2].x - p[1].x) + c * (p[3].x - p[2].x),
    a * (p[1].y - p[0].y) + b * (p[2].y - p[1].y) + c * (p[3].y - p[2].y),
  );
}

/**
 * Flatten a cubic Bézier curve into points (excluding p0, ending with p3) that stay within
 * 0.1 pixel of it.
 */
function flattenCubic(p0: PointIsh, p1: PointIsh, p2: PointIsh, p3: PointIsh): Point[] {
  return flattenCubicWithParams(p0, p1, p2, p3).points;
}

/** flattenCubic, also giving the curve parameter t of each point. */
function flattenCubicWithParams(p0: PointIsh, p1: PointIsh, p2: PointIsh, p3: PointIsh) {
  // Roger Willcocks' bound: the curve is within sqrt(flatness / 16) of its chord
  const FLATNESS = 16 * 0.1 * 0.1;
  const MAX_DEPTH = 16; // at most 65536 segments, however large the curve
  const out: Point[] = [];
  const params: number[] = [];
  const recurse = (a: PointIsh, b: PointIsh, c: PointIsh, d: PointIsh, depth: number, t0: number, t1: number) => {
    const ux = Math.max((3 * b.x - 2 * a.x - d.x) ** 2, (3 * c.x - 2 * d.x - a.x) ** 2);
    const uy = Math.max((3 * b.y - 2 * a.y - d.y) ** 2, (3 * c.y - 2 * d.y - a.y) ** 2);
    if (ux + uy <= FLATNESS || depth >= MAX_DEPTH || !Number.isFinite(ux + uy)) {
      out.push(new Point(d.x, d.y));
      params.push(t1);
      return;
    }
    const mid = (p: PointIsh, q: PointIsh) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const ab = mid(a, b);
    const bc = mid(b, c);
    const cd = mid(c, d);
    const abc = mid(ab, bc);
    const bcd = mid(bc, cd);
    const m = mid(abc, bcd);
    const tm = (t0 + t1) / 2;
    recurse(a, ab, abc, m, depth + 1, t0, tm);
    recurse(m, bcd, cd, d, depth + 1, tm, t1);
  };
  recurse(p0, p1, p2, p3, 0, 0, 1);
  return { points: out, params };
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
function calcMinimumBounds(lines: Line[]): MinimumBounds {
  const bounds = {
    x: Number.MAX_VALUE,
    y: Number.MAX_VALUE,
    x2: Number.MIN_VALUE,
    y2: Number.MIN_VALUE,
  };

  function checkPoint(pt: PointIsh) {
    bounds.x = Math.min(bounds.x, pt.x);
    bounds.y = Math.min(bounds.y, pt.y);
    bounds.x2 = Math.max(bounds.x2, pt.x);
    bounds.y2 = Math.max(bounds.y2, pt.y);
  }

  lines.forEach(function (line) {
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
 * @param {Array} lines An {@link Array} of Line
 * @param {number} y
 *
 * @ignore
 *
 * @returns {Array}
 */
function calcSpans(lines, y: number, rule: FillRule): number[] {
  if (rule === "evenodd") return calcSortedIntersections(lines, y);
  const crossings: { x: number; dir: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const A = lines[i].start;
    const B = lines[i].end;
    // same half-open crossing test as calcSortedIntersections
    if ((A.y < y && B.y >= y) || (B.y < y && A.y >= y)) {
      const x = A.x + ((y - A.y) / (B.y - A.y)) * (B.x - A.x);
      crossings.push({ x, dir: B.y > A.y ? 1 : -1 });
    }
  }
  crossings.sort((a, b) => a.x - b.x);
  // emit [start, end] pairs where the winding number is non-zero
  const spans: number[] = [];
  let winding = 0;
  for (const { x, dir } of crossings) {
    const was = winding;
    winding += dir;
    if (was === 0 && winding !== 0) {
      // a span starting where the last one ended (two shapes sharing an edge) continues it
      if (spans.length && x - spans[spans.length - 1] < 1e-9) spans.pop();
      else spans.push(x);
    } else if (was !== 0 && winding === 0) spans.push(x);
  }
  return spans;
}

function calcSortedIntersections(lines, y) {
  const xlist = [];
  for (let i = 0; i < lines.length; i++) {
    const A = lines[i].start;
    const B = lines[i].end;
    if ((A.y < y && B.y >= y) || (B.y < y && A.y >= y)) {
      const xval = A.x + ((y - A.y) / (B.y - A.y)) * (B.x - A.x);
      xlist.push(xval);
    }
  }
  return xlist.sort(function (a, b) {
    return a - b;
  });
}

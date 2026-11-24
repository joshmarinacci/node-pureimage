import { parseColor } from "./color.js";
import { allFinite, requireArgs } from "./path.js";
import { invert } from "./pattern.js";
import type { Matrix } from "./transform.js";

type ColorStop = { offset: number; color: number };

/**
 * A gradient fill, created with {@link Context.createLinearGradient},
 * {@link Context.createRadialGradient} or {@link Context.createConicGradient}.
 *
 * A gradient is defined in user space: the context's current transform is applied when it is
 * painted with, not when it is created.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#canvasgradient
 */
export class CanvasGradient {
  /** The color stops, sorted by offset; stops at the same offset keep the order they were added. */
  stops: ColorStop[] = [];
  private cache?: { ctm: Matrix; inverse: Matrix | null };

  /**
   * Adds a color stop.
   *
   * @param offset a number from 0 to 1
   * @param color  a CSS color
   * @throws TypeError if offset isn't finite; an IndexSizeError DOMException if it is outside
   *   0 to 1; a SyntaxError DOMException if color can't be parsed
   */
  addColorStop(offset: number, color: string): void {
    requireArgs(arguments.length, 2, "addColorStop");
    offset = Number(offset);
    if (!Number.isFinite(offset)) throw new TypeError(`addColorStop: offset ${offset} is not finite`);
    if (offset < 0 || offset > 1) {
      throw new DOMException(`addColorStop: offset ${offset} is outside 0 to 1`, "IndexSizeError");
    }
    const parsed = parseColor(String(color));
    if (parsed === null) {
      throw new DOMException(`addColorStop: can't parse color "${color}"`, "SyntaxError");
    }
    // a stop goes after any existing stops at the same offset
    let i = this.stops.length;
    while (i > 0 && this.stops[i - 1].offset > offset) i--;
    this.stops.splice(i, 0, { offset, color: parsed });
  }

  /**
   * The color, as RGBA, at a position along the gradient. Positions before the first stop take
   * its color, and positions after the last take the last one's. Between stops, each channel,
   * alpha included, is interpolated linearly without premultiplying.
   */
  colorAtOffset(t: number): number {
    const stops = this.stops;
    if (stops.length === 0) return 0;
    let i = 0;
    while (i < stops.length && stops[i].offset <= t) i++;
    if (i === 0) return stops[0].color;
    if (i === stops.length) return stops[i - 1].color;
    const a = stops[i - 1];
    const b = stops[i];
    const f = (t - a.offset) / (b.offset - a.offset);
    let out = 0;
    for (let shift = 24; shift >= 0; shift -= 8) {
      const ca = (a.color >>> shift) & 0xff;
      const cb = (b.color >>> shift) & 0xff;
      out = out * 256 + Math.round(ca + (cb - ca) * f);
    }
    return out >>> 0;
  }

  /**
   * The color, as RGBA, of the canvas pixel (x, y) under the transform `ctm`: the gradient is
   * sampled at the pixel's centre, mapped back into user space. Transparent black where the
   * gradient paints nothing.
   */
  colorAt(x: number, y: number, ctm: Matrix): number {
    if (this.stops.length === 0) return 0;
    if (!this.cache || !this.cache.ctm.every((v, i) => v === ctm[i])) {
      this.cache = { ctm: ctm.slice() as Matrix, inverse: invert(ctm) };
    }
    const inv = this.cache.inverse;
    if (!inv) return 0;
    const px = x + 0.5;
    const py = y + 0.5;
    const t = this.offsetAt(inv[0] * px + inv[2] * py + inv[4], inv[1] * px + inv[3] * py + inv[5]);
    return t === null ? 0 : this.colorAtOffset(t);
  }

  /** The gradient position of a point in user space, or null where nothing is painted. */
  protected offsetAt(_x: number, _y: number): number | null {
    return null;
  }
}

function requireFinite(method: string, ...values: number[]): void {
  if (!allFinite(...values)) throw new TypeError(`${method}: arguments must be finite numbers`);
}

/** @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-createlineargradient */
export class LinearGradient extends CanvasGradient {
  constructor(
    private x0: number,
    private y0: number,
    private x1: number,
    private y1: number,
  ) {
    super();
    requireFinite("createLinearGradient", x0, y0, x1, y1);
  }

  protected offsetAt(x: number, y: number): number | null {
    const dx = this.x1 - this.x0;
    const dy = this.y1 - this.y0;
    const len2 = dx * dx + dy * dy;
    // a zero-length gradient paints nothing
    if (len2 === 0) return null;
    return ((x - this.x0) * dx + (y - this.y0) * dy) / len2;
  }
}

/**
 * A gradient between two circles. Position ω ranges over the circles between and beyond them:
 * centre (x0, y0) + ω (x1 - x0, y1 - y0) and radius r0 + ω (r1 - r0). Each point takes the
 * largest ω whose circle, with a non-negative radius, passes through it. Points on no such circle
 * stay unpainted, so a gradient whose circles don't contain each other paints a cone.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-createradialgradient
 */
export class RadialGradient extends CanvasGradient {
  constructor(
    private x0: number,
    private y0: number,
    private r0: number,
    private x1: number,
    private y1: number,
    private r1: number,
  ) {
    super();
    requireFinite("createRadialGradient", x0, y0, r0, x1, y1, r1);
    if (r0 < 0 || r1 < 0) {
      throw new DOMException(`createRadialGradient: negative radius ${r0}, ${r1}`, "IndexSizeError");
    }
  }

  protected offsetAt(x: number, y: number): number | null {
    const { x0, y0, r0, r1 } = this;
    const cdx = this.x1 - x0;
    const cdy = this.y1 - y0;
    const dr = r1 - r0;
    // identical circles paint nothing
    if (cdx === 0 && cdy === 0 && dr === 0) return null;
    const pdx = x - x0;
    const pdy = y - y0;
    // |p - centre(ω)|² = radius(ω)², as a quadratic a ω² - 2 b ω + c = 0
    const a = cdx * cdx + cdy * cdy - dr * dr;
    const b = pdx * cdx + pdy * cdy + r0 * dr;
    const c = pdx * pdx + pdy * pdy - r0 * r0;
    const valid = (w: number) => r0 + w * dr >= 0;
    if (Math.abs(a) < 1e-9) {
      if (b === 0) return null;
      const w = c / (2 * b);
      return valid(w) ? w : null;
    }
    const disc = b * b - a * c;
    if (disc < 0) return null;
    const s = Math.sqrt(disc);
    const w1 = (b + s) / a;
    const w2 = (b - s) / a;
    const hi = Math.max(w1, w2);
    const lo = Math.min(w1, w2);
    if (valid(hi)) return hi;
    return valid(lo) ? lo : null;
  }
}

/**
 * A gradient that sweeps clockwise around (x, y), starting at `angle` radians from the
 * positive x axis.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-createconicgradient
 */
export class ConicalGradient extends CanvasGradient {
  constructor(
    private angle: number,
    private x: number,
    private y: number,
  ) {
    super();
    requireFinite("createConicGradient", angle, x, y);
  }

  protected offsetAt(x: number, y: number): number {
    const turn = (Math.atan2(y - this.y, x - this.x) - this.angle) / (2 * Math.PI);
    return turn - Math.floor(turn);
  }
}

export type ColorGradient = RadialGradient | LinearGradient | ConicalGradient;

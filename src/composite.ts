/**
 * Canvas compositing: Porter-Duff operators and separable / non-separable blend modes.
 *
 * Colors are 32-bit RGBA integers with straight (non-premultiplied) alpha, as stored in a Bitmap.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-globalcompositeoperation
 * @see https://www.w3.org/TR/compositing-1/
 */

type RGB = [number, number, number];

const PORTER_DUFF = [
  "clear",
  "copy",
  "source-over",
  "source-in",
  "source-out",
  "source-atop",
  "destination-over",
  "destination-in",
  "destination-out",
  "destination-atop",
  "xor",
  "lighter",
] as const;

const BLEND_MODES = [
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const;

export type CompositeOperation = (typeof PORTER_DUFF)[number] | (typeof BLEND_MODES)[number];

const OPERATIONS: ReadonlySet<string> = new Set<string>([...PORTER_DUFF, ...BLEND_MODES]);
const BLENDS: ReadonlySet<string> = new Set<string>(BLEND_MODES);

/**
 * Operators that change destination pixels the source does not cover: outside the drawn shape
 * the source counts as transparent black, which these operators turn into a cleared pixel.
 */
const UNBOUNDED: ReadonlySet<string> = new Set<string>([
  "clear",
  "copy",
  "source-in",
  "source-out",
  "destination-in",
  "destination-atop",
]);

export function isCompositeOperation(value: string): value is CompositeOperation {
  return OPERATIONS.has(value);
}

/** True if compositing a fully transparent source with `op` can change the destination. */
export function isUnbounded(op: CompositeOperation): boolean {
  return UNBOUNDED.has(op);
}

/** Porter-Duff source and destination factors [Fa, Fb] for the given alphas. */
function factors(op: CompositeOperation, as: number, ab: number): [number, number] {
  switch (op) {
    case "clear":
      return [0, 0];
    case "copy":
      return [1, 0];
    case "source-in":
      return [ab, 0];
    case "source-out":
      return [1 - ab, 0];
    case "source-atop":
      return [ab, 1 - as];
    case "destination-over":
      return [1 - ab, 1];
    case "destination-in":
      return [0, as];
    case "destination-out":
      return [0, 1 - as];
    case "destination-atop":
      return [1 - ab, as];
    case "xor":
      return [1 - ab, 1 - as];
    case "lighter":
      return [1, 1];
    default:
      // source-over, and every blend mode
      return [1, 1 - as];
  }
}

function hardLight(cb: number, cs: number): number {
  return cs <= 0.5 ? cb * 2 * cs : screen(cb, 2 * cs - 1);
}

function screen(cb: number, cs: number): number {
  return cb + cs - cb * cs;
}

function softLight(cb: number, cs: number): number {
  if (cs <= 0.5) return cb - (1 - 2 * cs) * cb * (1 - cb);
  const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb);
  return cb + (2 * cs - 1) * (d - cb);
}

function separable(op: CompositeOperation, cb: number, cs: number): number {
  switch (op) {
    case "multiply":
      return cb * cs;
    case "screen":
      return screen(cb, cs);
    case "overlay":
      return hardLight(cs, cb);
    case "darken":
      return Math.min(cb, cs);
    case "lighten":
      return Math.max(cb, cs);
    case "color-dodge":
      if (cb === 0) return 0;
      return cs === 1 ? 1 : Math.min(1, cb / (1 - cs));
    case "color-burn":
      if (cb === 1) return 1;
      return cs === 0 ? 0 : 1 - Math.min(1, (1 - cb) / cs);
    case "hard-light":
      return hardLight(cb, cs);
    case "soft-light":
      return softLight(cb, cs);
    case "difference":
      return Math.abs(cb - cs);
    case "exclusion":
      return cb + cs - 2 * cb * cs;
    default:
      return cs;
  }
}

const lum = ([r, g, b]: RGB) => 0.3 * r + 0.59 * g + 0.11 * b;
const sat = (c: RGB) => Math.max(...c) - Math.min(...c);

function clipColor(c: RGB): RGB {
  const l = lum(c);
  const n = Math.min(...c);
  const x = Math.max(...c);
  return c.map((v) => {
    if (n < 0) v = l + ((v - l) * l) / (l - n);
    if (x > 1) v = l + ((v - l) * (1 - l)) / (x - l);
    return v;
  }) as RGB;
}

function setLum(c: RGB, l: number): RGB {
  const d = l - lum(c);
  return clipColor([c[0] + d, c[1] + d, c[2] + d]);
}

function setSat(c: RGB, s: number): RGB {
  const max = Math.max(...c);
  const min = Math.min(...c);
  if (max === min) return [0, 0, 0];
  return c.map((v) => {
    if (v === max) return s;
    if (v === min) return 0;
    return ((v - min) * s) / (max - min);
  }) as RGB;
}

/** The blended source color B(Cb, Cs) for a blend mode. */
function blend(op: CompositeOperation, cb: RGB, cs: RGB): RGB {
  switch (op) {
    case "hue":
      return setLum(setSat(cs, sat(cb)), lum(cb));
    case "saturation":
      return setLum(setSat(cb, sat(cs)), lum(cb));
    case "color":
      return setLum(cs, lum(cb));
    case "luminosity":
      return setLum(cb, lum(cs));
    default:
      return [separable(op, cb[0], cs[0]), separable(op, cb[1], cs[1]), separable(op, cb[2], cs[2])];
  }
}

const unpack = (c: number): [number, number, number, number] => [
  ((c >>> 24) & 0xff) / 255,
  ((c >>> 16) & 0xff) / 255,
  ((c >>> 8) & 0xff) / 255,
  (c & 0xff) / 255,
];

const toByte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);

/**
 * Composite a source pixel onto a destination pixel.
 *
 * @param op          the composite operation
 * @param src         source color (straight alpha)
 * @param alphaScale  multiplier for the source alpha, i.e. globalAlpha
 * @param dst         destination color (straight alpha)
 * @returns the resulting color (straight alpha)
 */
export function compositePixel(
  op: CompositeOperation,
  src: number,
  alphaScale: number,
  dst: number,
): number {
  const [sr, sg, sb, sa0] = unpack(src);
  const [dr, dg, db, da] = unpack(dst);
  const sa = sa0 * alphaScale;
  const [fa, fb] = factors(op, sa, da);

  let cs: RGB = [sr, sg, sb];
  if (BLENDS.has(op)) {
    // the source is first mixed with its blended color in proportion to the backdrop's alpha
    const b = blend(op, [dr, dg, db], cs);
    cs = [0, 1, 2].map((i) => (1 - da) * cs[i] + da * b[i]) as RGB;
  }

  let ao = sa * fa + da * fb;
  if (op === "lighter") ao = Math.min(1, ao);
  if (ao <= 0) return 0;

  const channel = (s: number, d: number) => {
    let premul = sa * fa * s + da * fb * d;
    if (op === "lighter") premul = Math.min(1, premul);
    return toByte(premul / ao);
  };
  return (
    ((channel(cs[0], dr) << 24) |
      (channel(cs[1], dg) << 16) |
      (channel(cs[2], db) << 8) |
      toByte(ao)) >>>
    0
  );
}

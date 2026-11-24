import type { Matrix } from "./transform.js";

/**
 * A repeating image fill, created with {@link Context.createPattern}.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern
 */

export type PatternRepetition = "repeat" | "repeat-x" | "repeat-y" | "no-repeat";

/** Anything with straight RGBA pixels: a Bitmap, an OffscreenCanvas, an ImageBitmap or ImageData. */
export type PatternSource = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};

/** The fields of a DOMMatrix2DInit, with the m11.. aliases of a, b, c, d, e, f. */
export type MatrixInit = Partial<Record<"a" | "b" | "c" | "d" | "e" | "f", number>> &
  Partial<Record<"m11" | "m12" | "m21" | "m22" | "m41" | "m42", number>>;

const REPETITIONS: ReadonlySet<string> = new Set(["repeat", "repeat-x", "repeat-y", "no-repeat"]);

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function invert(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (det === 0 || !Number.isFinite(det)) return null;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

/** Read a DOMMatrix2DInit, throwing TypeError when an alias pair disagrees. */
export function matrixFromInit(init: MatrixInit, method = "setTransform"): Matrix {
  const pairs: [keyof MatrixInit, keyof MatrixInit, number][] = [
    ["a", "m11", 1],
    ["b", "m12", 0],
    ["c", "m21", 0],
    ["d", "m22", 1],
    ["e", "m41", 0],
    ["f", "m42", 0],
  ];
  return pairs.map(([short, long, fallback]) => {
    const s = init[short];
    const l = init[long];
    if (s !== undefined && l !== undefined && !Object.is(Number(s), Number(l))) {
      throw new TypeError(`${method}: ${short} and ${long} must match`);
    }
    return Number(s ?? l ?? fallback);
  }) as Matrix;
}

export class CanvasPattern {
  private readonly width: number;
  private readonly height: number;
  /** a snapshot of the source pixels, taken when the pattern is created */
  private readonly pixels: Uint8Array;
  private readonly repetition: PatternRepetition;
  private matrix: Matrix = IDENTITY;
  /** inverse of (current transform x pattern matrix), cached for the transform it was built from */
  private cache: { ctm: Matrix; inverse: Matrix | null } | null = null;

  /** @ignore use {@link Context.createPattern} */
  constructor(source: PatternSource, repetition: PatternRepetition) {
    this.width = source.width;
    this.height = source.height;
    this.pixels = Uint8Array.from(Array.prototype.slice.call(source.data, 0, source.width * source.height * 4));
    this.repetition = repetition;
  }

  /**
   * Validate createPattern arguments and build a pattern.
   *
   * @ignore
   */
  static create(source: unknown, repetition: unknown): CanvasPattern {
    if (!isPatternSource(source)) {
      throw new TypeError("createPattern: image must be a canvas, image bitmap or image data");
    }
    if (source.width === 0 || source.height === 0) {
      throw new DOMException("createPattern: image has no pixels", "InvalidStateError");
    }
    // null and the empty string both mean "repeat"; anything else must match exactly
    const rep = repetition === null || repetition === "" ? "repeat" : String(repetition);
    if (!REPETITIONS.has(rep)) {
      throw new DOMException(`createPattern: unknown repetition "${rep}"`, "SyntaxError");
    }
    return new CanvasPattern(source, rep as PatternRepetition);
  }

  /**
   * Set the transform from pattern space to user space.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern/setTransform
   */
  setTransform(transform: MatrixInit = {}): void {
    const m = matrixFromInit(transform ?? {});
    // per spec, a matrix with non-finite values is ignored
    if (!m.every(Number.isFinite)) return;
    this.matrix = m;
    this.cache = null;
  }

  /**
   * The pattern color at the centre of device pixel (x, y), for the given current transform.
   *
   * @ignore
   */
  colorAt(x: number, y: number, ctm: Matrix): number {
    if (!this.cache || !this.cache.ctm.every((v, i) => v === ctm[i])) {
      this.cache = { ctm: ctm.slice() as Matrix, inverse: invert(multiply(ctm, this.matrix)) };
    }
    const inv = this.cache.inverse;
    if (!inv) return 0;
    const px = x + 0.5;
    const py = y + 0.5;
    let u = Math.floor(inv[0] * px + inv[2] * py + inv[4]);
    let v = Math.floor(inv[1] * px + inv[3] * py + inv[5]);
    const repeatX = this.repetition === "repeat" || this.repetition === "repeat-x";
    const repeatY = this.repetition === "repeat" || this.repetition === "repeat-y";
    if (repeatX) u = ((u % this.width) + this.width) % this.width;
    else if (u < 0 || u >= this.width) return 0;
    if (repeatY) v = ((v % this.height) + this.height) % this.height;
    else if (v < 0 || v >= this.height) return 0;
    const i = (v * this.width + u) * 4;
    const p = this.pixels;
    return ((p[i] << 24) | (p[i + 1] << 16) | (p[i + 2] << 8) | p[i + 3]) >>> 0;
  }
}

function isPatternSource(value: unknown): value is PatternSource {
  if (typeof value !== "object" || value === null) return false;
  const { width, height, data } = value as Partial<PatternSource>;
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    data !== undefined &&
    typeof data.length === "number" &&
    data.length >= (width as number) * (height as number) * 4
  );
}

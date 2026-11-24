export type ImageDataSettings = { colorSpace?: string; pixelFormat?: string };

/**
 * WebIDL's [EnforceRange] conversion, by default for a long: truncated toward zero, and a
 * TypeError if the value isn't finite or the result is out of range.
 */
export function enforceRange(value: unknown, method: string, min = -(2 ** 31), max = 2 ** 31 - 1): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new TypeError(`${method}: ${String(value)} is not a finite number from ${min} to ${max}`);
  }
  return n;
}

function checkSettings(settings: ImageDataSettings | undefined | null, method: string): void {
  if (settings === undefined || settings === null) return;
  if (typeof settings !== "object") throw new TypeError(`${method}: settings must be an object`);
  const { colorSpace = "srgb", pixelFormat = "rgba-unorm8" } = settings;
  // only 8-bit sRGB pixels are supported
  if (colorSpace !== "srgb") throw new TypeError(`${method}: unsupported colorSpace "${colorSpace}"`);
  if (pixelFormat !== "rgba-unorm8") {
    throw new TypeError(`${method}: unsupported pixelFormat "${pixelFormat}"`);
  }
}

/**
 * A rectangle of straight (not premultiplied) 8-bit sRGB RGBA pixels, as returned by
 * {@link Context.getImageData} and {@link Context.createImageData}.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#imagedata
 */
export class ImageData {
  readonly #width: number;
  readonly #height: number;
  readonly #data: Uint8ClampedArray;

  /**
   * `new ImageData(width, height, settings?)` makes transparent black pixels;
   * `new ImageData(data, width, height?, settings?)` wraps an existing Uint8ClampedArray
   * without copying it.
   */
  constructor(sw: number, sh: number, settings?: ImageDataSettings);
  constructor(data: Uint8ClampedArray, sw: number, sh?: number, settings?: ImageDataSettings);
  constructor(a: number | Uint8ClampedArray, b: number, c?: number | ImageDataSettings, d?: ImageDataSettings) {
    if (arguments.length < 2) throw new TypeError("ImageData: at least 2 arguments required");
    if (a instanceof Uint8ClampedArray) {
      const sw = toDimension(b);
      const pixels = a.length / 4;
      if (a.length === 0 || !Number.isInteger(pixels)) {
        throw new DOMException("ImageData: data length must be a non-zero multiple of 4", "InvalidStateError");
      }
      if (sw === 0) throw new DOMException("ImageData: width is zero", "IndexSizeError");
      if (pixels % sw !== 0) {
        throw new DOMException("ImageData: data length is not a multiple of the width", "IndexSizeError");
      }
      const sh = pixels / sw;
      if (c !== undefined && toDimension(c) !== sh) {
        throw new DOMException("ImageData: data length doesn't match width × height", "IndexSizeError");
      }
      checkSettings(d, "ImageData");
      this.#width = sw;
      this.#height = sh;
      this.#data = a;
      return;
    }
    const sw = toDimension(a);
    const sh = toDimension(b);
    checkSettings(c as ImageDataSettings | undefined, "ImageData");
    if (sw === 0 || sh === 0) throw new DOMException("ImageData: width or height is zero", "IndexSizeError");
    this.#width = sw;
    this.#height = sh;
    this.#data = new Uint8ClampedArray(allocSize(sw, sh));
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  /** The pixels, row by row, as R, G, B, A bytes. */
  get data(): Uint8ClampedArray {
    return this.#data;
  }

  get colorSpace(): string {
    return "srgb";
  }

  get pixelFormat(): string {
    return "rgba-unorm8";
  }

  // Bitmap-style pixel helpers, kept because getImageData used to return a Bitmap

  /** The pixel at (x, y) as a 32-bit RGBA number, or 0 outside the image. */
  getPixelRGBA(x: number, y: number): number {
    if (!this.contains(x, y)) return 0;
    const i = (y * this.#width + x) * 4;
    const d = this.#data;
    return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
  }

  /** The pixel at (x, y) as [r, g, b, a], or transparent black outside the image. */
  getPixelRGBA_separate(x: number, y: number): number[] {
    if (!this.contains(x, y)) return [0, 0, 0, 0];
    const i = (y * this.#width + x) * 4;
    return Array.from(this.#data.subarray(i, i + 4));
  }

  /** Sets the pixel at (x, y) from a 32-bit RGBA number. Ignored outside the image. */
  setPixelRGBA(x: number, y: number, rgba: number): void {
    if (!this.contains(x, y)) return;
    const i = (y * this.#width + x) * 4;
    const d = this.#data;
    d[i] = (rgba >>> 24) & 0xff;
    d[i + 1] = (rgba >>> 16) & 0xff;
    d[i + 2] = (rgba >>> 8) & 0xff;
    d[i + 3] = rgba & 0xff;
  }

  private contains(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.#width && y < this.#height;
  }

  get [Symbol.toStringTag](): string {
    return "ImageData";
  }
}

/** WebIDL [EnforceRange] unsigned long, for the ImageData constructor. */
function toDimension(value: unknown): number {
  return enforceRange(value, "ImageData", 0, 2 ** 32 - 1);
}

/** The byte length for w × h pixels; a RangeError if it is too big to allocate. */
export function allocSize(w: number, h: number): number {
  const size = w * h * 4;
  if (size > 0x7fffffff) throw new RangeError(`ImageData: ${w} × ${h} is too large`);
  return size;
}

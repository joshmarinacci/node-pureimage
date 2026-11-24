import { describe, expect, it } from "vitest";
import * as pureimage from "../src/index";
import { ImageData } from "../src/index";

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const CLEAR = [0, 0, 0, 0];

const named = (name: string) => expect.objectContaining({ name });

function canvas(w = 100, h = 50) {
  const image = pureimage.make(w, h);
  const ctx = image.getContext("2d");
  const px = (x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));
  return { image, ctx, px };
}

describe("ImageData", () => {
  it("is created transparent black, or wrapping existing pixels", () => {
    const blank = new ImageData(3, 2);
    expect([blank.width, blank.height, blank.data.length]).toEqual([3, 2, 24]);
    expect(blank.data.every((v) => v === 0)).toBe(true);
    expect(blank.colorSpace).toBe("srgb");
    expect(blank.pixelFormat).toBe("rgba-unorm8");

    const pixels = new Uint8ClampedArray(16);
    const wrapped = new ImageData(pixels, 2);
    expect([wrapped.width, wrapped.height]).toEqual([2, 2]);
    expect(wrapped.data).toBe(pixels); // not a copy
  });

  it("validates its arguments", () => {
    expect(() => new ImageData(0, 1)).toThrow(named("IndexSizeError"));
    expect(() => new ImageData(-1, 1)).toThrow(TypeError);
    expect(() => new ImageData(NaN, 1)).toThrow(TypeError);
    expect(() => new ImageData(new Uint8ClampedArray(6), 1)).toThrow(named("InvalidStateError"));
    expect(() => new ImageData(new Uint8ClampedArray(12), 2)).toThrow(named("IndexSizeError"));
    expect(() => new ImageData(new Uint8ClampedArray(16), 2, 3)).toThrow(named("IndexSizeError"));
    expect(() => new ImageData(1, 1, { colorSpace: "display-p3" })).toThrow(TypeError);
  });

  it("has read-only dimensions and clamped pixel data", () => {
    const data = new ImageData(2, 2);
    expect(() => {
      (data as { width: number }).width = 5;
    }).toThrow(TypeError); // strict mode; sloppy mode ignores the assignment
    expect(data.width).toBe(2);
    data.data[0] = 300;
    data.data[1] = -5;
    data.data[2] = 1.5;
    expect(Array.from(data.data.subarray(0, 3))).toEqual([255, 0, 2]);
  });

  it("keeps Bitmap-style pixel helpers", () => {
    const data = new ImageData(2, 2);
    data.setPixelRGBA(1, 1, 0x11223344);
    expect(data.getPixelRGBA(1, 1)).toBe(0x11223344);
    expect(data.getPixelRGBA_separate(1, 1)).toEqual([0x11, 0x22, 0x33, 0x44]);
    expect(data.getPixelRGBA(5, 5)).toBe(0);
  });
});

describe("createImageData", () => {
  it("creates transparent black data, using the magnitude of each dimension", () => {
    const { ctx } = canvas();
    const data = ctx.createImageData(-3.9, 2.1);
    expect(data).toBeInstanceOf(ImageData);
    expect([data.width, data.height]).toEqual([3, 2]);
    expect(data.data.every((v) => v === 0)).toBe(true);
  });

  it("copies the size of another ImageData", () => {
    const { ctx } = canvas();
    const data = ctx.createImageData(new ImageData(4, 5));
    expect([data.width, data.height]).toEqual([4, 5]);
  });

  it("validates its arguments", () => {
    const { ctx } = canvas();
    expect(() => ctx.createImageData(0, 5)).toThrow(named("IndexSizeError"));
    expect(() => ctx.createImageData(Infinity, 5)).toThrow(TypeError);
    expect(() => ctx.createImageData({ width: 1, height: 1 } as ImageData)).toThrow(TypeError);
  });
});

describe("getImageData", () => {
  it("returns straight RGBA ImageData", () => {
    const { ctx } = canvas();
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.clearRect(0, 0, 100, 50);
    ctx.fillRect(0, 0, 10, 10);
    const data = ctx.getImageData(0, 0, 1, 1);
    expect(data).toBeInstanceOf(ImageData);
    expect(Array.from(data.data)).toEqual([255, 0, 0, 128]);
  });

  it("extends negative sizes left and up, and truncates fractions", () => {
    const { ctx } = canvas();
    ctx.fillStyle = "#0f0";
    ctx.fillRect(10, 10, 1, 1);
    const data = ctx.getImageData(12, 12, -2.7, -2.7);
    expect([data.width, data.height]).toEqual([2, 2]);
    expect(data.getPixelRGBA_separate(0, 0)).toEqual(GREEN);
  });

  it("is transparent black outside the canvas", () => {
    const { ctx } = canvas();
    ctx.fillStyle = "#0f0";
    ctx.fillRect(0, 0, 100, 50);
    const data = ctx.getImageData(-2, -2, 4, 4);
    expect(data.getPixelRGBA_separate(0, 0)).toEqual(CLEAR);
    expect(data.getPixelRGBA_separate(1, 3)).toEqual(CLEAR);
    expect(data.getPixelRGBA_separate(2, 2)).toEqual(GREEN);
  });

  it("validates its arguments", () => {
    const { ctx } = canvas();
    expect(() => ctx.getImageData(0, 0, 0, 1)).toThrow(named("IndexSizeError"));
    expect(() => ctx.getImageData(NaN, 0, 1, 1)).toThrow(TypeError);
    expect(() => ctx.getImageData(0, 2 ** 32, 1, 1)).toThrow(TypeError); // outside a long
  });
});

describe("putImageData", () => {
  function redSquare() {
    const data = new ImageData(10, 10);
    for (let i = 0; i < data.data.length; i += 4) data.data.set(RED, i);
    return data;
  }

  it("replaces pixels, ignoring transform, alpha, clip and compositing", () => {
    const { ctx, px } = canvas();
    ctx.fillStyle = "#0f0";
    ctx.fillRect(0, 0, 100, 50);
    ctx.translate(50, 0);
    ctx.globalAlpha = 0.1;
    ctx.globalCompositeOperation = "destination-over";
    ctx.rect(0, 0, 1, 1);
    ctx.clip();
    ctx.putImageData(redSquare(), 20, 20);
    expect(px(25, 25)).toEqual(RED);
    expect(px(75, 25)).toEqual(GREEN);
  });

  it("writes only the dirty rectangle, normalized and clipped to the image", () => {
    const { ctx, px } = canvas();
    ctx.fillStyle = "#0f0";
    ctx.fillRect(0, 0, 100, 50);
    // a negative size extends left and up: this is the rectangle (4, 4) to (8, 8)
    ctx.putImageData(redSquare(), 0, 0, 8, 8, -4, -4);
    expect(px(3, 3)).toEqual(GREEN);
    expect(px(5, 5)).toEqual(RED);
    expect(px(8, 8)).toEqual(GREEN);
    // a rectangle starting outside the image is cut to the part inside it: (0, 0) to (2, 2)
    ctx.putImageData(redSquare(), 50, 0, -5, -5, 7, 7);
    expect(px(51, 1)).toEqual(RED);
    expect(px(52, 2)).toEqual(GREEN);
  });

  it("can be partly off the canvas", () => {
    const { ctx, px } = canvas();
    ctx.putImageData(redSquare(), -5, 45);
    expect(px(0, 49)).toEqual(RED);
    expect(px(5, 49)).not.toEqual(RED);
  });

  it("accepts a Bitmap but nothing else", () => {
    const { ctx, px } = canvas();
    const bitmap = pureimage.make(2, 2);
    bitmap.getContext("2d").fillStyle = "#f00";
    bitmap.getContext("2d").fillRect(0, 0, 2, 2);
    ctx.putImageData(bitmap, 0, 0);
    expect(px(1, 1)).toEqual(RED);
    const fake = { width: 1, height: 1, data: [255, 0, 0, 255] };
    expect(() => ctx.putImageData(fake as unknown as ImageData, 0, 0)).toThrow(TypeError);
    expect(() => ctx.putImageData(redSquare(), NaN, 0)).toThrow(TypeError);
    // @ts-expect-error a dirty rectangle needs all four values
    expect(() => ctx.putImageData(redSquare(), 0, 0, 1, 1)).toThrow(TypeError);
  });
});

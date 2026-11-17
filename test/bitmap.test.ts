import { describe, beforeEach, expect, it } from "vitest";
import * as pureimage from "../src/index";

describe("bitmap as canvas host", () => {
  let image;
  let ctx;

  beforeEach(() => {
    image = pureimage.make(100, 50);
    ctx = image.getContext("2d");
  });

  it("width and height are numbers", () => {
    expect(image.width).toBe(100);
    expect(image.height).toBe(50);
  });

  it("make() floors non-integer sizes", () => {
    const img = pureimage.make(10.9, 5.2);
    expect(img.width).toBe(10);
    expect(img.height).toBe(5);
    expect(img.data.length).toBe(10 * 5 * 4);
  });

  it("changing width clears to transparent black", () => {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 50, 50);
    expect(image.getPixelRGBA_separate(20, 20)).toEqual(new Uint8Array([255, 0, 0, 255]));
    image.width = 50;
    expect(image.width).toBe(50);
    expect(image.data.length).toBe(50 * 50 * 4);
    expect(image.getPixelRGBA_separate(20, 20)).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  it("setting width to the same value still clears", () => {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 50, 50);
    image.width = 100;
    expect(image.getPixelRGBA_separate(20, 20)).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  it("changing height resizes the data", () => {
    image.height = 10;
    expect(image.height).toBe(10);
    expect(image.data.length).toBe(100 * 10 * 4);
  });

  it("resizing resets the context state, transform, path and clip", () => {
    ctx.fillStyle = "#ff0000";
    ctx.lineWidth = 7;
    ctx.translate(30, 30);
    ctx.beginPath();
    ctx.rect(0, 0, 5, 5);
    ctx.clip();
    image.width = 100;
    expect(ctx.fillStyle).toBe("#000000");
    expect(ctx.lineWidth).toBe(1);
    expect(ctx.getTransform().e).toBe(0);
    expect(ctx.path.length).toBe(0);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(0, 0, 100, 50); // would be clipped if the old clip survived
    expect(image.getPixelRGBA_separate(50, 25)).toEqual(new Uint8Array([0, 255, 0, 255]));
  });

  it("the same context is kept after resizing", () => {
    image.width = 20;
    expect(image.getContext("2d")).toBe(ctx);
  });

  it.each([-1, NaN, Infinity, "foo", "400x"])("rejects invalid size %s", (v) => {
    expect(() => {
      image.width = v;
    }).toThrow(TypeError);
    expect(() => {
      image.height = v;
    }).toThrow(TypeError);
    expect(image.width).toBe(100);
  });

  it("setting size to 0 is allowed", () => {
    image.width = 0;
    expect(image.width).toBe(0);
    expect(image.data.length).toBe(0);
  });

  it("ctx.reset clears pixels and state", () => {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 100, 50);
    ctx.lineWidth = 9;
    ctx.save();
    ctx.reset();
    expect(image.getPixelRGBA_separate(10, 10)).toEqual(new Uint8Array([0, 0, 0, 0]));
    expect(ctx.fillStyle).toBe("#000000");
    expect(ctx.lineWidth).toBe(1);
    ctx.restore(); // stack was cleared, so this must not bring back lineWidth 9
    expect(ctx.lineWidth).toBe(1);
  });
});

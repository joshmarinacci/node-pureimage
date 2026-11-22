import { describe, expect, it } from "vitest";
import * as pureimage from "../src/index";
import { Path2D } from "../src/index";

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];

// a 100x50 canvas filled red, with green fill and stroke styles
function setup() {
  const image = pureimage.make(100, 50);
  const ctx = image.getContext("2d");
  ctx.fillStyle = "#f00";
  ctx.fillRect(0, 0, 100, 50);
  ctx.fillStyle = "#0f0";
  ctx.strokeStyle = "#0f0";
  const px = (x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));
  return { ctx, px };
}

describe("Path2D drawing", () => {
  it("fills without touching the context's own path", () => {
    const { ctx, px } = setup();
    ctx.rect(60, 0, 20, 20);
    const path = new Path2D();
    path.rect(0, 0, 20, 20);
    ctx.fill(path);
    expect(px(10, 10)).toEqual(GREEN);
    expect(px(70, 10)).toEqual(RED);
    ctx.fill();
    expect(px(70, 10)).toEqual(GREEN);
  });

  it("is transformed when drawn, not when built", () => {
    const { ctx, px } = setup();
    const path = new Path2D();
    path.rect(0, 0, 10, 10);
    ctx.translate(50, 20);
    ctx.fill(path);
    expect(px(55, 25)).toEqual(GREEN);
    expect(px(5, 5)).toEqual(RED);
  });

  it("fills with a fill rule", () => {
    const { ctx, px } = setup();
    const path = new Path2D();
    path.rect(0, 0, 40, 40);
    path.rect(10, 10, 20, 20);
    ctx.fill(path, "evenodd");
    expect(px(5, 5)).toEqual(GREEN);
    expect(px(20, 20)).toEqual(RED);
  });

  it("strokes with the current line styles", () => {
    const { ctx, px } = setup();
    const path = new Path2D();
    path.moveTo(10, 25);
    path.lineTo(90, 25);
    ctx.lineWidth = 10;
    ctx.stroke(path);
    expect(px(50, 22)).toEqual(GREEN);
    expect(px(50, 32)).toEqual(RED);
  });

  it("clips", () => {
    const { ctx, px } = setup();
    const path = new Path2D();
    path.rect(0, 0, 50, 50);
    ctx.clip(path);
    ctx.fillRect(0, 0, 100, 50);
    expect(px(25, 25)).toEqual(GREEN);
    expect(px(75, 25)).toEqual(RED);
  });

  it("hit-tests with isPointInPath and isPointInStroke", () => {
    const { ctx } = setup();
    const path = new Path2D();
    path.rect(20, 20, 20, 20);
    expect(ctx.isPointInPath(path, 30, 30)).toBe(true);
    expect(ctx.isPointInPath(path, 10, 10)).toBe(false);
    expect(ctx.isPointInStroke(path, 20, 30)).toBe(true);
    expect(ctx.isPointInStroke(path, 30, 30)).toBe(false);
    ctx.translate(-20, -20); // the transform applies at test time
    expect(ctx.isPointInPath(path, 10, 10)).toBe(true);
  });

  it("rejects arguments that aren't a Path2D", () => {
    const { ctx } = setup();
    expect(() => ctx.fill({}, "nonzero")).toThrow(TypeError);
    expect(() => ctx.fill(null)).toThrow(TypeError); // read as the fill rule "null"
    expect(() => ctx.stroke({})).toThrow(TypeError);
    expect(() => ctx.clip([], "evenodd")).toThrow(TypeError);
    expect(() => ctx.isPointInPath(null, 1, 1, "nonzero")).toThrow(TypeError);
    expect(() => ctx.isPointInPath(new Path2D(), 1, 1, null)).toThrow(TypeError);
    expect(() => ctx.isPointInStroke({}, 1, 1)).toThrow(TypeError);
  });
});

describe("Path2D construction", () => {
  it("copies another path, independently", () => {
    const a = new Path2D();
    a.rect(0, 0, 10, 10);
    const b = new Path2D(a);
    b.rect(20, 0, 10, 10);
    const { ctx } = setup();
    expect(ctx.isPointInPath(a, 25, 5)).toBe(false);
    expect(ctx.isPointInPath(b, 25, 5)).toBe(true);
    expect(ctx.isPointInPath(b, 5, 5)).toBe(true);
  });

  it("validates arguments like the context does", () => {
    const path = new Path2D();
    expect(() => path.arc(10, 10, -5, 0, 1)).toThrow(DOMException);
    expect(() => path.lineTo(1)).toThrow(TypeError);
    path.lineTo(NaN, 0); // ignored
    expect(path.path).toHaveLength(0);
  });

  it("adds paths, optionally transformed", () => {
    const square = new Path2D();
    square.rect(0, 0, 10, 10);
    const path = new Path2D();
    path.addPath(square);
    path.addPath(square, { e: 50, f: 20 });
    const { ctx } = setup();
    expect(ctx.isPointInPath(path, 5, 5)).toBe(true);
    expect(ctx.isPointInPath(path, 55, 25)).toBe(true);
    expect(ctx.isPointInPath(path, 30, 25)).toBe(false);
    expect(() => path.addPath({})).toThrow(TypeError);
    expect(() => path.addPath(square, { a: 1, m11: 2 })).toThrow(TypeError);
    const before = path.path.length;
    path.addPath(square, { a: NaN }); // a non-finite matrix adds nothing
    expect(path.path).toHaveLength(before);
  });
});

describe("Path2D SVG path data", () => {
  const inside = (d: string, x: number, y: number) => setup().ctx.isPointInPath(new Path2D(d), x, y);

  it("parses absolute and relative lines", () => {
    expect(inside("M 10 10 L 30 10 L 30 30 Z", 25, 15)).toBe(true);
    expect(inside("M10,10 l20,0 l0,20 z", 25, 15)).toBe(true);
    expect(inside("M10 10 H30 V30 H10 Z", 15, 25)).toBe(true);
    expect(inside("m10 10 h20 v20 h-20 z", 15, 25)).toBe(true);
    // further pairs after a moveto are linetos
    expect(inside("M10 10 30 10 30 30z", 25, 15)).toBe(true);
  });

  it("parses compact number syntax", () => {
    // signs and second decimal points start new numbers
    expect(inside("M10-10L30-10L30,30Z", 25, 0)).toBe(true);
    expect(inside("M.5.5L30.5.5L30.5 30Z", 25, 5)).toBe(true);
    expect(inside("M1e1 1e1 L3e1 1e1 L3e1 3e1Z", 25, 15)).toBe(true);
  });

  it("parses curves, including smooth ones", () => {
    // a cubic hump over the line from (10, 40) to (90, 40)
    expect(inside("M10 40 C10 0 90 0 90 40 Z", 50, 20)).toBe(true);
    expect(inside("M10 40 C10 0 90 0 90 40 Z", 50, 5)).toBe(false);
    expect(inside("M10 40 Q50 0 90 40 Z", 50, 25)).toBe(true);
    // S reflects the previous control point: a wave that goes up, then down
    expect(inside("M10 25 C10 5 50 5 50 25 S90 45 90 25 Z", 30, 15)).toBe(true);
    expect(inside("M10 25 C10 5 50 5 50 25 S90 45 90 25 Z", 70, 35)).toBe(true);
    expect(inside("M10 25 Q30 5 50 25 T90 25 Z", 70, 30)).toBe(true);
  });

  it("parses arcs, including flags without separators", () => {
    // a half circle of radius 20 around (50, 25), above the diameter
    expect(inside("M30 25 A20 20 0 0 1 70 25 Z", 50, 10)).toBe(true);
    expect(inside("M30 25 A20 20 0 0 1 70 25 Z", 50, 40)).toBe(false);
    // the other sweep goes below
    expect(inside("M30 25 A20 20 0 0 0 70 25 Z", 50, 40)).toBe(true);
    expect(inside("M30 25A20 20 0 0170 25Z", 50, 10)).toBe(true);
    // radii too small to span the ends are scaled up
    expect(inside("M30 25 A1 1 0 0 1 70 25 Z", 50, 10)).toBe(true);
  });

  it("keeps the path up to the first error", () => {
    expect(inside("M10 10 L30 10 L30 30 Z L oops", 25, 15)).toBe(true);
    expect(new Path2D("L10 10 L20 20").path).toHaveLength(0); // must start with a moveto
    expect(new Path2D("M10 10 L20").path).toHaveLength(1);
    expect(new Path2D("").path).toHaveLength(0);
  });
});

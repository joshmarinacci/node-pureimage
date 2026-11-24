import { describe, expect, it } from "vitest";
import * as pureimage from "../src/index";
import { CanvasGradient } from "../src/index";

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const CLEAR = [0, 0, 0, 0];

function canvas(w = 100, h = 50) {
  const image = pureimage.make(w, h);
  const ctx = image.getContext("2d");
  ctx.clearRect(0, 0, w, h); // start transparent, as a browser canvas does
  const px = (x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));
  // fill the whole canvas with a gradient
  const paint = (g: CanvasGradient) => {
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  return { ctx, px, paint };
}

describe("color stops", () => {
  it("interpolates every channel, alpha included, without premultiplying", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createLinearGradient(0, 0, 100, 0);
    g.addColorStop(0, "rgba(255,255,0,0)");
    g.addColorStop(1, "rgba(0,0,255,1)");
    paint(g);
    // at x = 25.5, a quarter of the way along
    expect(px(25, 25)).toEqual([190, 190, 65, 65]);
  });

  it("extends the end colors beyond the outermost stops", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createLinearGradient(0, 0, 100, 0);
    g.addColorStop(0.4, "#0f0");
    g.addColorStop(0.6, "#0f0");
    paint(g);
    expect(px(5, 25)).toEqual(GREEN);
    expect(px(95, 25)).toEqual(GREEN);
  });

  it("sorts stops by offset, keeping the order of stops at the same offset", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createLinearGradient(0, 0, 100, 0);
    g.addColorStop(1, "#f00");
    g.addColorStop(0.5, "#f00"); // ends the first half
    g.addColorStop(0, "#0f0");
    g.addColorStop(0.5, "#00f"); // starts the second half
    paint(g);
    expect(px(48, 25)[0]).toBeGreaterThan(240);
    expect(px(52, 25)[2]).toBeGreaterThan(240);
  });

  it("applies stops added after the gradient was set as the fill style", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createLinearGradient(0, 0, 100, 0);
    g.addColorStop(0, "#f00");
    paint(g);
    g.addColorStop(0, "#0f0");
    paint(g);
    expect(px(50, 25)).toEqual(GREEN);
  });

  it("validates offsets and colors", () => {
    const g = canvas().ctx.createLinearGradient(0, 0, 100, 0);
    expect(() => g.addColorStop(-0.1, "#000")).toThrow(expect.objectContaining({ name: "IndexSizeError" }));
    expect(() => g.addColorStop(1.1, "#000")).toThrow(expect.objectContaining({ name: "IndexSizeError" }));
    expect(() => g.addColorStop(NaN, "#000")).toThrow(TypeError);
    expect(() => g.addColorStop(Infinity, "#000")).toThrow(TypeError);
    expect(() => g.addColorStop(0, "not a color")).toThrow(expect.objectContaining({ name: "SyntaxError" }));
    expect(g.stops).toHaveLength(0);
  });
});

describe("linear gradients", () => {
  it("are positioned in user space at fill time", () => {
    const { ctx, px } = canvas();
    const g = ctx.createLinearGradient(0, 0, 100, 0);
    g.addColorStop(0, "#0f0");
    g.addColorStop(0.5, "#0f0");
    g.addColorStop(0.5, "#f00");
    g.addColorStop(1, "#f00");
    ctx.fillStyle = g;
    ctx.translate(50, 0); // moves the gradient's halfway point to x = 100
    ctx.fillRect(-50, 0, 100, 50);
    expect(px(90, 25)).toEqual(GREEN);
  });

  it("reject non-finite arguments", () => {
    const { ctx } = canvas();
    expect(() => ctx.createLinearGradient(0, 0, NaN, 0)).toThrow(TypeError);
    expect(() => ctx.createLinearGradient(0, Infinity, 1, 0)).toThrow(TypeError);
  });
});

describe("radial gradients", () => {
  it("run from the start circle to the end circle", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createRadialGradient(50, 25, 10, 50, 25, 20);
    g.addColorStop(0, "#0f0");
    g.addColorStop(0.5, "#0f0");
    g.addColorStop(0.5, "#f00");
    g.addColorStop(1, "#f00");
    paint(g);
    // ω is how far a point's distance from the centre is from 10 towards 20
    expect(px(50, 25)).toEqual(GREEN); // inside the start circle: ω < 0
    expect(px(50, 13)).toEqual(GREEN); // distance 11.5: ω = 0.15
    expect(px(50, 7)).toEqual(RED); // distance 17.5: ω = 0.75
    expect(px(90, 25)).toEqual(RED); // beyond the end circle: ω > 1
  });

  it("paint only the cone when neither circle contains the other", () => {
    const { ctx, px, paint } = canvas();
    // two circles of radius 5 side by side: a cylinder along y = 25
    const g = ctx.createRadialGradient(20, 25, 5, 40, 25, 5);
    g.addColorStop(0, "#0f0");
    g.addColorStop(1, "#0f0");
    paint(g);
    expect(px(60, 25)).toEqual(GREEN);
    expect(px(60, 35)).toEqual(CLEAR);
  });

  it("paint nothing when both circles are the same", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createRadialGradient(50, 25, 10, 50, 25, 10);
    g.addColorStop(0, "#0f0");
    paint(g);
    expect(px(50, 25)).toEqual(CLEAR);
  });

  it("reject negative radii and non-finite arguments", () => {
    const { ctx } = canvas();
    expect(() => ctx.createRadialGradient(0, 0, -1, 0, 0, 1)).toThrow(
      expect.objectContaining({ name: "IndexSizeError" }),
    );
    expect(() => ctx.createRadialGradient(0, 0, 1, 0, NaN, 1)).toThrow(TypeError);
  });
});

describe("conic gradients", () => {
  it("sweep clockwise from the start angle", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createConicGradient(0, 50, 25);
    g.addColorStop(0, "#0f0");
    g.addColorStop(0.5, "#0f0");
    g.addColorStop(0.5, "#f00");
    g.addColorStop(1, "#f00");
    paint(g);
    // the first half turn goes from the right, down through the bottom, to the left
    expect(px(50, 45)).toEqual(GREEN);
    expect(px(50, 5)).toEqual(RED);
  });

  it("rotate by the start angle", () => {
    const { ctx, px, paint } = canvas();
    const g = ctx.createConicGradient(Math.PI, 50, 25);
    g.addColorStop(0, "#0f0");
    g.addColorStop(0.5, "#0f0");
    g.addColorStop(0.5, "#f00");
    g.addColorStop(1, "#f00");
    paint(g);
    expect(px(50, 5)).toEqual(GREEN);
    expect(px(50, 45)).toEqual(RED);
  });

  it("reject non-finite arguments", () => {
    const { ctx } = canvas();
    expect(() => ctx.createConicGradient(NaN, 0, 0)).toThrow(TypeError);
    expect(() => ctx.createConicGradient(0, 0, Infinity)).toThrow(TypeError);
  });
});

describe("CanvasGradient", () => {
  it("is the class of every kind of gradient", () => {
    const { ctx } = canvas();
    expect(ctx.createLinearGradient(0, 0, 1, 0)).toBeInstanceOf(CanvasGradient);
    expect(ctx.createRadialGradient(0, 0, 1, 0, 0, 2)).toBeInstanceOf(CanvasGradient);
    expect(ctx.createConicGradient(0, 0, 0)).toBeInstanceOf(CanvasGradient);
  });
});

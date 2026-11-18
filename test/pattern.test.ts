import { describe, expect, it } from "vitest";
import * as pureimage from "../src/index";

const px = (image, x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));

/** A 2x2 tile: red, green on top; blue, white below. */
function tile() {
  const t = pureimage.make(2, 2);
  t.setPixelRGBA(0, 0, 0xff0000ff);
  t.setPixelRGBA(1, 0, 0x00ff00ff);
  t.setPixelRGBA(0, 1, 0x0000ffff);
  t.setPixelRGBA(1, 1, 0xffffffff);
  return t;
}

function canvas(w = 10, h = 10) {
  const image = pureimage.make(w, h);
  const ctx = image.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  return { image, ctx };
}

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const BLUE = [0, 0, 255, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

describe("createPattern", () => {
  it("returns a CanvasPattern that fillStyle and strokeStyle return as-is", () => {
    const { ctx } = canvas();
    const p = ctx.createPattern(tile(), "repeat");
    expect(p).toBeInstanceOf(pureimage.CanvasPattern);
    ctx.fillStyle = p;
    ctx.strokeStyle = p;
    expect(ctx.fillStyle).toBe(p);
    expect(ctx.strokeStyle).toBe(p);
    ctx.fillStyle = "#f00";
    expect(ctx.fillStyle).toBe("#ff0000");
  });

  it("repeats the tile in both directions", () => {
    const { image, ctx } = canvas();
    ctx.fillStyle = ctx.createPattern(tile(), "repeat");
    ctx.fillRect(0, 0, 10, 10);
    expect(px(image, 0, 0)).toEqual(RED);
    expect(px(image, 1, 0)).toEqual(GREEN);
    expect(px(image, 0, 1)).toEqual(BLUE);
    expect(px(image, 7, 9)).toEqual(WHITE);
  });

  it.each([
    // repetition, pixel beyond the tile in x, in y
    ["no-repeat", CLEAR, CLEAR],
    ["repeat-x", RED, CLEAR],
    ["repeat-y", CLEAR, RED],
  ])("%s", (repetition, beyondX, beyondY) => {
    const { image, ctx } = canvas();
    ctx.fillStyle = ctx.createPattern(tile(), repetition);
    ctx.fillRect(0, 0, 10, 10);
    expect(px(image, 1, 1)).toEqual(WHITE);
    expect(px(image, 4, 0)).toEqual(beyondX);
    expect(px(image, 0, 4)).toEqual(beyondY);
  });

  it("treats null and the empty string as repeat", () => {
    const { image, ctx } = canvas();
    for (const rep of [null, ""]) {
      ctx.fillStyle = ctx.createPattern(tile(), rep);
      ctx.fillRect(0, 0, 10, 10);
      expect(px(image, 6, 6)).toEqual(RED);
    }
  });

  it("follows the current transform", () => {
    const { image, ctx } = canvas();
    ctx.translate(1, 0);
    ctx.fillStyle = ctx.createPattern(tile(), "no-repeat");
    ctx.fillRect(-1, 0, 10, 10);
    expect(px(image, 0, 0)).toEqual(CLEAR);
    expect(px(image, 1, 0)).toEqual(RED);
    expect(px(image, 2, 0)).toEqual(GREEN);
  });

  it("applies the pattern's own transform", () => {
    const { image, ctx } = canvas();
    const p = ctx.createPattern(tile(), "no-repeat");
    p.setTransform({ a: 2, d: 2 }); // each tile pixel covers 2x2 canvas pixels
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, 10, 10);
    expect(px(image, 1, 1)).toEqual(RED);
    expect(px(image, 2, 0)).toEqual(GREEN);
    expect(px(image, 3, 3)).toEqual(WHITE);
    expect(px(image, 4, 4)).toEqual(CLEAR);
  });

  it("works as a stroke style", () => {
    const { image, ctx } = canvas();
    ctx.strokeStyle = ctx.createPattern(tile(), "repeat");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(10, 5);
    ctx.stroke();
    expect(px(image, 0, 4)).toEqual(RED);
    expect(px(image, 1, 5)).toEqual(WHITE);
    expect(px(image, 0, 0)).toEqual(CLEAR);
  });

  it("snapshots the source so later changes don't affect it", () => {
    const src = tile();
    const { image, ctx } = canvas();
    const p = ctx.createPattern(src, "repeat");
    src.setPixelRGBA(0, 0, 0x000000ff);
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, 10, 10);
    expect(px(image, 0, 0)).toEqual(RED);
  });

  it("rejects bad arguments", () => {
    const { ctx } = canvas();
    expect(() => ctx.createPattern(null, "repeat")).toThrow(TypeError);
    expect(() => ctx.createPattern("image.png", "repeat")).toThrow(TypeError);
    for (const rep of ["Repeat", "repeat\0", "invalid", undefined]) {
      expect(() => ctx.createPattern(tile(), rep)).toThrow(expect.objectContaining({ name: "SyntaxError" }));
    }
    const empty = pureimage.make(1, 1);
    empty.width = 0;
    expect(() => ctx.createPattern(empty, "repeat")).toThrow(
      expect.objectContaining({ name: "InvalidStateError" }),
    );
  });

  it("setTransform rejects mismatched aliases and ignores non-finite values", () => {
    const { image, ctx } = canvas();
    const p = ctx.createPattern(tile(), "no-repeat");
    expect(() => p.setTransform({ a: 1, m11: 2 })).toThrow(TypeError);
    p.setTransform({ a: Infinity });
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, 10, 10);
    expect(px(image, 0, 0)).toEqual(RED); // transform unchanged
  });
});

describe("gradient strokes", () => {
  it("stroke uses a gradient strokeStyle", () => {
    const { image, ctx } = canvas();
    const g = ctx.createLinearGradient(0, 0, 10, 0);
    g.addColorStop(0, "#00f");
    g.addColorStop(1, "#00f");
    ctx.strokeStyle = g;
    expect(ctx.strokeStyle).toBe(g);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(10, 5);
    ctx.stroke();
    expect(px(image, 5, 5)).toEqual(BLUE);
  });

  it("stroke leaves a gradient fillStyle in place", () => {
    const { ctx } = canvas();
    const g = ctx.createLinearGradient(0, 0, 10, 0);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(10, 5);
    ctx.stroke();
    expect(ctx.fillStyle).toBe(g);
  });

  it("a zero-length linear gradient paints nothing", () => {
    const { image, ctx } = canvas();
    const g = ctx.createLinearGradient(5, 5, 5, 5);
    g.addColorStop(0, "#f00");
    g.addColorStop(1, "#f00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 10, 10);
    expect(px(image, 5, 5)).toEqual(CLEAR);
  });
});

import { describe, beforeEach, expect, it } from "vitest";
import * as pureimage from "../src/index";

// values that differ from the defaults, for every property that save()/restore() must cover
const STATE_PROPS: [string, any][] = [
  ["fillStyle", "#ff0000"],
  ["strokeStyle", "#00ff00"],
  ["lineWidth", 5],
  ["lineCap", "round"],
  ["lineJoin", "round"],
  ["miterLimit", 3],
  ["globalAlpha", 0.5],
  ["globalCompositeOperation", "copy"],
  ["shadowBlur", 5],
  ["shadowColor", "#ff0000"],
  ["shadowOffsetX", 5],
  ["shadowOffsetY", 5],
  ["textAlign", "center"],
  ["textBaseline", "top"],
  ["imageSmoothingEnabled", false],
  ["font", "20px Arial"],
];

describe("canvas state", () => {
  let image;
  let ctx;

  beforeEach(() => {
    image = pureimage.make(100, 50);
    ctx = image.getContext("2d");
  });

  it.each(STATE_PROPS)("save/restore round-trips %s", (prop, value) => {
    const old = ctx[prop];
    ctx.save();
    ctx[prop] = value;
    expect(ctx[prop]).not.toEqual(old);
    ctx.restore();
    expect(ctx[prop]).toEqual(old);
  });

  it("has spec default values", () => {
    expect(ctx.fillStyle).toBe("#000000");
    expect(ctx.strokeStyle).toBe("#000000");
    expect(ctx.lineWidth).toBe(1);
    expect(ctx.lineCap).toBe("butt");
    expect(ctx.lineJoin).toBe("miter");
    expect(ctx.miterLimit).toBe(10);
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.globalCompositeOperation).toBe("source-over");
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.shadowOffsetX).toBe(0);
    expect(ctx.shadowOffsetY).toBe(0);
  });

  it("restored fillStyle is used for drawing", () => {
    ctx.fillStyle = "#00ff00";
    ctx.save();
    ctx.fillStyle = "#ff0000";
    ctx.restore();
    ctx.fillRect(0, 0, 100, 50);
    expect(image.getPixelRGBA_separate(10, 10)).toEqual(new Uint8Array([0, 255, 0, 255]));
  });

  it("nested saves restore in LIFO order", () => {
    ctx.lineWidth = 1;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.restore();
    expect(ctx.lineWidth).toBe(2);
    ctx.restore();
    expect(ctx.lineWidth).toBe(1);
  });

  it("supports a deep stack of saves", () => {
    const depth = 512;
    for (let i = 1; i <= depth; i++) {
      ctx.lineWidth = i;
      ctx.save();
    }
    for (let i = depth; i >= 1; i--) {
      ctx.restore();
      expect(ctx.lineWidth).toBe(i);
    }
  });

  it("restore with an empty stack does nothing", () => {
    ctx.lineWidth = 4;
    ctx.restore();
    ctx.restore();
    expect(ctx.lineWidth).toBe(4);
  });

  it("restore does not change the current path", () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.save();
    ctx.lineTo(10, 10);
    ctx.restore();
    expect(ctx.path.length).toBe(2);
  });

  it("clip works without calling beginPath first", () => {
    ctx.rect(0, 0, 10, 10);
    expect(() => ctx.clip()).not.toThrow();
  });

  it("restore removes the clip", () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 10, 10);
    ctx.clip();
    ctx.restore();
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 100, 50);
    expect(image.getPixelRGBA_separate(50, 25)).toEqual(new Uint8Array([255, 0, 0, 255]));
  });

  it("restore restores the transform", () => {
    ctx.save();
    ctx.translate(10, 10);
    ctx.restore();
    const m = ctx.getTransform();
    expect(m.e).toBe(0);
    expect(m.f).toBe(0);
  });

  it("path functions before beginPath do not throw", () => {
    expect(() => {
      ctx.moveTo(0, 0);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }).not.toThrow();
  });

  it("closePath and fill with an empty path do nothing", () => {
    ctx.closePath();
    ctx.fill();
    expect(ctx.path.length).toBe(0);
  });
});

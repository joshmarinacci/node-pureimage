import { describe, expect, it } from "vitest";
import * as pureimage from "../src/index";

const context = () => pureimage.make(100, 50).getContext("2d");

describe("isPointInPath", () => {
  it("counts points inside and on the edge, but not outside", () => {
    const ctx = context();
    ctx.rect(0, 0, 20, 20);
    expect(ctx.isPointInPath(10, 10)).toBe(true);
    expect(ctx.isPointInPath(20, 20)).toBe(true);
    expect(ctx.isPointInPath(10, 0)).toBe(true);
    expect(ctx.isPointInPath(10, -0.01)).toBe(false);
    expect(ctx.isPointInPath(20.01, 10)).toBe(false);
  });

  it("is false for an empty path and non-finite points", () => {
    const ctx = context();
    expect(ctx.isPointInPath(0, 0)).toBe(false);
    ctx.rect(-10, -10, 20, 20);
    expect(ctx.isPointInPath(NaN, 0)).toBe(false);
    expect(ctx.isPointInPath(0, Infinity)).toBe(false);
  });

  it("applies the fill rule", () => {
    const ctx = context();
    ctx.rect(0, 0, 40, 40);
    ctx.rect(10, 10, 20, 20);
    expect(ctx.isPointInPath(20, 20)).toBe(true);
    expect(ctx.isPointInPath(20, 20, "evenodd")).toBe(false);
    expect(ctx.isPointInPath(5, 5, "evenodd")).toBe(true);
    expect(() => ctx.isPointInPath(5, 5, "bogus")).toThrow(TypeError);
  });

  it("treats unclosed subpaths as closed", () => {
    const ctx = context();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(20, 20);
    expect(ctx.isPointInPath(15, 5)).toBe(true);
    expect(ctx.isPointInPath(5, 15)).toBe(false);
  });

  it("follows curves", () => {
    const ctx = context();
    ctx.arc(50, 25, 10, 0, Math.PI); // the lower half of a circle
    expect(ctx.isPointInPath(50, 30)).toBe(true);
    expect(ctx.isPointInPath(50, 20)).toBe(false);
    expect(ctx.isPointInPath(58, 33)).toBe(false); // in the bounding box, outside the arc
  });

  it("tests canvas coordinates, using the transform the path was built with", () => {
    const ctx = context();
    ctx.translate(50, 0);
    ctx.rect(0, 0, 20, 20);
    ctx.translate(0, 50); // ignored: the path is already built
    expect(ctx.isPointInPath(60, 10)).toBe(true);
    expect(ctx.isPointInPath(10, 10)).toBe(false);
  });

  it("works under huge transforms but is false under non-invertible ones", () => {
    const ctx = context();
    ctx.scale(Number.MAX_VALUE, Number.MAX_VALUE);
    ctx.rect(-10, -10, 20, 20);
    expect(ctx.isPointInPath(0, 0)).toBe(true);
    ctx.resetTransform();
    ctx.beginPath();
    ctx.scale(0, 0);
    ctx.rect(-10, -10, 20, 20);
    expect(ctx.isPointInPath(0, 0)).toBe(false);
  });

  it("requires two arguments", () => {
    expect(() => context().isPointInPath(1)).toThrow(TypeError);
  });
});

describe("isPointInStroke", () => {
  it("covers the area the stroke would paint", () => {
    const ctx = context();
    ctx.lineWidth = 10;
    ctx.moveTo(0, 10);
    ctx.lineTo(40, 10);
    expect(ctx.isPointInStroke(20, 10)).toBe(true);
    expect(ctx.isPointInStroke(20, 15)).toBe(true); // on the outline's edge
    expect(ctx.isPointInStroke(20, 16)).toBe(false);
    expect(ctx.isPointInStroke(42, 10)).toBe(false); // butt caps end at the end point
    ctx.lineCap = "square";
    expect(ctx.isPointInStroke(42, 10)).toBe(true);
  });

  it("uses the current transform for the line width", () => {
    const ctx = context();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, 50);
    ctx.scale(10, 1);
    ctx.lineWidth = 2;
    expect(ctx.isPointInStroke(59, 25)).toBe(true);
    expect(ctx.isPointInStroke(61, 25)).toBe(false);
  });

  it("is false for non-finite points and non-invertible transforms", () => {
    const ctx = context();
    ctx.lineWidth = 10;
    ctx.moveTo(0, 10);
    ctx.lineTo(40, 10);
    expect(ctx.isPointInStroke(NaN, 10)).toBe(false);
    ctx.scale(0, 1);
    expect(ctx.isPointInStroke(20, 10)).toBe(false);
  });
});

describe("resetTransform", () => {
  it("resets to the identity matrix", () => {
    const ctx = context();
    ctx.translate(5, 7);
    ctx.scale(2, 3);
    ctx.resetTransform();
    const m = ctx.getTransform();
    expect([m.a, m.b, m.c, m.d, m.e, m.f]).toEqual([1, 0, 0, 1, 0, 0]);
  });
});

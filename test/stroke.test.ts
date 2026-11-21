import { describe, expect, it } from "vitest";
import * as pureimage from "../src/index";

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];

// stroke in green over a red 100x50 canvas
function stroke(draw: (ctx) => void) {
  const image = pureimage.make(100, 50);
  const ctx = image.getContext("2d");
  ctx.fillStyle = "#f00";
  ctx.fillRect(0, 0, 100, 50);
  ctx.strokeStyle = "#0f0";
  draw(ctx);
  return (x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));
}

describe("line style properties", () => {
  it("ignore invalid values", () => {
    const ctx = pureimage.make(10, 10).getContext("2d");
    ctx.lineWidth = 2;
    ctx.miterLimit = 3;
    for (const v of [0, -1, NaN, Infinity]) {
      ctx.lineWidth = v;
      ctx.miterLimit = v;
    }
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.miterLimit).toBe(3);
    ctx.lineCap = "round";
    ctx.lineJoin = "bevel";
    ctx.lineCap = "invalid";
    ctx.lineJoin = "Round";
    expect(ctx.lineCap).toBe("round");
    expect(ctx.lineJoin).toBe("bevel");
  });

  it("convert numeric strings", () => {
    const ctx = pureimage.make(10, 10).getContext("2d");
    ctx.lineWidth = "1e1";
    ctx.miterLimit = "1e1";
    expect(ctx.lineWidth).toBe(10);
    expect(ctx.miterLimit).toBe(10);
  });
});

describe("line caps", () => {
  // a horizontal line from x = 30 to 70, 20 wide
  const line = (cap: string) =>
    stroke((ctx) => {
      ctx.lineWidth = 20;
      ctx.lineCap = cap;
      ctx.moveTo(30, 25);
      ctx.lineTo(70, 25);
      ctx.stroke();
    });

  it("butt ends exactly at the end points", () => {
    const px = line("butt");
    expect(px(30, 25)).toEqual(GREEN);
    expect(px(29, 25)).toEqual(RED);
    expect(px(70, 25)).toEqual(RED);
  });

  it("square extends by half the line width", () => {
    const px = line("square");
    expect(px(21, 17)).toEqual(GREEN);
    expect(px(78, 33)).toEqual(GREEN);
    expect(px(19, 25)).toEqual(RED);
    expect(px(80, 25)).toEqual(RED);
  });

  it("round adds a half circle", () => {
    const px = line("round");
    expect(px(21, 25)).toEqual(GREEN);
    expect(px(78, 25)).toEqual(GREEN);
    expect(px(21, 16)).toEqual(RED); // outside the circle, inside a square cap
  });

  it("zero-length subpaths draw nothing, even with round caps", () => {
    const px = stroke((ctx) => {
      ctx.lineWidth = 40;
      ctx.lineCap = "round";
      ctx.moveTo(50, 25);
      ctx.lineTo(50, 25);
      ctx.stroke();
    });
    expect(px(50, 25)).toEqual(RED);
  });
});

describe("line joins", () => {
  // a right-angle corner at (50, 25), 20 wide: across the top, then down
  const corner = (join: string, miterLimit = 10) =>
    stroke((ctx) => {
      ctx.lineWidth = 20;
      ctx.lineJoin = join;
      ctx.miterLimit = miterLimit;
      ctx.moveTo(10, 25);
      ctx.lineTo(50, 25);
      ctx.lineTo(50, 50);
      ctx.stroke();
    });

  it("miter fills the outer corner square", () => {
    expect(corner("miter")(58, 16)).toEqual(GREEN);
  });

  it("bevel cuts the outer corner off", () => {
    const px = corner("bevel");
    expect(px(58, 16)).toEqual(RED);
    expect(px(53, 20)).toEqual(GREEN);
  });

  it("round rounds the outer corner", () => {
    const px = corner("round");
    expect(px(58, 16)).toEqual(RED);
    expect(px(56, 19)).toEqual(GREEN);
  });

  it("a miter longer than miterLimit is bevelled", () => {
    // a right angle's miter is √2 line widths long
    expect(corner("miter", 1.5)(58, 16)).toEqual(GREEN);
    expect(corner("miter", 1.4)(58, 16)).toEqual(RED);
  });

  it("closed subpaths join at their start instead of getting caps", () => {
    const px = stroke((ctx) => {
      ctx.lineWidth = 20;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.moveTo(20, 15);
      ctx.lineTo(80, 15);
      ctx.lineTo(80, 35);
      ctx.lineTo(20, 35);
      ctx.closePath();
      ctx.stroke();
    });
    expect(px(11, 6)).toEqual(GREEN); // the mitred corner at the start point
  });

  it("a round join where the line doubles back goes round the end", () => {
    const px = stroke((ctx) => {
      ctx.lineWidth = 40;
      ctx.lineJoin = "round";
      ctx.moveTo(10, 25);
      ctx.lineTo(50, 25);
      ctx.lineTo(10, 25);
      ctx.stroke();
    });
    expect(px(65, 25)).toEqual(GREEN);
    expect(px(5, 25)).toEqual(RED);
  });
});

describe("stroke transforms", () => {
  it("uses the transform in effect when stroking, not when the path was built", () => {
    // a path built untransformed, stroked under scale(10, 1): vertical lines get 10x wider
    const px = stroke((ctx) => {
      ctx.moveTo(50, 0);
      ctx.lineTo(50, 50);
      ctx.save();
      ctx.scale(10, 1);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
    expect(px(41, 25)).toEqual(GREEN);
    expect(px(58, 25)).toEqual(GREEN);
    expect(px(38, 25)).toEqual(RED);
  });

  it("draws nothing under a non-invertible transform", () => {
    const px = stroke((ctx) => {
      ctx.moveTo(0, 25);
      ctx.lineTo(100, 25);
      ctx.scale(0, 1);
      ctx.lineWidth = 50;
      ctx.stroke();
    });
    expect(px(50, 25)).toEqual(RED);
  });
});

describe("wide strokes of curves", () => {
  it("cover only the swept area when wider than the curve's radius", () => {
    // upper half circle around (50, 50), radius 25, 100 wide: everything within 75 of the
    // centre above y = 50, and nothing below
    const px = stroke((ctx) => {
      ctx.lineWidth = 100;
      ctx.arc(50, 50, 25, Math.PI, 0);
      ctx.stroke();
    });
    expect(px(50, 25)).toEqual(GREEN);
    expect(px(5, 45)).toEqual(GREEN);
    expect(px(50, 48)).toEqual(GREEN);
  });

  it("keep their ends square to the curve", () => {
    // a quarter circle from (100, 50) up to (50, 0) around (50, 50), with butt ends
    const px = stroke((ctx) => {
      ctx.lineWidth = 40;
      ctx.arc(50, 50, 50, 0, -Math.PI / 2, true);
      ctx.stroke();
    });
    expect(px(75, 10)).toEqual(GREEN);
    expect(px(48, 10)).toEqual(RED); // just past the end at x = 50
    expect(px(90, 48)).toEqual(GREEN);
  });
});

describe("strokeRect", () => {
  it("strokes a flat rect as a line that joins at both ends", () => {
    const flat = (join: string) =>
      stroke((ctx) => {
        ctx.lineWidth = 20;
        ctx.lineJoin = join;
        ctx.lineCap = "round"; // closed, so caps don't apply
        ctx.strokeRect(30, 25, 40, 0);
      });
    expect(flat("round")(25, 25)).toEqual(GREEN);
    expect(flat("miter")(25, 25)).toEqual(RED);
    expect(flat("miter")(50, 20)).toEqual(GREEN);
  });
});

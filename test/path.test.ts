import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { save } from "./common";

describe("draw rect", () => {
  let image;
  let c;
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
  });
  it("fill square with fillRect()", async () => {
    c.fillStyle = "black";
    c.fillRect(10, 10, 90, 90);
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    expect(image.getPixelRGBA(100, 100)).to.eq(WHITE);
    await save(image, "path/rect/fill_square-fillRect");
  });
  it("fill rect partially outside of buffer", async () => {
    c.fillStyle = "black";
    c.fillRect(100, 100, 200, 200);
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    expect(image.getPixelRGBA(150, 150)).to.eq(BLACK);
    // expect(image.getPixelRGBA(100, 100)).to.eq(WHITE);
    await save(image, "path/rect/fill_outside-fillRect");
  });
  it("fill square with lines", async () => {
    c.beginPath();
    c.moveTo(10, 10);
    c.lineTo(100, 10);
    c.lineTo(100, 100);
    c.lineTo(10, 100);
    c.lineTo(10, 10);
    c.fillStyle = "black";
    c.fill();
    await save(image, "path/rect/fill_square-lineTo");
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
  });
  it("fill a square with rect", async () => {
    c.beginPath();
    c.rect(10, 10, 90, 90);
    c.fillStyle = "black";
    c.fill();
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/rect/fill_square-rect");
  });
  it("stroke square with strokeRect()", async () => {
    c.lineWidth = 1;
    c.strokeStyle = "black";
    // half-pixel coordinates put a 1px stroke exactly on a pixel row/column, as in browsers
    c.strokeRect(10.5, 10.5, 90, 90);
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(10, 50)).to.eq(BLACK);
    expect(image.getPixelRGBA(100, 50)).to.eq(BLACK);
    expect(image.getPixelRGBA(50, 50)).to.eq(WHITE);
    expect(image.getPixelRGBA(50, 10)).to.eq(BLACK);
    await save(image, "path/rect/stroke_square-strokeRect");
  });
  it("strokeRect honors lineWidth", () => {
    c.strokeStyle = "black";
    c.lineWidth = 20;
    c.strokeRect(50, 50, 100, 100);
    // a 20px stroke extends 10px either side of the edge
    expect(image.getPixelRGBA(42, 100)).to.eq(BLACK);
    expect(image.getPixelRGBA(57, 100)).to.eq(BLACK);
    expect(image.getPixelRGBA(100, 100)).to.eq(WHITE);
  });
  it("strokeRect honors the transform", () => {
    c.strokeStyle = "black";
    c.lineWidth = 2;
    c.translate(100, 0);
    c.strokeRect(10, 10, 50, 50);
    expect(image.getPixelRGBA(10, 30)).to.eq(WHITE);
    expect(image.getPixelRGBA(110, 30)).to.eq(BLACK);
  });
  it("strokeRect with zero width and height draws nothing", () => {
    c.strokeStyle = "black";
    c.lineWidth = 50;
    c.strokeRect(100, 100, 0, 0);
    expect(image.getPixelRGBA(100, 100)).to.eq(WHITE);
  });
  it("strokeRect leaves the current path alone", () => {
    c.beginPath();
    c.rect(0, 0, 20, 20);
    c.strokeRect(100, 100, 50, 50);
    c.fillStyle = "black";
    c.fill();
    expect(image.getPixelRGBA(10, 10)).to.eq(BLACK);
    expect(image.getPixelRGBA(125, 125)).to.eq(WHITE);
  });
  it("clearRect honors the transform", () => {
    c.scale(10, 10);
    c.translate(0, 5);
    c.clearRect(0, -5, 10, 5);
    expect(image.getPixelRGBA(50, 25)).to.eq(0x00000000);
    expect(image.getPixelRGBA(150, 25)).to.eq(WHITE);
    expect(image.getPixelRGBA(50, 75)).to.eq(WHITE);
  });
  it("clearRect handles rotated rects", () => {
    c.translate(100, 100);
    c.rotate(Math.PI / 4);
    c.clearRect(-20, -20, 40, 40);
    expect(image.getPixelRGBA(100, 100)).to.eq(0x00000000);
    // the corner of the unrotated square is outside the rotated one
    expect(image.getPixelRGBA(81, 81)).to.eq(WHITE);
  });
  it("stroke square with lines", async () => {
    c.beginPath();
    c.moveTo(10, 10);
    c.lineTo(100, 10);
    c.lineTo(100, 100);
    c.lineTo(10, 100);
    c.lineTo(10, 10);
    c.lineWidth = 1;
    c.strokeStyle = "black";
    c.stroke();
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(10,10)).to.eq(BLACK)
    // expect(image.getPixelRGBA(100,50)).to.eq(BLACK)
    await save(image, "path/rect/stroke_square-lineTo");
    expect(image.getPixelRGBA(101, 100)).to.eq(WHITE);
  });
  it("stroke a square with rect", async () => {
    c.beginPath();
    c.rect(10, 10, 90, 90);
    c.lineWidth = 1;
    c.strokeStyle = "black";
    c.stroke();
    await save(image, "path/rect/stroke_square-rect");
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(10,10)).to.eq(BLACK)
    // expect(image.getPixelRGBA(50,50)).to.eq(BLACK)
    expect(image.getPixelRGBA(101, 100)).to.eq(WHITE);
  });
});
describe("draw round rect", () => {
  let image;
  let c;
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
  });
  it("fills a round rect", async () => {
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
    c.fillStyle = "black";
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(10, 10, 100, 100, [30]);
    c.fill();
    await save(image, "path/roundRect/fill-roundRect");
    expect(image.getPixelRGBA(30, 30)).to.eq(BLACK);
    expect(image.getPixelRGBA(5, 5)).to.eq(WHITE);
  });
  it("strokes a round rect", async () => {
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
    c.strokeStyle = "black";
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(10, 10, 100, 100, [30]);
    c.closePath();
    c.stroke();
    await save(image, "path/roundRect/stroke-roundRect");
  });
});
describe("draw arcs", () => {
  let image;
  let c: pureimage.Context;
  // @ts-ignore
  const WHITE = 0xffffffff;
  // @ts-ignore
  const BLACK = 0x000000ff;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
  });
  it("fill a circle", async () => {
    c.fillStyle = "black";
    c.beginPath();
    c.arc(50, 50, 50, 0, Math.PI * 2, false);
    c.fill();
    // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    // expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/arc/fill_circle");
  });
  it("fill an arc", async () => {
    c.fillStyle = "black";
    c.beginPath();
    c.arc(50, 50, 50, 0, Math.PI, false);
    c.fill();
    // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    // expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/arc/fill_arc");
  });

  it("stroke a circle", async () => {
    c.strokeStyle = "black";
    c.beginPath();
    c.arc(50, 50, 50, 0, Math.PI * 2, false);
    c.stroke();
    // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    // expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/arc/stroke_circle");
  });
  it("stroke an arc", async () => {
    c.strokeStyle = "black";
    c.beginPath();
    c.arc(50, 50, 50, 0, Math.PI, false);
    c.closePath();
    c.stroke();
    // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    // expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/arc/stroke_arc");
  });
});
describe("draw quad arcs", () => {
  let image;
  let c: pureimage.Context;
  // @ts-ignore
  const WHITE = 0xffffffff;
  // @ts-ignore
  const BLACK = 0x000000ff;
  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
  });
  it("fill a quad curve", async () => {
    c.fillStyle = "black";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(100, 0);
    c.quadraticCurveTo(100, 100, 0, 100);
    c.lineTo(0, 0);
    c.closePath();
    // c.arc(50, 50, 50, 0, Math.PI * 2, false);
    c.fill();
    // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    // expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/quad/fill_quad");
  });
  it("stroke a quad curve", async () => {
    c.strokeStyle = "black";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(100, 0);
    c.quadraticCurveTo(100, 100, 0, 100);
    c.lineTo(0, 0);
    c.closePath();
    // c.arc(50, 50, 50, 0, Math.PI * 2, false);
    c.stroke();
    // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
    // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
    // expect(image.getPixelRGBA(101, 101)).to.eq(WHITE);
    await save(image, "path/quad/stroke_quad");
  });
});
describe("draw paths", () => {
  let image;
  let c;
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
  });
  it("canvas is empty and clear", () => {
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
  });
  it("bezier curve", async () => {
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);

    c.fillStyle = "black";
    c.beginPath();
    c.moveTo(10, 10);
    c.bezierCurveTo(50, 50, 100, 50, 10, 100);
    c.lineTo(10, 10);
    c.fill();
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(19, 39)).to.eq(BLACK);
    await save(image, "bezier1");
  });
  it("arc", async () => {
    // should look the same as
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc

    let img = pureimage.make(200, 200);
    let ctx = img.getContext("2d");
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "black";

    // Draw shapes
    for (let i = 0; i <= 3; i++) {
      for (let j = 0; j <= 2; j++) {
        ctx.beginPath();
        let x = 25 + j * 50; // x coordinate
        let y = 25 + i * 50; // y coordinate
        let radius = 20; // Arc radius
        let startAngle = 0; // Starting point on circle
        let endAngle = Math.PI + (Math.PI * j) / 2; // End point on circle
        let anticlockwise = i % 2 === 1; // Draw anticlockwise

        if (i > 1) {
          ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
          ctx.fill();
        } else {
          ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
          ctx.stroke();
        }
      }
    }
    await save(img, "arc");
  });
});
describe("complex paths", () => {
  let image;
  let c;
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;
  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
  });
  it("north going polygon", async () => {
    let img = pureimage.make(200, 200);
    let ctx = img.getContext("2d");
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "black";
    ctx.moveTo(100, 100);
    ctx.lineTo(100, 120);
    ctx.lineTo(20, 120);
    ctx.lineTo(20, 50);
    ctx.fill();
    expect(img.getPixelRGBA(25, 110)).to.eq(BLACK);
    expect(img.getPixelRGBA(25, 90)).to.eq(BLACK);
    await save(img, "northgoing");
  });
  it("transparent polygon", () => {
    c.beginPath();
    c.moveTo(10, 10);
    c.lineTo(100, 10);
    c.lineTo(100, 100);
    c.lineTo(10, 100);
    c.lineTo(10, 10);
    c.fillStyle = "transparent";
    c.fill();
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(11, 11)).to.eq(WHITE);
    expect(image.getPixelRGBA(50, 50)).to.eq(WHITE);
    expect(image.getPixelRGBA(100, 100)).to.eq(WHITE);
  });
  it("draws thick square", async () => {
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
    c.beginPath();
    //square
    c.moveTo(10, 10);
    c.lineTo(60, 10);
    c.lineTo(60, 60);
    c.lineTo(120, 60);
    c.lineTo(120, 10);
    c.lineTo(180, 10);
    c.lineTo(180, 100);
    c.lineTo(10, 100);
    // c.lineTo(10,10)
    c.strokeStyle = "black";
    c.lineWidth = 4;
    c.fillStyle = "black";
    c.stroke();
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(10, 10)).to.eq(BLACK);
    await save(image, "thick_stroke_square");
  });
  it("draws a thin horizontal line", async () => {
    let image = pureimage.make(10, 10);
    let c = image.getContext("2d");
    c.imageSmoothingEnabled = true;
    c.fillStyle = "white";
    c.fillRect(0, 0, 10, 10);
    // c.debug = true
    c.beginPath();
    c.moveTo(2, 5);
    c.lineTo(8, 5);
    c.strokeStyle = "black";
    c.lineWidth = 1;
    c.stroke();
    expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
    expect(image.getPixelRGBA(5, 5)).to.eq(BLACK);
    await save(image, "think-h-stroke");
  });
  it("draws thick curve", async () => {
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);

    c.beginPath();
    c.moveTo(10, 10);
    c.bezierCurveTo(50, 50, 100, 50, 10, 100);
    c.lineTo(10, 10);
    c.strokeStyle = "black";
    c.lineWidth = 2;
    c.fillStyle = "black";
    c.stroke();
    await save(image, "thick_stroke_curve");
  });
});
describe("restroke test", () => {
  it("draws multiple lines", async () => {
    let image = pureimage.make(200, 200);
    let ctx = image.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 200);
    ctx.beginPath(); // Only needed in pureimage :/

    // First sub-path
    ctx.lineWidth = 26;
    ctx.strokeStyle = "rgba(255,165,0,0.5)";
    ctx.moveTo(20, 20);
    ctx.lineTo(160, 20);
    ctx.stroke();

    // Second sub-path
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(0,255,0,0.5)";
    ctx.moveTo(20, 80);
    ctx.lineTo(220, 80);
    ctx.stroke();

    // // Third sub-path
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,192,203,0.5)";
    ctx.moveTo(20, 140);
    ctx.lineTo(280, 140);
    ctx.stroke();

    await save(image, "restroke");
  });
});

describe("path building", () => {
  const RED = [255, 0, 0, 255];
  const GREEN = [0, 255, 0, 255];

  // a red 100x50 canvas, drawn on in green by `draw`
  function canvas(draw: (ctx) => void) {
    const image = pureimage.make(100, 50);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "#f00";
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = "#0f0";
    ctx.strokeStyle = "#0f0";
    draw(ctx);
    return (x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));
  }

  it("fills with the nonzero rule by default, and evenodd on request", () => {
    // an outer rect and an inner rect wound the same way
    const square = (ctx) => {
      ctx.rect(0, 0, 100, 50);
      ctx.rect(25, 12, 50, 25);
    };
    expect(canvas((ctx) => (square(ctx), ctx.fill()))(50, 25)).toEqual(GREEN);
    expect(canvas((ctx) => (square(ctx), ctx.fill("evenodd")))(50, 25)).toEqual(RED);
    expect(() => canvas((ctx) => ctx.fill("bogus"))).toThrow(TypeError);
  });

  it("clips with the given fill rule", () => {
    const px = canvas((ctx) => {
      ctx.rect(0, 0, 100, 50);
      ctx.rect(25, 12, 50, 25);
      ctx.clip("evenodd");
      ctx.fillRect(0, 0, 100, 50);
    });
    expect(px(5, 5)).toEqual(GREEN);
    expect(px(50, 25)).toEqual(RED);
  });

  it("fill closes subpaths without changing the path", () => {
    const px = canvas((ctx) => {
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(100, 50);
      ctx.fill(); // implicitly closed back to (0, 0) for filling only
      ctx.lineTo(0, 50); // continues the same, still-open subpath
      ctx.fill();
    });
    expect(px(10, 40)).toEqual(GREEN);
  });

  it("lineTo and curves on an empty path start a subpath instead of throwing", () => {
    const px = canvas((ctx) => {
      ctx.lineWidth = 50;
      ctx.beginPath();
      ctx.lineTo(0, 25); // becomes moveTo(0, 25)
      ctx.lineTo(100, 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.bezierCurveTo(0, 0, 50, 0, 100, 0);
      ctx.quadraticCurveTo(0, 0, 100, 0);
      ctx.stroke();
    });
    expect(px(50, 25)).toEqual(GREEN);
  });

  it("ignores path calls with non-finite arguments", () => {
    const px = canvas((ctx) => {
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(NaN, 50);
      ctx.bezierCurveTo(Infinity, 0, 0, 0, 0, 0);
      ctx.arcTo(0, 0, NaN, 0, 5);
      ctx.lineTo(100, 50);
      ctx.lineTo(0, 50);
      ctx.fill();
    });
    expect(px(50, 25)).toEqual(GREEN);
  });

  it("quadratic curves reach their end point", () => {
    const px = canvas((ctx) => {
      ctx.lineWidth = 50;
      ctx.moveTo(0, 25);
      ctx.quadraticCurveTo(100, 25, 100, 25);
      ctx.stroke();
    });
    expect(px(50, 25)).toEqual(GREEN);
    expect(px(98, 25)).toEqual(GREEN);
  });

  it("arc joins the current subpath with a line", () => {
    const px = canvas((ctx) => {
      ctx.lineWidth = 10;
      ctx.moveTo(0, 25);
      ctx.arc(90, 25, 10, Math.PI, Math.PI * 1.5); // starts at (80, 25)
      ctx.stroke();
    });
    // the joining line from (0, 25) to the arc's start
    expect(px(40, 25)).toEqual(GREEN);
    expect(px(40, 10)).toEqual(RED);
  });

  it("arc goes anticlockwise when asked", () => {
    // clockwise from 0 to π is the lower half (off-canvas below y = 0); anticlockwise is the upper
    const fill = (anticlockwise: boolean) =>
      canvas((ctx) => {
        ctx.arc(50, 0, 40, 0, Math.PI, anticlockwise);
        ctx.fill();
      })(50, 20);
    expect(fill(false)).toEqual(GREEN);
    expect(fill(true)).toEqual(RED);
  });

  it("a sweep of a full turn or more draws the whole circle", () => {
    const px = canvas((ctx) => {
      ctx.arc(50, 25, 20, 0, 2 * Math.PI + 1);
      ctx.fill();
    });
    expect(px(50, 10)).toEqual(GREEN);
    expect(px(50, 40)).toEqual(GREEN);
  });

  it("arc and arcTo reject negative radii", () => {
    const ctx = pureimage.make(10, 10).getContext("2d");
    expect(() => ctx.arc(0, 0, -1, 0, 1)).toThrow(expect.objectContaining({ name: "IndexSizeError" }));
    expect(() => ctx.arcTo(0, 0, 1, 1, -1)).toThrow(expect.objectContaining({ name: "IndexSizeError" }));
    expect(() => ctx.ellipse(0, 0, 1, -1, 0, 0, 1)).toThrow(expect.objectContaining({ name: "IndexSizeError" }));
  });

  it("arcTo rounds the corner between two lines", () => {
    const px = canvas((ctx) => {
      ctx.moveTo(0, 0);
      ctx.arcTo(100, 0, 100, 50, 40);
      ctx.lineTo(100, 50);
      ctx.lineTo(0, 50);
      ctx.fill();
    });
    expect(px(50, 25)).toEqual(GREEN);
    expect(px(97, 2)).toEqual(RED); // cut off by the rounded corner
    expect(px(55, 2)).toEqual(GREEN); // still on the straight part
  });

  it("arcTo with collinear points or a zero radius draws a straight line", () => {
    const px = canvas((ctx) => {
      ctx.lineWidth = 50;
      ctx.moveTo(0, 25);
      ctx.arcTo(50, 25, 100, 25, 10);
      ctx.arcTo(100, 25, 100, 50, 0);
      ctx.stroke();
    });
    expect(px(50, 25)).toEqual(GREEN);
    expect(px(97, 25)).toEqual(GREEN);
  });

  it("draws rotated ellipses", () => {
    const px = canvas((ctx) => {
      ctx.ellipse(50, 25, 40, 10, Math.PI / 2, 0, 2 * Math.PI);
      ctx.fill();
    });
    // rotated a quarter turn: tall and thin
    expect(px(50, 5)).toEqual(GREEN);
    expect(px(15, 25)).toEqual(RED);
  });

  it("rect closes its subpath and starts a new one at its corner", () => {
    const px = canvas((ctx) => {
      ctx.rect(0, 0, 50, 50);
      ctx.lineTo(100, 0); // from (0, 0), not from the rect's last corner
      ctx.lineTo(100, 50);
      ctx.fill();
    });
    expect(px(25, 25)).toEqual(GREEN);
    expect(px(90, 10)).toEqual(GREEN);
    expect(px(60, 45)).toEqual(RED);
  });

  it("strokes wide arcs drawn in either direction", () => {
    for (const anticlockwise of [false, true]) {
      const px = canvas((ctx) => {
        ctx.lineWidth = 100;
        ctx.beginPath();
        if (anticlockwise) ctx.arc(50, 50, 50, 0, Math.PI, true);
        else ctx.arc(50, 50, 50, Math.PI, 0);
        ctx.stroke();
      });
      expect(px(50, 25)).toEqual(GREEN);
      expect(px(5, 5)).toEqual(GREEN);
    }
  });
});

describe("roundRect", () => {
  const RED = [255, 0, 0, 255];
  const GREEN = [0, 255, 0, 255];

  // fill a round rect in green over a red 100x50 canvas
  function fill(...args: unknown[]) {
    const image = pureimage.make(100, 50);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "#f00";
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = "#0f0";
    (ctx.roundRect as (...a: unknown[]) => void)(...args);
    ctx.fill();
    return (x: number, y: number) => Array.from(image.getPixelRGBA_separate(x, y));
  }

  it("rounds corners with circular radii", () => {
    const px = fill(0, 0, 100, 50, 20);
    expect(px(50, 25)).toEqual(GREEN);
    expect(px(1, 1)).toEqual(RED);
    expect(px(98, 48)).toEqual(RED);
    expect(px(21, 1)).toEqual(GREEN);
  });

  it("assigns 1 to 4 radii CSS-style, clockwise from the upper left", () => {
    // [upper-left, upper-right, lower-right, lower-left]
    const px = fill(0, 0, 100, 50, [20, 0, 20, 0]);
    expect(px(1, 1)).toEqual(RED);
    expect(px(98, 1)).toEqual(GREEN);
    expect(px(98, 48)).toEqual(RED);
    expect(px(1, 48)).toEqual(GREEN);
    // [upper-left and lower-right, upper-right and lower-left]
    const px2 = fill(0, 0, 100, 50, [0, 20]);
    expect(px2(1, 1)).toEqual(GREEN);
    expect(px2(98, 1)).toEqual(RED);
    expect(px2(1, 48)).toEqual(RED);
  });

  it("accepts elliptical {x, y} radii", () => {
    const px = fill(0, 0, 100, 50, [{ x: 40, y: 20 }]);
    expect(px(20, 1)).toEqual(RED); // inside the 40-wide corner
    expect(px(41, 1)).toEqual(GREEN);
    expect(px(1, 10)).toEqual(RED); // inside the 20-tall corner
    expect(px(1, 21)).toEqual(GREEN);
  });

  it("scales radii down together when they would overlap", () => {
    const px = fill(0, 0, 100, 50, 1000);
    // becomes a stadium: radius 25 at both ends
    expect(px(50, 1)).toEqual(GREEN);
    expect(px(2, 25)).toEqual(GREEN);
    expect(px(1, 1)).toEqual(RED);
  });

  it("with a negative size, rounds the corner at (x, y) and winds the other way", () => {
    const px = fill(100, 0, -50, 25, [10, 0, 0, 0]);
    expect(px(75, 12)).toEqual(GREEN);
    expect(px(98, 1)).toEqual(RED); // the corner at (x, y) = (100, 0)
    expect(px(51, 1)).toEqual(GREEN);

    // a mirrored copy over the same area cancels out under nonzero
    const image = pureimage.make(100, 50);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "#0f0";
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = "#f00";
    ctx.roundRect(0, 0, 100, 50, 0);
    ctx.roundRect(100, 0, -100, 50, 0);
    ctx.fill();
    expect(Array.from(image.getPixelRGBA_separate(50, 25))).toEqual(GREEN);
  });

  it("validates its radii", () => {
    const ctx = pureimage.make(10, 10).getContext("2d");
    expect(() => ctx.roundRect(0, 0, 10, 10, [])).toThrow(RangeError);
    expect(() => ctx.roundRect(0, 0, 10, 10, [1, 2, 3, 4, 5])).toThrow(RangeError);
    expect(() => ctx.roundRect(0, 0, 10, 10, -1)).toThrow(RangeError);
    expect(() => ctx.roundRect(0, 0, 10, 10, { x: 1, y: -1 })).toThrow(RangeError);
    expect(() => ctx.roundRect(0, 0, 10, 10, 1n as unknown as number)).toThrow(TypeError);
    expect(() => ctx.roundRect(0, 0, 10, 10, [{ x: 1n as unknown as number }])).toThrow(TypeError);
    expect(() => ctx.roundRect(0, 0, 10)).toThrow(TypeError);
  });

  it("ignores non-finite sizes and radii, and defaults missing radii to 0", () => {
    const ctx = pureimage.make(10, 10).getContext("2d");
    ctx.roundRect(NaN, 0, 10, 10, 1);
    ctx.roundRect(0, 0, 10, 10, [Infinity]);
    ctx.roundRect(0, 0, 10, 10, { x: NaN });
    expect(ctx.path.length).toBe(0);
    const px = fill(0, 0, 100, 50);
    expect(px(0, 0)).toEqual(GREEN);
    expect(fill(0, 0, 100, 50, {})(0, 0)).toEqual(GREEN);
  });
});

describe("stroking into an arc", () => {
  it("keeps the line's full width up to where the arc starts", () => {
    // arc() starts exactly where the line ends (up to trig rounding); that must not leave a
    // zero-length segment, which made the stroker skip the join and taper the line
    const image = pureimage.make(100, 100);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 100, 100);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(10, 90);
    ctx.lineTo(10, 50);
    ctx.arc(50, 50, 40, Math.PI, 1.5 * Math.PI);
    ctx.stroke();
    const dark = (x: number, y: number) => image.getPixelRGBA_separate(x, y)[0] < 128;
    for (const y of [55, 70, 85]) {
      expect([8, 9, 10, 11].map((x) => dark(x, y)), `row ${y}`).toEqual([true, true, true, true]);
    }
  });
});

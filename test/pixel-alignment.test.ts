import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";

// Regression tests for scanline sampling: shapes must cover the pixels whose
// centres (x + 0.5, y + 0.5) they contain, both horizontally and vertically.
describe("pixel-centre alignment", () => {
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;
  let image;
  let c;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 200, 200);
    c.fillStyle = "black";
    c.strokeStyle = "black";
  });

  const row = (y: number, xs: number[]) =>
    xs.map((x) => image.getPixelRGBA(x, y));
  const col = (x: number, ys: number[]) =>
    ys.map((y) => image.getPixelRGBA(x, y));

  for (const smoothing of [true, false]) {
    describe(`imageSmoothingEnabled = ${smoothing}`, () => {
      beforeEach(() => {
        c.imageSmoothingEnabled = smoothing;
      });

      it("1px horizontal line at y=10.5 paints only row 10", () => {
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(10, 10.5);
        c.lineTo(100, 10.5);
        c.stroke();
        expect(row(9, [20, 50, 90])).toEqual([WHITE, WHITE, WHITE]);
        expect(row(10, [20, 50, 90])).toEqual([BLACK, BLACK, BLACK]);
        expect(row(11, [20, 50, 90])).toEqual([WHITE, WHITE, WHITE]);
      });

      it("1px vertical line at x=10.5 paints only column 10", () => {
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(10.5, 10);
        c.lineTo(10.5, 100);
        c.stroke();
        expect(col(9, [20, 50, 90])).toEqual([WHITE, WHITE, WHITE]);
        expect(col(10, [20, 50, 90])).toEqual([BLACK, BLACK, BLACK]);
        expect(col(11, [20, 50, 90])).toEqual([WHITE, WHITE, WHITE]);
      });

      it("2px horizontal line at y=11 paints rows 10 and 11", () => {
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(10, 11);
        c.lineTo(100, 11);
        c.stroke();
        expect(image.getPixelRGBA(50, 9)).toBe(WHITE);
        expect(image.getPixelRGBA(50, 10)).toBe(BLACK);
        expect(image.getPixelRGBA(50, 11)).toBe(BLACK);
        expect(image.getPixelRGBA(50, 12)).toBe(WHITE);
      });

      it("2px vertical line at x=11 paints columns 10 and 11", () => {
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(11, 10);
        c.lineTo(11, 100);
        c.stroke();
        expect(image.getPixelRGBA(9, 50)).toBe(WHITE);
        expect(image.getPixelRGBA(10, 50)).toBe(BLACK);
        expect(image.getPixelRGBA(11, 50)).toBe(BLACK);
        expect(image.getPixelRGBA(12, 50)).toBe(WHITE);
      });

      it("filled rect path covers exactly its integer pixel box", () => {
        c.beginPath();
        c.rect(10, 10, 20, 20);
        c.fill();
        // edges: first and last covered pixel on each side, and the neighbours outside
        expect(row(20, [9, 10, 29, 30])).toEqual([WHITE, BLACK, BLACK, WHITE]);
        expect(col(20, [9, 10, 29, 30])).toEqual([WHITE, BLACK, BLACK, WHITE]);
      });

      it("rows don't depend on the fractional part of the path's bounds", () => {
        // a far-away sliver gives the path a fractional bounding box
        c.beginPath();
        c.rect(10, 10, 20, 20);
        c.rect(150, 0.25, 10, 0.5);
        c.fill();
        expect(col(20, [9, 10, 29, 30])).toEqual([WHITE, BLACK, BLACK, WHITE]);
      });
    });
  }

  it("transformed fillRect covers the transformed pixel box", () => {
    c.scale(2, 2);
    c.fillRect(5, 5, 10, 10); // device space 10..30
    expect(row(20, [9, 10, 29, 30])).toEqual([WHITE, BLACK, BLACK, WHITE]);
    expect(col(20, [9, 10, 29, 30])).toEqual([WHITE, BLACK, BLACK, WHITE]);
  });

  it("strokeRect on half-pixel coordinates paints all four edges", () => {
    c.lineWidth = 1;
    c.strokeRect(10.5, 10.5, 90, 90);
    expect(image.getPixelRGBA(50, 10)).toBe(BLACK); // top
    expect(image.getPixelRGBA(50, 100)).toBe(BLACK); // bottom
    expect(image.getPixelRGBA(10, 50)).toBe(BLACK); // left
    expect(image.getPixelRGBA(100, 50)).toBe(BLACK); // right
    expect(image.getPixelRGBA(50, 9)).toBe(WHITE);
    expect(image.getPixelRGBA(50, 11)).toBe(WHITE);
    expect(image.getPixelRGBA(50, 99)).toBe(WHITE);
    expect(image.getPixelRGBA(50, 101)).toBe(WHITE);
  });

  it("anti-aliased fill has no seam where a path doubles back on itself", () => {
    // square ring 20..80 x 10..40 with a 40..60 x 20..30 hole, joined by a bridge
    // edge that is traversed in both directions (as in WPT transform.skewed)
    const pts = [
      [20, 10],
      [80, 10],
      [80, 40],
      [20, 40],
      [20, 10],
      [40, 20],
      [40, 30],
      [60, 30],
      [60, 20],
      [40, 20],
      [20, 10],
    ];
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts) c.lineTo(x, y);
    c.fill();
    // these pixels sit on the bridge edge, where two spans meet mid-pixel
    expect(image.getPixelRGBA(39, 19)).toBe(BLACK);
    expect(image.getPixelRGBA(30, 14)).toBe(BLACK);
    expect(image.getPixelRGBA(50, 25)).toBe(WHITE); // hole
  });
});

describe("clip alignment", () => {
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;
  let image;
  let c;

  beforeEach(() => {
    image = pureimage.make(100, 100);
    c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 100, 100);
    c.fillStyle = "black";
  });

  it("a rect clip admits exactly its integer pixel box", () => {
    c.beginPath();
    c.rect(10, 10, 20, 20);
    c.clip();
    c.fillRect(0, 0, 100, 100);
    for (const [x, y, want] of [
      [9, 20, WHITE],
      [10, 20, BLACK],
      [29, 20, BLACK],
      [30, 20, WHITE],
      [20, 9, WHITE],
      [20, 10, BLACK],
      [20, 29, BLACK],
      [20, 30, WHITE],
    ]) {
      expect(image.getPixelRGBA(x, y), `(${x}, ${y})`).toBe(want);
    }
  });

  it("successive clips intersect", () => {
    c.beginPath();
    c.rect(0, 0, 50, 100);
    c.clip();
    c.beginPath();
    c.rect(25, 0, 75, 100);
    c.clip();
    c.fillRect(0, 0, 100, 100);
    expect(image.getPixelRGBA(24, 50)).toBe(WHITE);
    expect(image.getPixelRGBA(25, 50)).toBe(BLACK);
    expect(image.getPixelRGBA(49, 50)).toBe(BLACK);
    expect(image.getPixelRGBA(50, 50)).toBe(WHITE);
  });

  it("restore() undoes a clip intersection made after save()", () => {
    c.beginPath();
    c.rect(0, 0, 50, 100);
    c.clip();
    c.save();
    c.beginPath();
    c.rect(25, 0, 75, 100);
    c.clip();
    c.restore();
    c.fillRect(0, 0, 100, 100);
    expect(image.getPixelRGBA(10, 50)).toBe(BLACK);
    expect(image.getPixelRGBA(60, 50)).toBe(WHITE);
  });
});

describe("stroke fill rule", () => {
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;

  function setup(w: number, h: number) {
    const image = pureimage.make(w, h);
    const c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "black";
    return { image, c };
  }

  it("a stroke that crosses itself paints the overlap (nonzero, not even-odd)", () => {
    const { image, c } = setup(100, 100);
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(10, 50);
    c.lineTo(90, 50);
    c.lineTo(50, 10);
    c.lineTo(50, 90);
    c.stroke();
    expect(image.getPixelRGBA(50, 50)).toBe(BLACK); // where the segments cross
    expect(image.getPixelRGBA(30, 50)).toBe(BLACK);
    expect(image.getPixelRGBA(50, 70)).toBe(BLACK);
    expect(image.getPixelRGBA(20, 20)).toBe(WHITE);
  });

  it("a stroke whose half-width equals the arc radius fills the centre", () => {
    // as WPT 2d.path.arc.twopie.2: the inner offset contour collapses onto the centre
    const { image, c } = setup(100, 50);
    c.lineWidth = 100;
    c.beginPath();
    c.arc(50, 25, 50, 0, 2 * Math.PI - 1e-4, false);
    c.stroke();
    expect(image.getPixelRGBA(50, 20)).toBe(BLACK);
    expect(image.getPixelRGBA(50, 25)).toBe(BLACK);
  });
});

describe("arc stroke caps", () => {
  it("butt caps of a wide arc stroke follow the arc's true tangent", () => {
    // as WPT 2d.path.arc.shape.3: the 3/4 arc and both caps lie outside the canvas,
    // so a cap tilted by a coarse end chord would leak into the visible quadrant
    const image = pureimage.make(100, 50);
    const c = image.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 100, 50);
    c.strokeStyle = "black";
    c.lineWidth = 100;
    c.beginPath();
    c.arc(0, 50, 50, 0, -Math.PI / 2, false);
    c.stroke();
    for (const [x, y] of [
      [1, 1],
      [98, 1],
      [1, 48],
      [98, 48],
      [50, 25],
    ]) {
      expect(image.getPixelRGBA(x, y), `(${x}, ${y})`).toBe(0xffffffff);
    }
  });
});

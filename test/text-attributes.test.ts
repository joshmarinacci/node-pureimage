import { beforeAll, describe, expect, it } from "vitest";
import * as pureimage from "../src/index";

const FONTS = "test/unit/fixtures/fonts";

beforeAll(async () => {
  await pureimage
    .registerFont(`${FONTS}/SourceSansPro-Regular.ttf`, "Source Sans Pro")
    .loadPromise();
  await pureimage
    .registerFont(`${FONTS}/Lato-Medium.ttf`, "Lato Medium")
    .loadPromise();
});

function canvas(w = 200, h = 60) {
  const image = pureimage.make(w, h);
  const ctx = image.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  /** the leftmost and rightmost columns with any painted pixel */
  const inkColumns = () => {
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (image.getPixelRGBA_separate(x, y)[3] > 0) {
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
      }
    }
    return [min, max];
  };
  return { ctx, inkColumns };
}

describe("font", () => {
  it("defaults to 10px sans-serif", () => {
    expect(canvas().ctx.font).toBe("10px sans-serif");
  });

  it("is serialized with normal values omitted and generic families lowercased", () => {
    const { ctx } = canvas();
    ctx.font = "normal small-caps italic 400 20PX/2 SERIF";
    expect(ctx.font).toBe("italic small-caps 20px serif");
  });

  it("keeps a family list, quoting names that were quoted", () => {
    const { ctx } = canvas();
    ctx.font = `12px "My Font", Other Font,sans-serif`;
    expect(ctx.font).toBe(`12px "My Font", Other Font, sans-serif`);
    ctx.font = `12px "a\\"b"`;
    expect(ctx.font).toBe(`12px "a\\"b"`);
  });

  it("ignores invalid values", () => {
    const { ctx } = canvas();
    ctx.font = "20px serif";
    for (const bad of [
      "",
      "bogus",
      "inherit",
      "10px inherit",
      "10px {bogus}",
      "var(--x)",
      "10px a,",
      "-5px serif",
    ]) {
      ctx.font = bad;
      expect(ctx.font, bad).toBe("20px serif");
    }
  });

  it("converts sizes to px, keeping PureImage's 1pt = 1px", () => {
    const { ctx } = canvas();
    ctx.font = "1in serif";
    expect(ctx.font).toBe("96px serif");
    ctx.font = "150% serif";
    expect(ctx.font).toBe("15px serif");
    ctx.font = "48pt serif";
    expect(ctx.font).toBe("48px serif");
  });

  it("draws with the first registered family in the list", () => {
    const { ctx } = canvas();
    ctx.font = `40px Missing, "Lato Medium", "Source Sans Pro"`;
    const lato = ctx.measureText("Hello").width;
    ctx.font = `40px Missing, "Source Sans Pro", "Lato Medium"`;
    const source = ctx.measureText("Hello").width;
    expect(lato).not.toBeCloseTo(source, 1);
  });
});

describe("text attributes", () => {
  it("ignore values that aren't one of their keywords, case-sensitively", () => {
    const { ctx } = canvas();
    const cases: [keyof typeof ctx, string, string][] = [
      ["textAlign", "end", "END"],
      ["textBaseline", "top", "Top"],
      ["direction", "rtl", "rtl "],
      ["fontKerning", "none", "None"],
      ["fontStretch", "condensed", "Condensed"],
      ["fontVariantCaps", "small-caps", "Small-caps"],
      ["textRendering", "optimizeSpeed", "optimizespeed"],
    ];
    for (const [name, valid, invalid] of cases) {
      (ctx as unknown as Record<string, string>)[name] = valid;
      (ctx as unknown as Record<string, string>)[name] = invalid;
      expect(ctx[name], name).toBe(valid);
    }
  });

  it("have spec defaults, including lang", () => {
    const { ctx } = canvas();
    expect([ctx.textAlign, ctx.textBaseline, ctx.direction, ctx.lang]).toEqual([
      "start",
      "alphabetic",
      "inherit",
      "inherit",
    ]);
  });

  it("are saved and restored", () => {
    const { ctx } = canvas();
    ctx.save();
    ctx.direction = "rtl";
    ctx.letterSpacing = "2px";
    ctx.fontKerning = "none";
    ctx.lang = "fr";
    ctx.restore();
    expect([
      ctx.direction,
      ctx.letterSpacing,
      ctx.fontKerning,
      ctx.lang,
    ]).toEqual(["inherit", "0px", "auto", "inherit"]);
  });
});

describe("letterSpacing and wordSpacing", () => {
  it("accept CSS lengths, serialized in lowercase, and ignore anything else", () => {
    const { ctx } = canvas();
    ctx.letterSpacing = "1PX";
    ctx.wordSpacing = "-0.5EM";
    expect([ctx.letterSpacing, ctx.wordSpacing]).toEqual(["1px", "-0.5em"]);
    for (const bad of ["1s", "normal", "inherit", "NaN", "1"]) {
      ctx.letterSpacing = bad;
      expect(ctx.letterSpacing, bad).toBe("1px");
    }
  });

  it("add space after every character, and after every space", () => {
    const { ctx } = canvas();
    ctx.font = "20px 'Source Sans Pro'";
    const normal = ctx.measureText("Hello World").width;
    ctx.letterSpacing = "3px";
    expect(ctx.measureText("Hello World").width).toBeCloseTo(
      normal + 11 * 3,
      6,
    );
    ctx.letterSpacing = "0px";
    ctx.wordSpacing = "5px";
    expect(ctx.measureText("Hello World").width).toBeCloseTo(normal + 5, 6);
  });

  it("resolve em against the current font size", () => {
    const { ctx } = canvas();
    ctx.letterSpacing = "1em";
    ctx.font = "20px 'Source Sans Pro'";
    const spaced = ctx.measureText("ab").width;
    ctx.letterSpacing = "0px";
    expect(spaced - ctx.measureText("ab").width).toBeCloseTo(40, 6);
  });

  it("spread the drawn glyphs", () => {
    const a = canvas();
    a.ctx.font = "30px 'Source Sans Pro'";
    a.ctx.fillText("IIII", 10, 40);
    const b = canvas();
    b.ctx.font = "30px 'Source Sans Pro'";
    b.ctx.letterSpacing = "10px";
    b.ctx.fillText("IIII", 10, 40);
    const [startA, endA] = a.inkColumns();
    const [startB, endB] = b.inkColumns();
    expect(startB).toBe(startA);
    // three gaps between the four glyphs widen by 10px each
    expect(endB - endA).toBeGreaterThanOrEqual(29);
    expect(endB - endA).toBeLessThanOrEqual(31);
  });
});

describe("direction", () => {
  it("makes start and end align to the right and left with rtl", () => {
    const { ctx, inkColumns } = canvas();
    ctx.font = "30px 'Source Sans Pro'";
    ctx.direction = "rtl";
    ctx.textAlign = "start";
    ctx.fillText("HH", 100, 40);
    const [, end] = inkColumns();
    expect(end).toBeLessThan(100);
    expect(end).toBeGreaterThan(90);

    const metrics = ctx.measureText("HH");
    expect(metrics.actualBoundingBoxLeft).toBeGreaterThan(
      metrics.actualBoundingBoxRight,
    );
  });
});

describe("maxWidth", () => {
  it("squeezes text that is wider than maxWidth", () => {
    const { ctx, inkColumns } = canvas();
    ctx.font = "40px 'Source Sans Pro'";
    expect(ctx.measureText("HHHH").width).toBeGreaterThan(60);
    ctx.fillText("HHHH", 10, 50, 50);
    const [start, end] = inkColumns();
    expect(start).toBeGreaterThanOrEqual(10);
    expect(end).toBeLessThan(60);
  });

  it("squeezes towards the alignment point", () => {
    const { ctx, inkColumns } = canvas();
    ctx.font = "40px 'Source Sans Pro'";
    ctx.textAlign = "right";
    ctx.fillText("HHHH", 150, 50, 50);
    const [start, end] = inkColumns();
    expect(start).toBeGreaterThanOrEqual(100);
    expect(end).toBeLessThan(150);
  });

  it("draws nothing when it isn't positive", () => {
    const { ctx, inkColumns } = canvas();
    ctx.font = "40px 'Source Sans Pro'";
    ctx.fillText("HH", 10, 50, 0);
    ctx.fillText("HH", 10, 50, -1);
    ctx.fillText("HH", 10, 50, NaN);
    expect(inkColumns()).toEqual([Infinity, -Infinity]);
  });
});

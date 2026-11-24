import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { Context, Bitmap } from "../src/index";
import { save } from "./common";

describe("text drawing", () => {
  let image: Bitmap;
  let context: Context;
  const WHITE = 0xffffffff;
  const BLACK = 0x000000ff;
  const BLUE = 0x0000ffff;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    context = image.getContext("2d");
  });

  it("can draw some text", async () => {
    const fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.load();
    context.fillStyle = "white";
    context.fillRect(0, 0, 200, 200);
    context.fillStyle = "blue";
    context.font = "48pt 'Source Sans Pro'";
    context.fillText("some text", 50, 50);
    // expect(image.getPixelRGBA(50 + 4, 50 - 2)).to.eq(BLUE)
    await save(image, "text/text-simple");
  });

  it("can draw empty text without crashing", async () => {
    expect.assertions(1);
    const fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.loadPromise();
    context.fillStyle = "blue";
    context.font = "48pt 'Source Sans Pro'";
    context.fillText("some text", 50, 50);
    expect(image.getPixelRGBA(50 + 4, 50 - 2)).to.eq(BLUE);
    await save(image, "text/text-empty");
    // })
  });
  //
  //
  it("can measure text", async () => {
    expect.assertions(1);
    const fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.loadPromise();
    context.font = "48pt 'Source Sans Pro'";
    let metrics = context.measureText("some text");
    expect(metrics.width).to.eq(197.088);
  });

  function clear() {
    context.fillStyle = "white";
    context.fillRect(0, 0, 200, 200);
  }
  function write(str, x, y, align) {
    context.font = "48pt 'Source Sans Pro'";
    context.fillStyle = "black";
    context.textAlign = align;
    context.fillText(str, x, y);
  }

  it("can draw horizontal aligned text", async () => {
    const fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.loadPromise();
    clear();
    write("U", 50, 50, "start");
    expect(image.getPixelRGBA(49, 20)).to.eq(WHITE);
    expect(image.getPixelRGBA(57, 20)).to.eq(BLACK);
    clear();
    write("U", 50, 50, "end");
    expect(image.getPixelRGBA(43, 20)).to.eq(BLACK);
    expect(image.getPixelRGBA(57, 20)).to.eq(WHITE);
    clear();
    write("U", 50, 50, "center");
    expect(image.getPixelRGBA(41, 20)).to.eq(BLACK);
    expect(image.getPixelRGBA(50, 20)).to.eq(WHITE);
    save(image, "text/text-halign");
  });

  function writeV(str, x, y, align) {
    context.font = "48pt 'Source Sans Pro'";
    context.fillStyle = "black";
    context.textBaseline = align;
    context.fillText(str, x, y);
  }

  /** The lowest row containing dark ink, scanning a vertical strip. */
  function inkBottom(x0: number, x1: number): number {
    for (let y = image.height - 1; y >= 0; y--) {
      for (let x = x0; x < x1; x++) {
        if (image.getPixelRGBA_separate(x, y)[0] < 128) return y;
      }
    }
    return -1;
  }

  // Source Sans Pro has no USE_TYPO_METRICS flag, so the hhea ascent (984) and descent (273)
  // apply; browsers scale that ratio to one em for the top/bottom em box. (PureImage currently
  // treats the "48pt" font size as 48px.)
  const EM_ASCENT = (48 * 984) / (984 + 273);
  const EM_DESCENT = 48 - EM_ASCENT;

  it.each([
    // textBaseline, where the alphabetic baseline lands when drawing at y = 50
    ["alphabetic", 50],
    ["top", 50 + EM_ASCENT],
    ["middle", 50 + (EM_ASCENT - EM_DESCENT) / 2],
    ["bottom", 50 - EM_DESCENT],
  ])("can draw vertical aligned text: %s", async (baseline, alphabeticY) => {
    let fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.loadPromise();
    image = pureimage.make(100, 200);
    context = image.getContext("2d");
    clear();
    // "H" sits exactly on the alphabetic baseline
    writeV("H", 10, 50, baseline);
    expect(inkBottom(10, 60)).toBe(Math.ceil(alphabeticY as number) - 1);
    // measureText reports the same alphabetic baseline position
    expect(-context.measureText("H").alphabeticBaseline).toBeCloseTo((alphabeticY as number) - 50, 5);
  });
});

describe("font loading", () => {
  it("uses loadPromise", async () => {
    await pureimage
      .registerFont(
        "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
        "MyFont",
      )
      .loadPromise();
    let image = pureimage.make(200, 200);
    let context = image.getContext("2d");
    context.font = `48px MyFont`;
    const metrics = context.measureText("some text");
    expect(metrics.width).toBe(197.088);
  });
  it("bug 52", () => {
    // const fontRecord = pureimage.registerFont('./lib/fonts/monofonto/monofontorg.otf', 'MyFont', 10, '', '');
    const fontRecord = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "MyFont",
      10,
      "",
      "",
    );
    fontRecord.loadSync();
    let image = pureimage.make(200, 200);
    let context = image.getContext("2d");
    context.font = `48px MyFont`;
    const metrics = context.measureText("some text");
    expect(metrics.width).toBe(197.088);
  });
});

describe("otf fonts", () => {
  it("can draw an otf font with a bezier", async () => {
    // const fontRecord = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont', 10, '', '');
    // TODO: OTF fonts give a stream with multiple closes, 'Z',
    // instead of one big path with multiple pieces and 'M'oves

    const fontRecord = pureimage.registerFont(
      "test/bugs/144/Inter-Regular.otf",
      "Inter",
    );
    fontRecord.loadSync();
    const image = pureimage.make(100, 100);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 100, 100);
    ctx.font = "50px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText("B", 50, 50);
    await save(image, "text_bug_144");
  });
});

describe("measureText metrics", () => {
  // Source Sans Pro: 1000 units/em, hhea ascent 984, descent 273, no USE_TYPO_METRICS
  async function setup(textBaseline = "alphabetic", textAlign = "left") {
    await pureimage
      .registerFont("test/unit/fixtures/fonts/SourceSansPro-Regular.ttf", "Source Sans Pro")
      .loadPromise();
    const ctx = pureimage.make(10, 10).getContext("2d");
    ctx.font = "100px 'Source Sans Pro'";
    ctx.textBaseline = textBaseline;
    ctx.textAlign = textAlign;
    return ctx;
  }

  it("reports every TextMetrics field", async () => {
    const m = (await setup()).measureText("H");
    for (const key of [
      "width", "actualBoundingBoxLeft", "actualBoundingBoxRight", "actualBoundingBoxAscent",
      "actualBoundingBoxDescent", "fontBoundingBoxAscent", "fontBoundingBoxDescent",
      "emHeightAscent", "emHeightDescent", "hangingBaseline", "alphabeticBaseline",
      "ideographicBaseline",
    ]) {
      expect(Number.isFinite(m[key]), key).toBe(true);
    }
  });

  it("uses the font's ascent and descent, and an em box of exactly one em", async () => {
    const m = (await setup()).measureText("H");
    expect(m.fontBoundingBoxAscent).toBeCloseTo(98.4, 5);
    expect(m.fontBoundingBoxDescent).toBeCloseTo(27.3, 5);
    expect(m.emHeightAscent + m.emHeightDescent).toBeCloseTo(100, 5);
    expect(m.emHeightAscent).toBeCloseTo((100 * 984) / 1257, 5);
    expect(m.alphabeticBaseline).toBe(-0);
  });

  it("measures the glyph ink", async () => {
    const m = (await setup()).measureText("H");
    // "H" sits on the baseline, is about cap-height tall, and has side bearings
    expect(m.actualBoundingBoxDescent).toBeCloseTo(0, 5);
    expect(m.actualBoundingBoxAscent).toBeGreaterThan(60);
    expect(m.actualBoundingBoxAscent).toBeLessThan(m.fontBoundingBoxAscent);
    expect(-m.actualBoundingBoxLeft).toBeGreaterThan(0);
    expect(m.actualBoundingBoxRight).toBeLessThan(m.width);
  });

  it("measures vertical values from the textBaseline", async () => {
    const alpha = (await setup("alphabetic")).measureText("H");
    const top = (await setup("top")).measureText("H");
    expect(top.emHeightAscent).toBeCloseTo(0, 5);
    expect(top.alphabeticBaseline).toBeCloseTo(-alpha.emHeightAscent, 5);
    expect(top.actualBoundingBoxAscent).toBeCloseTo(alpha.actualBoundingBoxAscent - alpha.emHeightAscent, 5);
  });

  it("measures horizontal ink from the textAlign point", async () => {
    const left = (await setup("alphabetic", "left")).measureText("H");
    const right = (await setup("alphabetic", "right")).measureText("H");
    expect(right.actualBoundingBoxLeft).toBeCloseTo(left.actualBoundingBoxLeft + left.width, 5);
    expect(right.actualBoundingBoxRight).toBeCloseTo(left.actualBoundingBoxRight - left.width, 5);
  });

  it("treats the null character as zero width and tabs as spaces", async () => {
    const ctx = await setup();
    expect(ctx.measureText("\u0000").width).toBe(0);
    expect(ctx.measureText("a\tb").width).toBe(ctx.measureText("a b").width);
  });

  it("an empty string has no width or ink", async () => {
    const m = (await setup()).measureText("");
    expect(m.width).toBe(0);
    expect(m.actualBoundingBoxLeft).toBe(0);
    expect(m.actualBoundingBoxRight).toBe(0);
  });
});

describe("fonts with unsupported substitution lookups", () => {
  // Lato uses a GSUB extension lookup that opentype.js 1.3.4 can't apply; measuring and
  // drawing must still work rather than throw
  it("measures and draws text", async () => {
    await pureimage.registerFont("test/unit/fixtures/fonts/Lato-Medium.ttf", "Lato Medium").loadPromise();
    const ctx = pureimage.make(100, 50).getContext("2d");
    ctx.font = "20px 'Lato Medium'";
    expect(ctx.measureText("fi office").width).toBeGreaterThan(0);
    expect(() => ctx.fillText("fi office", 5, 30)).not.toThrow();
  });
});

describe("glyphs with holes", () => {
  /** Draws one glyph and returns the runs of dark and light pixels across row y. */
  function rowRuns(family: string, glyph: string, y: number): string {
    const image = pureimage.make(120, 120);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = "#000";
    ctx.font = `100px ${family}`;
    ctx.fillText(glyph, 10, 100);
    let runs = "";
    for (let x = 0; x < 120; x++) {
      const c = image.getPixelRGBA_separate(x, y)[0] < 128 ? "#" : ".";
      if (!runs.endsWith(c)) runs += c;
    }
    return runs;
  }

  const GLYPH_ROWS: [string, number][] = [
    ["o", 75],
    ["0", 75],
    ["B", 45],
  ];

  // inner contours must cut holes rather than being filled as shapes of their own
  it("cuts out the inside of o, 0 and B in a CFF (OTF) font", () => {
    pureimage.registerFont("test/bugs/144/Inter-Regular.otf", "Inter").loadSync();
    // the baseline is at y = 100; y = 45 crosses the top bowl of B
    for (const [glyph, y] of GLYPH_ROWS) expect(rowRuns("Inter", glyph, y), glyph).toBe(".#.#.");
  });

  it("cuts out the inside of o, 0 and B in a TrueType font", () => {
    pureimage
      .registerFont("test/unit/fixtures/fonts/SourceSansPro-Regular.ttf", "Source Sans Pro")
      .loadSync();
    for (const [glyph, y] of GLYPH_ROWS) {
      expect(rowRuns("'Source Sans Pro'", glyph, y), glyph).toBe(".#.#.");
    }
  });
});

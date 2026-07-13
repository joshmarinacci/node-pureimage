import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { Context, Bitmap } from "../src/index";

describe("font string parsing", () => {
  let image: Bitmap;
  let ctx: Context;

  beforeEach(() => {
    image = pureimage.make(100, 100);
    ctx = image.getContext("2d");
  });

  describe("basic size and family", () => {
    it("parses px size and unquoted family", () => {
      ctx.font = "12px Arial";
      expect(ctx._font.size).toBe(12);
      expect(ctx._font.family).toBe("Arial");
    });

    it("parses pt size and unquoted family", () => {
      ctx.font = "48pt Arial";
      expect(ctx._font.size).toBe(48);
      expect(ctx._font.family).toBe("Arial");
    });

    it("strips single quotes from family name", () => {
      ctx.font = "48pt 'Source Sans Pro'";
      expect(ctx._font.size).toBe(48);
      expect(ctx._font.family).toBe("Source Sans Pro");
    });

    it("strips double quotes from family name", () => {
      ctx.font = '14px "Times New Roman"';
      expect(ctx._font.size).toBe(14);
      expect(ctx._font.family).toBe("Times New Roman");
    });

    it("parses family name with spaces", () => {
      ctx.font = "16px Helvetica Neue";
      expect(ctx._font.size).toBe(16);
      expect(ctx._font.family).toBe("Helvetica Neue");
    });

    it("parses em unit", () => {
      ctx.font = "1.5em Georgia";
      expect(ctx._font.size).toBe(1.5);
      expect(ctx._font.family).toBe("Georgia");
    });

    it("parses rem unit", () => {
      ctx.font = "2rem Verdana";
      expect(ctx._font.size).toBe(2);
      expect(ctx._font.family).toBe("Verdana");
    });

    it("parses decimal px size", () => {
      ctx.font = "10.5px Arial";
      expect(ctx._font.size).toBe(10.5);
    });
  });

  describe("font weight", () => {
    it("parses bold keyword as 700", () => {
      ctx.font = "bold 12px Arial";
      expect(ctx._font.weight).toBe(700);
      expect(ctx._font.size).toBe(12);
      expect(ctx._font.family).toBe("Arial");
    });

    it("parses lighter keyword as 300", () => {
      ctx.font = "lighter 12px Arial";
      expect(ctx._font.weight).toBe(300);
    });

    it("parses bolder keyword as 800", () => {
      ctx.font = "bolder 12px Arial";
      expect(ctx._font.weight).toBe(800);
    });

    it("parses numeric weight 400", () => {
      ctx.font = "400 12px Arial";
      expect(ctx._font.weight).toBe(400);
    });

    it("parses numeric weight 700", () => {
      ctx.font = "700 14px Arial";
      expect(ctx._font.weight).toBe(700);
      expect(ctx._font.size).toBe(14);
    });

    it("parses numeric weight 600", () => {
      ctx.font = "600 18px Arial";
      expect(ctx._font.weight).toBe(600);
    });

    it("parses numeric weight 100", () => {
      ctx.font = "100 12px Arial";
      expect(ctx._font.weight).toBe(100);
    });

    it("parses numeric weight 900", () => {
      ctx.font = "900 12px Arial";
      expect(ctx._font.weight).toBe(900);
    });

    it("leaves weight undefined when not specified", () => {
      ctx.font = "12px Arial";
      expect(ctx._font.weight).toBeUndefined();
    });
  });

  describe("font style", () => {
    it("parses italic style", () => {
      ctx.font = "italic 12px Arial";
      expect(ctx._font.style).toBe("italic");
      expect(ctx._font.size).toBe(12);
      expect(ctx._font.family).toBe("Arial");
    });

    it("parses oblique style", () => {
      ctx.font = "oblique 12px Arial";
      expect(ctx._font.style).toBe("oblique");
    });

    it("leaves style undefined when not specified", () => {
      ctx.font = "12px Arial";
      expect(ctx._font.style).toBeUndefined();
    });
  });

  describe("font variant", () => {
    it("parses small-caps variant", () => {
      ctx.font = "small-caps 12px Arial";
      expect(ctx._font.variant).toBe("small-caps");
      expect(ctx._font.size).toBe(12);
      expect(ctx._font.family).toBe("Arial");
    });

    it("leaves variant undefined when not specified", () => {
      ctx.font = "12px Arial";
      expect(ctx._font.variant).toBeUndefined();
    });
  });

  describe("combined properties", () => {
    it("parses bold italic in order", () => {
      ctx.font = "bold italic 14px Arial";
      expect(ctx._font.weight).toBe(700);
      expect(ctx._font.style).toBe("italic");
      expect(ctx._font.size).toBe(14);
      expect(ctx._font.family).toBe("Arial");
    });

    it("parses italic bold in reverse order", () => {
      ctx.font = "italic bold 14px Arial";
      expect(ctx._font.weight).toBe(700);
      expect(ctx._font.style).toBe("italic");
      expect(ctx._font.size).toBe(14);
    });

    it("parses italic small-caps bold together", () => {
      ctx.font = "italic small-caps bold 16px Georgia";
      expect(ctx._font.style).toBe("italic");
      expect(ctx._font.variant).toBe("small-caps");
      expect(ctx._font.weight).toBe(700);
      expect(ctx._font.size).toBe(16);
      expect(ctx._font.family).toBe("Georgia");
    });

    it("parses italic with numeric weight", () => {
      ctx.font = "italic 600 18px 'Source Sans Pro'";
      expect(ctx._font.style).toBe("italic");
      expect(ctx._font.weight).toBe(600);
      expect(ctx._font.size).toBe(18);
      expect(ctx._font.family).toBe("Source Sans Pro");
    });

    it("parses bold with quoted family with spaces", () => {
      ctx.font = "bold 48pt 'Source Sans Pro'";
      expect(ctx._font.weight).toBe(700);
      expect(ctx._font.size).toBe(48);
      expect(ctx._font.family).toBe("Source Sans Pro");
    });
  });

  describe("font getter round-trip", () => {
    it("returns size with px unit and family", () => {
      ctx.font = "12px Arial";
      expect(ctx.font).toBe("12px Arial");
    });

    it("includes weight as number in output", () => {
      ctx.font = "bold 12px Arial";
      expect(ctx.font).toBe("700 12px Arial");
    });

    it("includes style in output", () => {
      ctx.font = "italic 12px Arial";
      expect(ctx.font).toBe("italic 12px Arial");
    });

    it("includes all parts in correct order", () => {
      ctx.font = "italic bold 14px Georgia";
      expect(ctx.font).toBe("italic 700 14px Georgia");
    });

    it("omits unset properties", () => {
      ctx.font = "small-caps 16px Verdana";
      expect(ctx.font).toBe("small-caps 16px Verdana");
    });
  });

  describe("edge cases", () => {
    it("ignores the normal keyword", () => {
      ctx.font = "normal 12px Arial";
      expect(ctx._font.size).toBe(12);
      expect(ctx._font.family).toBe("Arial");
    });

    it("does not crash on empty string, leaves font unchanged", () => {
      ctx.font = "12px Arial";
      ctx.font = "";
      expect(ctx._font.size).toBe(12);
      expect(ctx._font.family).toBe("Arial");
    });

    it("does not crash on size-only string, leaves font unchanged", () => {
      ctx.font = "12px Arial";
      ctx.font = "48px";
      expect(ctx._font.family).toBe("Arial");
    });

    it("trims surrounding whitespace", () => {
      ctx.font = "  16px Verdana  ";
      expect(ctx._font.size).toBe(16);
      expect(ctx._font.family).toBe("Verdana");
    });

    it("clears style and weight on subsequent plain assignment", () => {
      ctx.font = "bold italic 14px Arial";
      ctx.font = "12px Arial";
      expect(ctx._font.weight).toBeUndefined();
      expect(ctx._font.style).toBeUndefined();
    });
  });
});

describe("font rendering with weight and style metadata", () => {
  it("renders text after setting bold font without crashing", async () => {
    const fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.loadPromise();
    const image = pureimage.make(200, 100);
    const ctx = image.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = "black";
    ctx.font = "bold 48px 'Source Sans Pro'";
    expect(ctx._font.weight).toBe(700);
    expect(ctx._font.size).toBe(48);
    expect(() => ctx.fillText("Hi", 10, 60)).not.toThrow();
  });

  it("measures text consistently after weight is set", async () => {
    const fnt = pureimage.registerFont(
      "test/unit/fixtures/fonts/SourceSansPro-Regular.ttf",
      "Source Sans Pro",
    );
    await fnt.loadPromise();
    const image = pureimage.make(200, 100);
    const ctx = image.getContext("2d");

    ctx.font = "48px 'Source Sans Pro'";
    const plain = ctx.measureText("some text");

    ctx.font = "bold 48px 'Source Sans Pro'";
    const bold = ctx.measureText("some text");

    // Same underlying font file — metrics should be equal
    expect(bold.width).toBe(plain.width);
  });
});

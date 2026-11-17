import { describe, expect, beforeEach, it } from "vitest";

import * as pureimage from "../src/index.js";
import { OPAQUE_BLACK } from "../src/named_colors.js";
import { parseColor, serializeColor } from "../src/color.js";

describe("color", () => {
  let image;
  let context;

  beforeEach(() => {
    image = pureimage.make(200, 200);
    context = image.getContext("2d");
  });

  it("canvas is empty and clear", () => {
    expect(image.getPixelRGBA(0, 0)).to.eq(OPAQUE_BLACK);
  });

  it("fillcolor_hex", () => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 200, 200);
    expect(image.getPixelRGBA(0, 0)).to.eq(0x000000ff);
  });

  it("fillcolor_hex_3", () => {
    function fill_check(hex_string, num) {
      context.fillStyle = hex_string;
      context.fillRect(0, 0, 200, 200);
      expect(image.getPixelRGBA(0, 0)).to.eq(num);
    }

    fill_check("#000000", 0x000000ff);
    // fill_check('#888888',0x888888FF)
    // fill_check('#AABBCC',0xAABBCCFF)
    // fill_check('#ABC',0xAABBCCFF)
    fill_check("#000000", 0x000000ff); //reset to black
    fill_check("#FFFFFF88", 0x888888ff); //draw 50% white, turns into gray
  });
});

describe("CSS color parsing", () => {
  let ctx;
  beforeEach(() => {
    ctx = pureimage.make(10, 10).getContext("2d");
  });

  it.each([
    ["#0f0", 0x00ff00ff],
    ["#0f08", 0x00ff0088],
    ["#00FF00", 0x00ff00ff],
    ["#00ff0080", 0x00ff0080],
    ["limE", 0x00ff00ff],
    ["TrAnSpArEnT", 0x00000000],
    ["rgb(0,255,0)", 0x00ff00ff],
    ["rgb(0% ,100% ,0%)", 0x00ff00ff],
    ["rgb(-1000, 1000, -1000)", 0x00ff00ff],
    ["rgb(0, 255, 0", 0x00ff00ff],
    ["rgba(0, 255, 0, .499)", 0x00ff007f],
    ["rgba(0, 255, 0, -2)", 0x00ff0000],
    ["rgb(0, 255, 0, 20%)", 0x00ff0033],
    ["rgb(0 255 0 / 0.2)", 0x00ff0033],
    ["rgba(0 255 0)", 0x00ff00ff],
    ["hsl(120, 100%, 50%)", 0x00ff00ff],
    ["hsl( -240 , 100% , 50% )", 0x00ff00ff],
    ["hsl(+120, +100%, +50%)", 0x00ff00ff],
    ["hsl(120, -200%, 49.9%)", 0x7f7f7fff],
    ["hsla(120, 100%, 50%, 0.499)", 0x00ff007f],
    ["hsl(120 100% 50% / 0.2)", 0x00ff0033],
    ["hsl(0.3333333333turn, 100%, 50%)", 0x00ff00ff],
    ["hsl(2.0943951024rad, 100%, 50%)", 0x00ff00ff],
    ["hsl(133.33333333grad, 100%, 50%)", 0x00ff00ff],
  ])("parses %s", (str, expected) => {
    expect(parseColor(str)).to.eq(expected);
  });

  it.each([
    "#f",
    "#ff000",
    "#fg0000",
    "darkbrown",
    "red blue",
    '"red"',
    "rgb(100%, 0, 0)",
    "rgb(255, - 1, 0)",
    "rgb(255.0, 0, 0,)",
    "rgba(255, 0, 0, 1.)",
    "rgba(255, 0, 0, ",
    "rgb(255, 0, 0 / 1)",
    "rgb(255 0 0, 1)",
    "rgb(255, 0 0)",
    "rgb(0 0 0 /)",
    "hsl(0%, 100%, 50%)",
    "hsl(0, 0, 50%)",
    "hsl(0, 100.%, 50%)",
    "hsl(from #ffffff h s l) red",
    "rgb(calc(255 * 1em / 1px) 0 0)",
  ])("rejects %s", (str) => {
    expect(parseColor(str)).to.eq(null);
  });

  it("serializes opaque colors as #rrggbb and others as rgba()", () => {
    expect(serializeColor(0xffaa00ff)).to.eq("#ffaa00");
    expect(serializeColor(0x00000000)).to.eq("rgba(0, 0, 0, 0)");
    expect(serializeColor(0xffffff80)).to.eq("rgba(255, 255, 255, 0.5)");
    expect(serializeColor(0xffffff73)).to.eq("rgba(255, 255, 255, 0.45)");
  });

  it("fillStyle getter returns the serialized color", () => {
    ctx.fillStyle = "#fa0";
    expect(ctx.fillStyle).to.eq("#ffaa00");
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    expect(ctx.strokeStyle).to.eq("rgba(255, 255, 255, 0.5)");
  });

  it("invalid colors are ignored instead of throwing", () => {
    ctx.fillStyle = "#008000";
    ctx.fillStyle = "not a color";
    ctx.fillStyle = null;
    ctx.fillStyle = {};
    expect(ctx.fillStyle).to.eq("#008000");
    ctx.strokeStyle = "#008000";
    ctx.strokeStyle = "rgb(1, 2";
    ctx.strokeStyle = "hsl(nope)";
    expect(ctx.strokeStyle).to.eq("#008000");
  });

  it("fillStyle accepts objects with a toString()", () => {
    ctx.fillStyle = { toString: () => "#008000" };
    expect(ctx.fillStyle).to.eq("#008000");
  });

  it("addColorStop still throws on invalid colors", () => {
    const g = ctx.createLinearGradient(0, 0, 10, 0);
    expect(() => g.addColorStop(0, "not a color")).toThrow();
  });
});

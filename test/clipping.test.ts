import { expect, describe, beforeEach, it } from "vitest";

import { Bitmap, Context, make, decodePNGFromStream } from "../src/index";
import { save } from "./common";
import { OPAQUE_BLACK } from "../src/named_colors";
import * as fs from "node:fs";

describe("clipping tests", () => {
  let image: Bitmap;
  let context: Context;

  beforeEach(() => {
    image = make(200, 200);
    context = image.getContext("2d");
  });

  it("canvas is empty and clear", () => {
    expect(image.getPixelRGBA(0, 0)).to.eq(OPAQUE_BLACK);
  });

  it("can fill with white and red", async () => {
    context.fillStyle = "white";
    context.fillRect(0, 0, 200, 200);
    context.beginPath();
    context.arc(100, 100, 50, 0, Math.PI * 2, false);
    context.clip();
    context.fillStyle = "red";
    context.fillRect(0, 0, 200, 200);
    await save(image, "clip/clip-color");
    expect(image.getPixelRGBA(0, 0)).to.eq(0xffffffff);
    expect(image.getPixelRGBA(100, 100)).to.eq(0xff0000ff);
  });

  it("can draw an image inside of a clip", async () => {
    let bird = await decodePNGFromStream(
      fs.createReadStream("test/unit/fixtures/images/bird.png"),
    );

    context.fillStyle = "red";
    context.fillRect(0, 0, 200, 200);
    context.beginPath();
    context.arc(100, 100, 50, 0, Math.PI * 2, false);
    context.clip();
    context.fillStyle = "white";
    context.fillRect(0, 0, 200, 200);
    // let src = make(50, 50);
    // const c = src.getContext("2d");
    // c.fillStyle = "white";
    // c.fillRect(0, 0, 50, 50);
    // c.fillStyle = "black";
    // c.fillRect(25, 0, 25, 50);
    context.drawImage(bird, 0, 0, 200, 200);
    // context.drawImage(src, 75, 75, 50, 50);
    await save(image, "clip/clip-image");
    // expect(image.getPixelRGBA(0, 0)).to.eq(0xff0000ff);
    // expect(image.getPixelRGBA(99, 100)).to.eq(0xffffffff);
    // expect(image.getPixelRGBA(80, 100)).to.eq(0xff0000ff);
  });
});

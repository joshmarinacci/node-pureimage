import { describe, beforeEach, it, afterEach, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { PassThrough } from "stream";
import * as fs from "fs";
import { FIXTURES_DIR } from "./common.js";

/**
 * @test {pureimage}
 */
describe("PNG image", () => {
  let canvas;

  beforeEach(() => {
    canvas = pureimage.make(200, 200);
  });

  it("saves to a nodejs buffer", async () => {
    const passThroughStream = new PassThrough();
    const pngData = [];
    passThroughStream.on("data", (chunk) => pngData.push(chunk));
    passThroughStream.on("end", () => {});
    await pureimage.encodePNGToStream(canvas, passThroughStream);
    let buf = Buffer.concat(pngData);
    expect(buf[0]).to.eq(0x89);
    expect(buf[1]).to.eq(0x50);
    expect(buf[2]).to.eq(0x4e);
    expect(buf[3]).to.eq(0x47);
  });

  /**
   * @test {encodePNGToStream}
   */
  it("must be generated from a valid bitmap buffer", async () => {
    expect.assertions(1);
    try {
      // @ts-ignore
      await pureimage.encodePNGToStream(
        // @ts-ignore
        "this is a string, not a bitmap buffer",
        new PassThrough(),
      );
    } catch (e) {
      expect(true);
    }
  });

  /**
   * @test {decodePNGFromStream}
   */
  it("can be decoded from a stream", async () => {
    let png = await pureimage.decodePNGFromStream(
      fs.createReadStream(FIXTURES_DIR + "images/bird.png"),
    );
    expect(png.width).to.eq(200);
    expect(png.height).to.eq(133);
    expect(png.getPixelRGBA(3, 3)).to.eq(0xeae9eeff);
  });
  it("must save with compression", async () => {
    let filestream = fs.createWriteStream("output/compressed.png");
    await pureimage.encodePNGToStream(canvas, filestream, { deflateLevel: 5 });
    let buf = await fs.promises.readFile("output/compressed.png");
    expect(buf[0]).to.eq(0x89);
    expect(buf[1]).to.eq(0x50);
    expect(buf[2]).to.eq(0x4e);
    expect(buf[3]).to.eq(0x47);
  });

  afterEach(() => {
    canvas = undefined;
  });
});

/**
 * @test {pureimage}
 */
describe("JPEG image", () => {
  let canvas;

  beforeEach(() => {
    canvas = pureimage.make(200, 200);
  });

  /**
   * @test {encodeJPEGToStream}
   */
  it("can be encoded to a stream", () => {
    const passThroughStream = new PassThrough();
    const JPEGData = [];

    passThroughStream.on("data", (chunk) => JPEGData.push(chunk));
    passThroughStream.on("end", async () => {
      await pureimage.encodeJPEGToStream(canvas, passThroughStream);
      // expect(Buffer.concat(JPEGData)).toBeOfFileType('jpg');
    });
  });

  /**
   * @test {encodeJPEGToStream}
   */
  it("must be generated from a valid bitmap buffer", async () => {
    expect.assertions(1);
    try {
      // @ts-ignore
      await pureimage.encodeJPEGToStream(
        // @ts-ignore
        "this is a string, not a bitmap buffer",
        new PassThrough(),
      );
    } catch (e) {
      expect(true);
    }
  });

  /**
   * @test {decodeJPEGFromStream}
   */
  it("can be decoded from a stream", async () => {
    const jpeg = await pureimage.decodeJPEGFromStream(
      fs.createReadStream(FIXTURES_DIR + "images/bird.jpg"),
    );
    expect(jpeg.width).to.eq(200);
    expect(jpeg.height).to.eq(133);
    expect(jpeg.getPixelRGBA(3, 3)).to.eq(0xe8eaedff);
  });

  it("can be decoded from a stream with settings", async () => {
    const jpeg = await pureimage.decodeJPEGFromStream(
      fs.createReadStream(FIXTURES_DIR + "images/bird.jpg"),
      {
        tolerantDecoding: true,
        maxMemoryUsageInMB: 1024,
      },
    );
    expect(jpeg.width).to.eq(200);
    expect(jpeg.height).to.eq(133);
    expect(jpeg.getPixelRGBA(3, 3)).to.eq(0xe8eaedff);
  });

  /**
   * @test {decodeJPEGFromStream}
   */
  it("rejects invalid JPEG data", async () => {
    expect.assertions(1);
    try {
      await pureimage.decodeJPEGFromStream(
        fs.createReadStream("/package.json"),
      );
    } catch (e) {
      expect(true);
    }
  });

  afterEach(() => {
    canvas = undefined;
  });
});

import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { save } from "./common";
const WHITE = 0xffffffff;
const BLACK = 0x000000ff;

describe("draw rect 2", () => {
    it("fill square with fillRect()", async () => {
        const image1 = pureimage.make(10,10)
        function drawit(image:pureimage.Bitmap) {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.fillRect(5, 5, 5, 5);
            // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE);
            // expect(image.getPixelRGBA(11, 11)).to.eq(BLACK);
            // expect(image.getPixelRGBA(50, 50)).to.eq(BLACK);
            // expect(image.getPixelRGBA(100, 100)).to.eq(WHITE);
        }
        drawit(image1)

        await save(image1, "path/rect/fill_square-fillRect-old");

        const image2 = pureimage.makeV2(10,10)
        drawit(image2)
        await save(image2, "path/rect/fill_square-fillRect-new");

    });
})
import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { save } from "./common";

import fs from 'fs';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import {Bitmap} from "../src/index.js";

type RenderTest = (image:Bitmap) => void;

async function compareRenderers(test: RenderTest, pth: string) {
    const image1 = pureimage.make(10,10)
    test(image1)
    await save(image1, `${pth}-old`);
    const image2 = pureimage.makeV2(10,10)
    test(image2)
    await save(image2, `${pth}-new`);

    const img1 = PNG.sync.read(fs.readFileSync(`output/${pth}-old.png`));
    const img2 = PNG.sync.read(fs.readFileSync(`output/${pth}-new.png`));
    const {width, height} = img1;
    const diff = new PNG({width, height});
    const match = pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.0});
    fs.writeFileSync(`output/${pth}-diff.png`, PNG.sync.write(diff));
    expect(match).toBe(0)
}

const BLUE = 0x0000FFFF
const RED = 0xFF0000FF

describe("compare shapes", () => {
    it("fill square with fillRect()", async () => {
        await compareRenderers((image) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.fillRect(5, 5, 5, 5);
            expect(image.getPixelRGBA(0, 0)).to.eq(BLUE);
            expect(image.getPixelRGBA(6, 6)).to.eq(RED);
        },'newraster/rect/fill_square')
    });
    it("fills a triangle", async () => {
        await compareRenderers((image:pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.moveTo(0, 0)
            c.lineTo(8, 1)
            c.lineTo(8, 8)
            c.lineTo(1, 1)
            c.fill()
        },'newraster/polygon/triangle')
    })
    it("fills a quadratic path", async () => {
        await compareRenderers((image:pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.moveTo(1,1)
            c.quadraticCurveTo(15,5,1,10)
            c.fill()
        },'newraster/path/quadraticCurve')
    })
    it("fills a round rect path", async () => {
        await compareRenderers((image:pureimage.Bitmap)=> {
            const c = image.getContext("2d")
            c.imageSmoothingEnabled = false
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.roundRect(1, 1, 20, 20, [5, 5, 5, 5])
            c.fill()
        },'newraster/path/roundrect')
    })
})
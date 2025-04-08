import { describe, beforeEach, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import { save } from "./common";

import fs from 'fs';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import {Bitmap} from "../src/index.js";
import {Size} from "josh_js_util";

import {Canvas, createCanvas} from "canvas";
import {fromBytesBigEndian} from "../src/uint32";

type RenderTest = (image:Bitmap) => void;

function saveCairo(image3: Canvas, pth: string):Promise<void> {
    const prom = new Promise((res, rej)=>{
        const ws = fs.createWriteStream(`output/${pth}.png`)
        const ps = image3.createPNGStream()
        ps.pipe(ws)
        ps.on('end', ()=> res())
    })
    return prom
}

async function compareRenderers(test: RenderTest, pth: string, size?:Size) {
    if(!size) size = new Size(10,10)


    const image1 = pureimage.make(size.w,size.h);
    test(image1)
    await save(image1, `${pth}-old`);
    const image2 = pureimage.makeV2(size.w,size.h);
    test(image2)
    await save(image2, `${pth}-new`);

    const image3:Canvas = createCanvas(size.w,size.h)
    // @ts-ignore
    image3.getPixelRGBA = (x, y) => {
        const data = image3.getContext('2d').getImageData(0,0,10,10)
        // console.log(data)
        // console.log(`fetching ${x},${y}`)
        const i = (x+y*10)*4
        return fromBytesBigEndian(
            data.data[i + 0],
            data.data[i + 1],
            data.data[i + 2],
            data.data[i + 3],
        );
    }

    test(image3 as unknown as Bitmap)
    await saveCairo(image3, `${pth}-cairo`);

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
            expect(image.getPixelRGBA(4, 2)).to.eq(BLUE);
            expect(image.getPixelRGBA(8, 6)).to.eq(RED);
        },'newraster/path/rect/square')
    });
    it("fills a triangle", async () => {
        await compareRenderers((image:pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.moveTo(1, 1)
            c.lineTo(9, 1)
            c.lineTo(5, 8)
            c.lineTo(1, 1)
            c.fill()
        },'newraster/path/triangle/simple')
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
        },'newraster/path/quad/simple')
    })
    it("fills a double quadratic path", async () => {
        await compareRenderers((image:pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 30, 30);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.moveTo(0,0)
            c.lineTo(15,0)
            c.quadraticCurveTo(20,0, 20,5)
            c.lineTo(20,15)
            c.quadraticCurveTo(20,20,15,20)
            c.lineTo(0,20)
            // c.lineTo(0,0)
            c.fill()
        },'newraster/path/quad/double', new Size(30,30))
    })
    it("fills a round rect path", async () => {
        await compareRenderers((image:pureimage.Bitmap)=> {
            const c = image.getContext("2d")
            c.imageSmoothingEnabled = true
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.roundRect(1, 1, 20, 20, [5, 5, 5, 5])
            c.fill()
        },'newraster/path/roundrect/simple', new Size(50,50))
    })
})
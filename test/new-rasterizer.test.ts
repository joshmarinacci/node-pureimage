import { describe, it, expect } from "vitest";
import * as pureimage from "../src/index.js";
import {compareRenderers} from "./common";

import {Size} from "josh_js_util";

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
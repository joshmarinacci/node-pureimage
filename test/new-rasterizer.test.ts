import {describe, it, expect} from "vitest";
import * as pureimage from "../src/index.js";
import {compareRenderers, save} from "./common";

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
        }, 'newraster/path/rect/square')
    });
    it("fills a triangle", async () => {
        await compareRenderers((image: pureimage.Bitmap) => {
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
        }, 'newraster/path/triangle/simple')
    })
    it("fills a quadratic path", async () => {
        await compareRenderers((image: pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.moveTo(1, 1)
            c.quadraticCurveTo(15, 5, 1, 10)
            c.fill()
        }, 'newraster/path/quad/simple')
    })
    it("fills a double quadratic path", async () => {
        await compareRenderers((image: pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 30, 30);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.moveTo(0, 0)
            c.lineTo(15, 0)
            c.quadraticCurveTo(20, 0, 20, 5)
            c.lineTo(20, 15)
            c.quadraticCurveTo(20, 20, 15, 20)
            c.lineTo(0, 20)
            // c.lineTo(0,0)
            c.fill()
        }, 'newraster/path/quad/double', new Size(30, 30))
    })
    it("fills a round rect path", async () => {
        await compareRenderers((image: pureimage.Bitmap) => {
            const c = image.getContext("2d")
            c.imageSmoothingEnabled = true
            c.fillStyle = "#0000FF";
            c.fillRect(0, 0, 10, 10);
            c.fillStyle = "#ff0000";
            c.beginPath()
            c.roundRect(1, 1, 20, 20, [5, 5, 5, 5])
            c.fill()
        }, 'newraster/path/roundrect/simple', new Size(50, 50))
    })
})
describe("compare arcs", () => {
    it("fills a circle", async () => {
        await compareRenderers((image) => {
            const c = image.getContext("2d")
            console.log(image.width, image.height, image.constructor.name)
            c.fillStyle = "red";
            c.fillRect(0, 0, 100, 100);
            c.fillStyle = "blue";
            c.beginPath();
            c.arc(50, 50, 50, 0, Math.PI * 2, false);
            c.fill();
            expect(image.getPixelRGBA(3, 1)).to.eq(RED);
            // expect(image.getPixelRGBA(25, 25)).to.eq(BLUE);
            // expect(image.getPixelRGBA(50, 50)).to.eq(BLUE);
            // expect(image.getPixelRGBA(90, 99)).to.eq(RED);
        }, 'newraster/path/arc/circle', new Size(100, 100))
    });
    it("fill an arc", async () => {
        await compareRenderers((image) => {
            console.log(image.width, image.height, image.constructor.name)
            const c = image.getContext("2d")
            c.fillStyle = "red";
            c.fillRect(0, 0, 100, 100);
            c.fillStyle = "blue";
            c.beginPath();
            c.arc(50, 50, 50, 0, Math.PI, false);
            c.fill();
            // expect(image.getPixelRGBA(0, 0)).to.eq(RED);
            // expect(image.getPixelRGBA(11, 60)).to.eq(BLUE);
            // expect(image.getPixelRGBA(50, 50)).to.eq(BLUE);
            // console.log('10,90',image.getPixelRGBA(10,90).toString(16))
            // expect(image.getPixelRGBA(10, 90)).to.eq(RED);
        }, 'newraster/path/arc/halfcircle', new Size(100, 100))
    });
    it("fills a collection of arcs", async () => {
        await compareRenderers((image) => {
            let ctx = image.getContext("2d");
            ctx.beginPath();
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = "black";

            // Draw shapes
            for (let i = 0; i <= 3; i++) {
                for (let j = 0; j <= 2; j++) {
                    ctx.beginPath();
                    let x = 25 + j * 50; // x coordinate
                    let y = 25 + i * 50; // y coordinate
                    let radius = 20; // Arc radius
                    let startAngle = 0; // Starting point on circle
                    let endAngle = Math.PI + (Math.PI * j) / 2; // End point on circle
                    let anticlockwise = i % 2 === 1; // Draw anticlockwise

                    if (i > 1) {
                        ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                        ctx.fill();
                    } else {
                        ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                        ctx.stroke();
                    }
                }
            }
        }, 'newraster/path/arc/collection', new Size(200, 200))
    })
})
describe("quad curves", () => {
    it("corner arc", async () => {
        await compareRenderers((image) => {
            const c = image.getContext("2d")
            c.fillStyle = "blue";
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(100, 0);
            c.quadraticCurveTo(100, 100, 0, 100);
            c.lineTo(0, 0);
            c.closePath();
            c.fill();
            // await save(image, "path/quad/fill_quad");
            // expect(image.getPixelRGBA(0, 0)).to.eq(BLUE);
            // expect(image.getPixelRGBA(11, 11)).to.eq(BLUE);
            // expect(image.getPixelRGBA(50, 50)).to.eq(BLUE);
            // expect(image.getPixelRGBA(101, 101)).to.eq(RED);
        }, 'newraster/path/quad/fill_corner', new Size(100, 100))
    });
})
describe("bezier curves", () => {
    it("simple curve", async () => {
        await compareRenderers((image) => {
            const c = image.getContext("2d")
            c.fillStyle = "red";
            c.fillRect(0, 0, 200, 200);

            c.fillStyle = "blue";
            c.beginPath();
            c.moveTo(10, 10);
            c.bezierCurveTo(50, 50, 90, 50, 10, 90);
            c.lineTo(10, 10);
            c.fill();
            // expect(image.getPixelRGBA(0, 0)).to.eq(RED);
            // expect(image.getPixelRGBA(19, 39)).to.eq(BLUE);
        }, 'newraster/path/bezier/simple', new Size(100, 100))
    });
})
describe("overdraw", () => {
    it("can restroke lines", async () => {
        await compareRenderers((image) => {
            let ctx = image.getContext("2d");
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, 200, 200);
            ctx.beginPath(); // Only needed in pureimage :/

            // First sub-path
            ctx.lineWidth = 26;
            ctx.strokeStyle = "rgba(255,165,0,0.5)";
            ctx.moveTo(20, 20);
            ctx.lineTo(160, 20);
            ctx.stroke();

            // Second sub-path
            ctx.lineWidth = 14;
            ctx.strokeStyle = "rgba(0,255,0,0.5)";
            ctx.moveTo(20, 80);
            ctx.lineTo(220, 80);
            ctx.stroke();

            // // Third sub-path
            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(255,192,203,0.5)";
            ctx.moveTo(20, 140);
            ctx.lineTo(280, 140);
            ctx.stroke();
        }, 'newraster/overdraw/restroke', new Size(200, 200))
    })
})
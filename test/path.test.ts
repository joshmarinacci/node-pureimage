import {describe, beforeEach, it, expect} from "vitest";
import * as pureimage from "../src/index.js"
import {save} from './common'
describe('draw curve',() => {

    let image;
    let c;
    const WHITE = 0xFFFFFFFF
    const BLACK = 0x000000FF

    beforeEach(() => {
        image = pureimage.make(200,200)
        c = image.getContext('2d')
        c.fillStyle = 'white'
        c.fillRect(0,0,200,200)
    })

    it('canvas is empty and clear', () => {
        expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
    })

    it('fill square with fillRect()', async () => {
        c.fillStyle = 'black'
        c.fillRect(10, 10, 90, 90)
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        expect(image.getPixelRGBA(11, 11)).to.eq(BLACK)
        expect(image.getPixelRGBA(50, 50)).to.eq(BLACK)
        expect(image.getPixelRGBA(100, 100)).to.eq(WHITE)
        await save(image, 'path_fill_square_fillrect')
    })

    it('fill square with lines', async () => {
        c.beginPath()
        c.moveTo(10, 10)
        c.lineTo(100, 10)
        c.lineTo(100, 100)
        c.lineTo(10, 100)
        c.lineTo(10, 10)
        c.fillStyle = 'black'
        c.fill()
        await save(image, 'path_fill_square_lines')
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        expect(image.getPixelRGBA(11, 11)).to.eq(BLACK)
        expect(image.getPixelRGBA(50, 50)).to.eq(BLACK)
        expect(image.getPixelRGBA(101, 101)).to.eq(WHITE)
    })

    it('fill a square with rect', async () => {
        c.beginPath()
        c.rect(10, 10, 90, 90)
        c.fillStyle = 'black'
        c.fill()
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        expect(image.getPixelRGBA(11, 11)).to.eq(BLACK)
        expect(image.getPixelRGBA(50, 50)).to.eq(BLACK)
        expect(image.getPixelRGBA(101, 101)).to.eq(WHITE)
        await save(image, 'path_fill_square_rect')
    })

    it('stroke square with strokeRect()', async () => {
        c.lineWidth = 1
        c.strokeStyle = 'black'
        c.strokeRect(10,10,90,90)
        expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
        expect(image.getPixelRGBA(10,10)).to.eq(BLACK)
        expect(image.getPixelRGBA(100,50)).to.eq(BLACK)
        // expect(image.getPixelRGBA(100,100)).to.eq(WHITE)
        await save(image,'path_stroke_square_strokerect')
    })

    it('stroke square with lines', async () => {
        c.beginPath()
        c.moveTo(10, 10)
        c.lineTo(100, 10)
        c.lineTo(100, 100)
        c.lineTo(10, 100)
        c.lineTo(10, 10)
        c.lineWidth = 1
        c.strokeStyle = 'black'
        c.stroke()
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        // expect(image.getPixelRGBA(10,10)).to.eq(BLACK)
        // expect(image.getPixelRGBA(100,50)).to.eq(BLACK)
        await save(image, 'path_stroke_square_lines')
        expect(image.getPixelRGBA(100, 100)).to.eq(WHITE)
    })

    it('stroke a square with rect', async () => {
        c.beginPath()
        c.rect(10, 10, 90, 90)
        c.lineWidth = 1
        c.strokeStyle = 'black'
        c.stroke()
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        // expect(image.getPixelRGBA(10,10)).to.eq(BLACK)
        // expect(image.getPixelRGBA(50,50)).to.eq(BLACK)
        expect(image.getPixelRGBA(100, 100)).to.eq(WHITE)
        await save(image, 'path_stroke_square_rect')
    })

    it('bezier curve', async () => {
        c.fillStyle = 'white'
        c.fillRect(0, 0, 200, 200)

        c.fillStyle = 'black'
        c.beginPath()
        c.moveTo(10, 10)
        c.bezierCurveTo(50, 50, 100, 50, 10, 100)
        c.lineTo(10, 10)
        c.fill()
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        expect(image.getPixelRGBA(19, 39)).to.eq(BLACK)
        await save(image, 'bezier1')
    })

    it('arc', async () => {
        // should look the same as
        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc

        let img = pureimage.make(200, 200);
        let ctx = img.getContext('2d');
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = "black";

        // Draw shapes
        for (let i = 0; i <= 3; i++) {
            for (let j = 0; j <= 2; j++) {
                ctx.beginPath();
                let x = 25 + j * 50;                 // x coordinate
                let y = 25 + i * 50;                 // y coordinate
                let radius = 20;                          // Arc radius
                let startAngle = 0;                           // Starting point on circle
                let endAngle = Math.PI + (Math.PI * j) / 2; // End point on circle
                let anticlockwise = i % 2 === 1;                  // Draw anticlockwise


                if (i > 1) {
                    ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                    ctx.fill();
                } else {
                    ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                    ctx.stroke();
                }
            }
        }
        await save(img, 'arc')
    })
    it('north going polygon', async () => {
        let img = pureimage.make(200, 200);
        let ctx = img.getContext('2d');
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = "black";
        ctx.moveTo(100,100)
        ctx.lineTo(100,120)
        ctx.lineTo(20,120)
        ctx.lineTo(20,50)
        ctx.fill();
        expect(img.getPixelRGBA(25, 110)).to.eq(BLACK)
        expect(img.getPixelRGBA(25, 90)).to.eq(BLACK)
        await save(img,"northgoing")
    })
    it('transparent polygon',()=>{
        c.beginPath()
        c.moveTo(10,10)
        c.lineTo(100,10)
        c.lineTo(100,100)
        c.lineTo(10,100)
        c.lineTo(10,10)
        c.fillStyle = 'transparent'
        c.fill()
        expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
        expect(image.getPixelRGBA(11,11)).to.eq(WHITE)
        expect(image.getPixelRGBA(50,50)).to.eq(WHITE)
        expect(image.getPixelRGBA(100,100)).to.eq(WHITE)
    })
    it("draws thick square",async () => {
        c.fillStyle = 'white'
        c.fillRect(0, 0, 200, 200)
        c.beginPath()
        //square
        c.moveTo(10, 10)
        c.lineTo(60, 10)
        c.lineTo(60, 60)
        c.lineTo(120, 60)
        c.lineTo(120, 10)
        c.lineTo(180, 10)
        c.lineTo(180, 100)
        c.lineTo(10, 100)
        // c.lineTo(10,10)
        c.strokeStyle = 'black'
        c.lineWidth = 4
        c.fillStyle = 'black'
        c.stroke()
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        expect(image.getPixelRGBA(10, 10)).to.eq(BLACK)
        await save(image, 'thick_stroke_square')
    })
    it('draws a thin horizontal line',async () => {
        let image = pureimage.make(10, 10);
        let c = image.getContext('2d');
        c.imageSmoothingEnabled = true
        c.fillStyle = 'white'
        c.fillRect(0, 0, 10, 10)
        // c.debug = true
        c.beginPath()
        c.moveTo(2, 5)
        c.lineTo(8, 5)
        c.strokeStyle = 'black'
        c.lineWidth = 1
        c.stroke()
        expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
        expect(image.getPixelRGBA(5, 5)).to.eq(BLACK)
        await save(image, 'think-h-stroke')
    })
    it("draws thick curve",async () => {
        c.fillStyle = 'white'
        c.fillRect(0, 0, 200, 200)

        c.beginPath()
        c.moveTo(10, 10)
        c.bezierCurveTo(50, 50, 100, 50, 10, 100)
        c.lineTo(10, 10)
        c.strokeStyle = 'black'
        c.lineWidth = 2
        c.fillStyle = 'black'
        c.stroke()
        await save(image, "thick_stroke_curve")
    })
    it('draws round rect',async () => {
        create();
        let img = create();
        await save(img, "roundrect")
        function create() {
            let img = pureimage.make(1200, 628)
            let ctx = img.getContext('2d')
            let WIDTH = 1200
            let HEIGHT = 628

            ctx.imageSmoothingEnabled = true;

            // clear background
            ctx.clearRect(-1, 0, WIDTH + 1, HEIGHT);

            // background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // top color box
            ctx.fillStyle = '#142C6E';
            ctx.fillRect(0, 0, 338, HEIGHT / 2);

            // bottom color box
            ctx.fillStyle = "#FF0000";
            ctx.fillRect(0, HEIGHT / 2, 338, HEIGHT / 2);

            // Green rectangle box
            ctx.fillStyle = '#00FF00';
            roundRect(ctx, 44, 239, 250, 150, 8);


            function roundRect(ctx, x, y, width, height, radius) {
                console.log("drawing a round rect");
                if (typeof radius === 'undefined') {
                    radius = 5;
                }
                if (typeof radius === 'number') {
                    radius = {tl: radius, tr: radius, br: radius, bl: radius};
                } else {
                    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
                    for (var side in defaultRadius) {
                        radius[side] = radius[side] || defaultRadius[side];
                    }
                }
                ctx.beginPath();
                ctx.moveTo(x + radius.tl, y);
                ctx.lineTo(x + width - radius.tr, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
                ctx.lineTo(x + width, y + height - radius.br);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
                ctx.lineTo(x + radius.bl, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
                ctx.lineTo(x, y + radius.tl);
                ctx.quadraticCurveTo(x, y, x + radius.tl, y);
                ctx.lineTo(x + radius.tl, y);
                ctx.closePath();
                // ctx.fill_aa();
                ctx.fill()
            }

            return img
        }
    })
})
describe('restroke test',() => {
    it('draws multiple lines',async () => {
        let image = pureimage.make(200, 200)
        let ctx = image.getContext('2d')
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 200, 200)
        ctx.beginPath() // Only needed in pureimage :/

// First sub-path
        ctx.lineWidth = 26;
        ctx.strokeStyle = 'rgba(255,165,0,0.5)'
        ctx.moveTo(20, 20);
        ctx.lineTo(160, 20);
        ctx.stroke();

// Second sub-path
        ctx.lineWidth = 14;
        ctx.strokeStyle = 'rgba(0,255,0,0.5)'
        ctx.moveTo(20, 80);
        ctx.lineTo(220, 80);
        ctx.stroke();

// // Third sub-path
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,192,203,0.5)'
        ctx.moveTo(20, 140);
        ctx.lineTo(280, 140);
        ctx.stroke();

        await save(image, 'restroke')
    })
})

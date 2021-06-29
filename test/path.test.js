import chai, {expect} from "chai"
import * as pureimage from "../src/index.js"
import fs from "fs"
import path from "path"
const DIR = "output"
const mkdir = (pth) => {
    return new Promise((res,rej)=>{
        fs.mkdir(pth,(e)=>{
            // console.log("done with mkdir",e)
            res()
        })
    })
}
mkdir(DIR)
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

    it('canvas is empty and clear', (done) => {
        expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
        done()
    })

    it('making a square with lines', (done) => {
        c.beginPath()
        c.moveTo(10,10)
        c.lineTo(100,10)
        c.lineTo(100,100)
        c.lineTo(10,100)
        c.lineTo(10,10)
        c.fillStyle = 'black'
        c.fill()
        expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
        expect(image.getPixelRGBA(11,11)).to.eq(BLACK)
        expect(image.getPixelRGBA(50,50)).to.eq(BLACK)
        expect(image.getPixelRGBA(100,100)).to.eq(WHITE)
        done()
    })

    it('making a square with rect', (done) => {
        c.beginPath()
        c.rect(10,10,90,90)
        c.fillStyle = 'black'
        c.fill()
        expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
        expect(image.getPixelRGBA(11,11)).to.eq(BLACK)
        expect(image.getPixelRGBA(50,50)).to.eq(BLACK)
        expect(image.getPixelRGBA(100,100)).to.eq(WHITE)
        done()
    })

    //draw bezier curve
    it('bezier curve', (done) => {
        c.fillStyle = 'white'
        c.fillRect(0,0,200,200)

        c.fillStyle = 'black'
        c.beginPath()
        c.moveTo(10,10)
        c.bezierCurveTo(50,50, 100,50, 10,100)
        c.lineTo(10,10)
        c.fill()
        pureimage.encodePNGToStream(image, fs.createWriteStream(path.join(DIR,'bezier1.png'))).then(() => {
            console.log('wrote out bezier1.png')
            expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
            expect(image.getPixelRGBA(19, 39)).to.eq(BLACK)
            done()
        })

        // expect(image.getPixelRGBA(0,0)).to.eq(WHITE)
        // expect(image.getPixelRGBA(20,15)).to.eq(BLACK)
        // done()
    })

    it('arc', (done) => {
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
                let x             = 25 + j * 50;                 // x coordinate
                let y             = 25 + i * 50;                 // y coordinate
                let radius        = 20;                          // Arc radius
                let startAngle    = 0;                           // Starting point on circle
                let endAngle      = Math.PI + (Math.PI * j) / 2; // End point on circle
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
        pureimage.encodePNGToStream(img, fs.createWriteStream(path.join(DIR,'arc.png'))).then(()=>{
            console.log('wrote out arc.png')
            done()
        })
    })
    it('north going polygon', (done) => {
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
        pureimage.encodePNGToStream(img, fs.createWriteStream(path.join(DIR,'northgoing.png'))).then(()=>{
            console.log('wrote out northgoing.png')
            expect(img.getPixelRGBA(25, 110)).to.eq(BLACK)
            expect(img.getPixelRGBA(25, 90)).to.eq(BLACK)
            done()
        })

    })
    it('transparent polygon',(done)=>{
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



        done()
    })
    it("draws thick square",(done) => {
        c.fillStyle = 'white'
        c.fillRect(0,0,200,200)
        c.beginPath()
        //square
        c.moveTo(10,10)
        c.lineTo(60,10)
        c.lineTo(60,60)
        c.lineTo(120,60)
        c.lineTo(120,10)
        c.lineTo(180,10)
        c.lineTo(180,100)
        c.lineTo(10,100)
        // c.lineTo(10,10)
        c.strokeStyle = 'black'
        c.lineWidth = 10
        c.fillStyle = 'black'
        c.stroke()
        // c.fillStyle = 'black'
        // c.fill()
        pureimage.encodePNGToStream(image, fs.createWriteStream(path.join(DIR,'thick_stroke_square.png'))).then(() => {
            console.log('wrote out thick_stroke.png')
            // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
            // expect(image.getPixelRGBA(19, 39)).to.eq(BLACK)
            done()
        })
    })
    it("draws thick curve",(done) => {
        c.fillStyle = 'white'
        c.fillRect(0,0,200,200)

        c.beginPath()
        c.moveTo(10,10)
        c.bezierCurveTo(50,50, 100,50, 10,100)
        c.lineTo(10,10)
        c.strokeStyle = 'black'
        c.lineWidth = 5
        c.fillStyle = 'black'
        c.stroke()
        // c.fillStyle = 'black'
        // c.fill()
        pureimage.encodePNGToStream(image, fs.createWriteStream(path.join(DIR,'thick_stroke_curve.png'))).then(() => {
            console.log('wrote out thick_stroke.png')
            // expect(image.getPixelRGBA(0, 0)).to.eq(WHITE)
            // expect(image.getPixelRGBA(19, 39)).to.eq(BLACK)
            done()
        })
    })
})

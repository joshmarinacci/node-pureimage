import {describe, beforeEach, it, expect} from "vitest"
import * as pureimage from "../src/index"
import {save, mkdir} from "./common"

describe("simple transforms",() => {
    let image
    let context

    beforeEach(() => {
        image = pureimage.make(20,20)
        context = image.getContext('2d')
        context.fillStyle = 'white'
        context.fillRect(0,0,20,20)
    })


    function drawLine() {
        context.beginPath();
        context.moveTo(5, 5);
        context.lineTo(10, 10);
        context.lineTo(5, 10);
        context.closePath();
    }

    it("draws a single line",()=>{
        drawLine();
        expect(context.path[0][0]).to.eq('m')
        expect(context.path[0][1].x).to.eq(5)
    })

    it("draws a translated line",()=>{
        context.save();
        context.translate(5, 0);
        drawLine();
        context.restore();
        expect(context.path[0][0]).to.eq('m')
        expect(context.path[0][1].x).to.eq(10)
    })

    it("rotates a line", ()=>{
        context.save();
        context.rotate(Math.PI / 180.0 * 90);
        drawLine();
        context.restore();
        expect(context.path[0][0]).to.eq( 'm')
        expect(context.path[0][1].x).to.eq( -5)
        expect(context.path[0][1].y).to.eq( 5)
    })

    it('scales a line',()=>{
        context.save();
        context.scale(2, 2);
        drawLine();
        context.restore();

        expect(context.path[0][0]).to.eq( 'm')
        expect(context.path[0][1].x).to.eq( 10)
        expect(context.path[0][1].y).to.eq( 10)

        expect(context.path[1][0]).to.eq( 'l')
        expect(context.path[1][1].x).to.eq( 20)
        expect(context.path[1][1].y).to.eq( 20)

        expect(context.path[2][0]).to.eq( 'l')
        expect(context.path[2][1].x).to.eq( 10)
        expect(context.path[2][1].y).to.eq( 20)

        expect(context.path[3][0]).to.eq( 'l')
        expect(context.path[3][1].x).to.eq( 10)
        expect(context.path[3][1].y).to.eq( 10)

    })

    it('transforms a line', async () => {
        context.save();
        // context.transform(1, .2, .8, 1, 0, 0);
        context.setTransform(1, .2, .8, 1, 0, 0);

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(20, 0);
        context.lineTo(10, 10);

        expect(context.path[0][0]).to.eq('m')
        expect(context.path[0][1].x).to.eq(0)
        expect(context.path[0][1].y).to.eq(0)
        expect(context.path[1][0]).to.eq('l')
        expect(context.path[1][1].x).to.eq(20)
        expect(context.path[1][1].y).to.eq(4)
        expect(context.path[2][0]).to.eq('l')
        expect(context.path[2][1].x).to.eq(18)
        expect(context.path[2][1].y).to.eq(12)

        context.strokeStyle = 'black'
        context.stroke()
        context.restore();
        await save(image, 'line_transform')
    })

})

describe("transform image",()=>{
    let image
    let context
    let src

    beforeEach(() => {
        mkdir('output')
        //image is empty 200x200 px canvas
        image = pureimage.make(200,200)
        context = image.getContext('2d')
        context.fillStyle = 'red'
        context.fillRect(0,0,200,200)

        //src is 50x50, white on left side and black on right side
        src = pureimage.make(50,50)
        const c = src.getContext('2d')
        let stripe_count = 2
        for(let n=0; n<stripe_count; n++) {
            let w = 50/stripe_count
            let even = n%2===0
            c.fillStyle = even?'white':'black'
            c.fillRect(n*w,0,w,50)
        }
    })

    it('draws image normally',async () => {
        context.drawImage(src, 0, 0)
        expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(25, 0)).to.eq(0x000000FF)
        await save(image, 'transform_image_plain')
    })

    it('draws image translated',async () => {
        context.save()
        context.translate(50, 50)
        context.drawImage(src, 0, 0)
        context.restore()
        expect(image.getPixelRGBA(0 + 50, 0 + 50)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(25 + 50, 0 + 50)).to.eq(0x000000FF)
        await save(image, 'image_translated')
    })

    it('draws image scaled',async () => {
        context.save()
        context.scale(3, 3)
        context.drawImage(src, 0, 0)
        context.restore()
        expect(image.getPixelRGBA(0 * 3, 0 * 3)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(25 * 3, 0 * 3)).to.eq(0x000000FF)
        await save(image, 'image_scaled')
    })

    it('draws image rotated',async () => {
        context.save()
        context.rotate(-30 * Math.PI / 180)
        context.drawImage(src, 0, 0)
        context.restore()
        expect(image.getPixelRGBA(10, 0)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(40, 0)).to.eq(0x000000FF)
        await save(image, 'image_rotated')
    })

    it('draws combined',async () => {
        context.save()
        context.translate(100, 100)
        context.rotate(-45 * Math.PI / 180)
        context.translate(-25, -25)
        context.drawImage(src, 0, 0)
        context.restore()
        expect(image.getPixelRGBA(100, 103)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(100, 97)).to.eq(0x000000FF)
        await save(image, 'image_combined')
    })
})

describe("transform rect",() => {
    let image
    let context

    beforeEach(() => {
        image = pureimage.make(20,20)
        context = image.getContext('2d')
        context.fillStyle = 'white'
        context.fillRect(0,0,20,20)
    })
    function fillRect() {
        context.fillStyle = 'red'
        context.fillRect(0,0,10,10)
        context.fillRect(10,10,10,10)
    }

    it("draws two rects",async () => {
        fillRect()
        expect(image.getPixelRGBA(0, 0)).to.eq(0xFF0000FF)
        expect(image.getPixelRGBA(10, 0)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(10, 10)).to.eq(0xFF0000FF)
        await save(image, 'transform_rect_plain')
    })

    it("draws translated rects",async () => {
        context.save();
        context.translate(5, 0);
        fillRect()
        context.restore();
        expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(10, 0)).to.eq(0xFF0000FF)
        expect(image.getPixelRGBA(10, 10)).to.eq(0xFFFFFFFF)
        await save(image, 'transform_rect_translate')
    })
})

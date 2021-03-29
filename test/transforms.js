import * as pureimage from "../src/index.js"
import chai, {expect} from "chai"
import fs from 'fs'
import path from 'path'
import {mkdir} from './common.js'

function write_png (image,filename) {
    return pureimage.encodePNGToStream(image, fs.createWriteStream(path.join('output',filename+".png")))
}

describe("simple transforms",() => {
    let image
    let context

    beforeEach(() => {
        image = pureimage.make(20,20)
        context = image.getContext('2d')
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

})

describe("transform image",()=>{
    let image;
    let context;
    let src;

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
        c.fillStyle = 'white'
        c.fillRect(0,0,50,50)
        c.fillStyle = 'black'
        c.fillRect(25,0,25,50)
    })

    it('draws image normally',(done)=>{
        context.drawImage(src,0,0)
        write_png(image,'image_plain').then(() => {
            expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
            expect(image.getPixelRGBA(25,0)).to.eq(0x000000FF)
            done()
        })
    })

    it('draws image translated',(done)=>{
        context.save()
        context.translate(50,50)
        context.drawImage(src,0,0)
        context.restore()
        write_png(image,'image_translated').then(()=>{
            expect(image.getPixelRGBA(0+50, 0+50)).to.eq(0xFFFFFFFF)
            expect(image.getPixelRGBA(25+50,0+50)).to.eq(0x000000FF)
            done()
        }).catch(e => {
            console.error(e)
        })
    })

    it('draws image scaled',(done)=>{
        context.save()
        context.scale(3,3)
        context.drawImage(src,0,0)
        context.restore()
        write_png(image,'image_scaled').then(()=>{
            expect(image.getPixelRGBA(0*3, 0*3)).to.eq(0xFFFFFFFF)
            expect(image.getPixelRGBA(25*3,0*3)).to.eq(0x000000FF)
            done()
        }).catch(e => {
            console.error(e)
        })
    })
})

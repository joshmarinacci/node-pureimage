import chai, {expect} from "chai"
import fs from "fs"

import * as pureimage from "../src/index.js"
import * as PImage from "../src/index.js";

describe('text drawing',() => {
    let image
    let context
    const WHITE = 0xFFFFFFFF
    const BLACK = 0x000000FF

    beforeEach(() => {
        image  = pureimage.make(200, 200);
        context = image.getContext('2d');
    });


    it('can draw some text',(done) => {
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        fnt.load(()=>{
            context.fillStyle = 'blue'
            context.font = "48pt 'Source Sans Pro'";
            context.fillText("some text", 50, 50)
            done()
        })

    })


    it('can measure text',(done) => {
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        fnt.load(()=> {
            context.font = "48pt 'Source Sans Pro'";
            let metrics = context.measureText('some text')
            expect(metrics.width).to.eq(197.088)
            done()
        })
    })

    function clear() {
        context.fillStyle = 'white'
        context.fillRect(0, 0, 200, 200)
    }
    function write(str, x,y, align) {
        context.font = "48pt 'Source Sans Pro'";
        context.fillStyle = 'black'
        context.textAlign = align
        context.fillText(str, x,y)
    }

    it('can draw horizontal aligned text', (done) => {
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        fnt.load(() => {
            clear()
            write('U',50,50,'start')
            expect(image.getPixelRGBA(49,20)).to.eq(WHITE)
            expect(image.getPixelRGBA(57,20)).to.eq(BLACK)
            clear()
            write('U',50,50,'end')
            expect(image.getPixelRGBA(43,20)).to.eq(BLACK)
            expect(image.getPixelRGBA(57,20)).to.eq(WHITE)
            clear()
            write('U',50,50,'center')
            expect(image.getPixelRGBA(41,20)).to.eq(BLACK)
            expect(image.getPixelRGBA(50,20)).to.eq(WHITE)

            // pureimage.encodePNGToStream(image, fs.createWriteStream('bug31.png')).then(() => {
            //     console.log('wrote out bug31.png')
                done()
            // });
        })
    })

    function writeV(str, x,y, align) {
        context.font = "48pt 'Source Sans Pro'";
        context.fillStyle = 'black'
        context.textBaseline = align
        context.fillText(str, x,y)
    }

    it('can draw verticl aligned text', (done) => {
        let fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro');
        fnt.load(() => {
            clear()
            context.fillStyle = 'red'
            context.fillRect(0,50,200,1)
            context.fillStyle = 'black'
            context.fillRect(0,50-47,200,1)
            context.fillRect(0,50-47/2,200,1)
            context.fillRect(0,50-13,200,1)
            // writeV('Hello',50,50,'top')
            // writeV('Hey',50,50,'middle')
            // writeV('hey',50,50,'alphabetic')
            writeV('hey',50,50,'bottom')
            pureimage.encodePNGToStream(image, fs.createWriteStream('bug31.png')).then(() => {
                console.log('wrote out bug31.png')
                //top
                // expect(image.getPixelRGBA(90,37+47)).toBe(BLACK)
                // expect(image.getPixelRGBA(90,39+47)).toBe(WHITE)
                //middle
                // expect(image.getPixelRGBA(90,37+47/2+ -13/2)).toBe(BLACK)
                // expect(image.getPixelRGBA(90,39+47/2+ -13/2)).toBe(WHITE)
                //alphabetic
                // expect(image.getPixelRGBA(90,37)).toBe(BLACK)
                // expect(image.getPixelRGBA(90,39)).toBe(WHITE)
                //bottom
                expect(image.getPixelRGBA(90,37-13)).to.eq(BLACK)
                expect(image.getPixelRGBA(90,40-13)).to.eq(WHITE)
                done()
            }).catch(e => {
                console.error(e)
            })
        })
    })
})

describe('font loading', () => {
    it('uses loadPromise',done => {
        pureimage.registerFont(
            'test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont'
        ).loadPromise().then(()=>{
            let image = PImage.make(200,200)
            let context = image.getContext('2d');
            context.font = `48px MyFont`;
            const metrics = context.measureText('some text')
            done()
        })
    })
    it('bug 52', (done) => {
        // const fontRecord = pureimage.registerFont('./lib/fonts/monofonto/monofontorg.otf', 'MyFont', 10, '', '');
        const fontRecord = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont', 10, '', '');
        fontRecord.loadSync();
        let image = PImage.make(200,200)
        let context = image.getContext('2d');
        context.font = `48px MyFont`;
        const metrics = context.measureText('some text')
        done()
    })

})

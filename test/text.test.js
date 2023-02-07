import chai, {expect} from "chai"
import fs from "fs"

import * as pureimage from "../src/index.js"
import * as PImage from "../src/index.js";
import {save} from './common.js'

describe('text drawing',() => {
    let image
    let context
    const WHITE = 0xFFFFFFFF
    const BLACK = 0x000000FF
    const BLUE = 0x0000FFFF

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
            expect(image.getPixelRGBA(50+4, 50-2)).to.eq(BLUE)
            save(image,"text-simple",done)
        })
    })

    it('can draw empty text without crashing',done => {
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        fnt.load(()=>{
            context.fillStyle = 'blue'
            context.font = "48pt 'Source Sans Pro'";
            context.fillText("", 50, 50)
            save(image,"text-empty",done)
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
            save(image,"text-halign",done)
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

            {
                writeV('Hello', 50, 50, 'top')
                let y = 37+47
                context.fillStyle = 'magenta'
                expect(image.getPixelRGBA(90, y)).to.eq(BLACK)
                expect(image.getPixelRGBA(90, y+2)).to.eq(WHITE)
                context.fillRect(90, y, 1, 1)
                // clear()
            }

            {
                writeV('Hey',50,50,'middle')
                context.fillStyle = 'magenta'
                let y = 37 + 47/2 - 13/2
                expect(image.getPixelRGBA(90,y)).to.eq(BLACK)
                expect(image.getPixelRGBA(90,y+2)).to.eq(WHITE)
                context.fillRect(91,y,1,1)
            }

            {
                writeV('hey', 50, 50, 'alphabetic')
                context.fillStyle = 'magenta'
                let y = 37
                //alphabetic
                expect(image.getPixelRGBA(90, y)).to.eq(BLACK)
                expect(image.getPixelRGBA(90, y+2)).to.eq(WHITE)
                context.fillRect(91, y, 1, 1)
                // clear()
            }

            {
                //bottom
                writeV('hey',50,50,'bottom')
                context.fillStyle = 'magenta'
                let y = 37-13
                expect(image.getPixelRGBA(90,y)).to.eq(BLACK)
                expect(image.getPixelRGBA(90,y-2)).to.eq(WHITE)
                context.fillRect(91, y, 1, 1)
            }
            save(image,"text-valign",done)
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

describe('otf fonts',() => {
    it('can draw an otf font with a bezier', (done) => {
        // const fontRecord = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont', 10, '', '');
        // TODO: OTF fonts give a stream with multiple closes, 'Z',
        // instead of one big path with multiple pieces and 'M'oves

        const fontRecord = pureimage.registerFont('test/bugs/144/Inter-regular.otf', 'Inter')
        fontRecord.loadSync();
        const image = PImage.make(100, 100);
        const ctx = image.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 100, 100);
        ctx.font = '50px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText('B',50,50)
        save(image,"text_bug_144",done)
    })
})

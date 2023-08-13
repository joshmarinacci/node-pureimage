import {describe, beforeEach, it, expect} from "vitest";
import * as pureimage from "../src/index.js"
import {save} from './common'

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


    it('can draw some text',async () => {
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        fnt.loadSync()
        context.fillStyle = 'blue'
        context.font = "48pt 'Source Sans Pro'";
        context.fillText("some text", 50, 50)
        expect(image.getPixelRGBA(50 + 4, 50 - 2)).to.eq(BLUE)
        await save(image, "text-simple")
    })

    it('can draw empty text without crashing', async () => {
        expect.assertions(1)
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        await fnt.loadPromise()
        context.fillStyle = 'blue'
        context.font = "48pt 'Source Sans Pro'";
        context.fillText("some text", 50, 50)
        expect(image.getPixelRGBA(50 + 4, 50 - 2)).to.eq(BLUE)
        await save(image, "text-empty")
        // })
    })
    //
    //
    it('can measure text',async () => {
        expect.assertions(1)
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        await fnt.loadPromise()
        context.font = "48pt 'Source Sans Pro'";
        let metrics = context.measureText('some text')
        expect(metrics.width).to.eq(197.088)
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

    it('can draw horizontal aligned text', async () => {
        const fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro')
        await fnt.loadPromise()
        clear()
        write('U', 50, 50, 'start')
        expect(image.getPixelRGBA(49, 20)).to.eq(WHITE)
        expect(image.getPixelRGBA(57, 20)).to.eq(BLACK)
        clear()
        write('U', 50, 50, 'end')
        expect(image.getPixelRGBA(43, 20)).to.eq(BLACK)
        expect(image.getPixelRGBA(57, 20)).to.eq(WHITE)
        clear()
        write('U', 50, 50, 'center')
        expect(image.getPixelRGBA(41, 20)).to.eq(BLACK)
        expect(image.getPixelRGBA(50, 20)).to.eq(WHITE)
        save(image, "text-halign")
    })

    function writeV(str, x,y, align) {
        context.font = "48pt 'Source Sans Pro'";
        context.fillStyle = 'black'
        context.textBaseline = align
        context.fillText(str, x,y)
    }

    it('can draw verticl aligned text', async () => {
        let fnt = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro');
        await fnt.loadPromise()
        clear()
        context.fillStyle = 'red'
        context.fillRect(0, 50, 200, 1)
        context.fillStyle = 'black'
        context.fillRect(0, 50 - 47, 200, 1)
        context.fillRect(0, 50 - 47 / 2, 200, 1)
        context.fillRect(0, 50 - 13, 200, 1)

        {
            writeV('Hello', 50, 50, 'top')
            let y = 37 + 47
            context.fillStyle = 'magenta'
            expect(image.getPixelRGBA(90, y)).to.eq(BLACK)
            expect(image.getPixelRGBA(90, y + 2)).to.eq(WHITE)
            context.fillRect(90, y, 1, 1)
            // clear()
        }

        {
            writeV('Hey', 50, 50, 'middle')
            context.fillStyle = 'magenta'
            let y = 37 + 47 / 2 - 13 / 2
            expect(image.getPixelRGBA(90, y)).to.eq(BLACK)
            expect(image.getPixelRGBA(90, y + 2)).to.eq(WHITE)
            context.fillRect(91, y, 1, 1)
        }

        {
            writeV('hey', 50, 50, 'alphabetic')
            context.fillStyle = 'magenta'
            let y = 37
            //alphabetic
            expect(image.getPixelRGBA(90, y)).to.eq(BLACK)
            expect(image.getPixelRGBA(90, y + 2)).to.eq(WHITE)
            context.fillRect(91, y, 1, 1)
            // clear()
        }

        // {
        //     //bottom
        //     writeV('hey', 50, 50, 'bottom')
        //     context.fillStyle = 'magenta'
        //     let y = 37 - 13
        //     context.fillRect(91, y, 1, 1)
        //     await save(image, "text-valign")
        //     expect(image.getPixelRGBA(90, y)).to.eq(BLACK)
        //     expect(image.getPixelRGBA(90, y + 3)).to.eq(WHITE)
        // }
    })
})

describe('font loading', () => {
    it('uses loadPromise',async () => {
        await pureimage.registerFont(
            'test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont'
        ).loadPromise()
        let image = pureimage.make(200, 200)
        let context = image.getContext('2d');
        context.font = `48px MyFont`;
        const metrics = context.measureText('some text')
        expect(metrics.width).toBe(197.088)
    })
    it('bug 52', () => {
        // const fontRecord = pureimage.registerFont('./lib/fonts/monofonto/monofontorg.otf', 'MyFont', 10, '', '');
        const fontRecord = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont', 10, '', '');
        fontRecord.loadSync();
        let image = pureimage.make(200,200)
        let context = image.getContext('2d');
        context.font = `48px MyFont`;
        const metrics = context.measureText('some text')
        expect(metrics.width).toBe(197.088)
    })

})

describe('otf fonts',() => {
    it('can draw an otf font with a bezier', async () => {
        // const fontRecord = pureimage.registerFont('test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont', 10, '', '');
        // TODO: OTF fonts give a stream with multiple closes, 'Z',
        // instead of one big path with multiple pieces and 'M'oves

        const fontRecord = pureimage.registerFont('test/bugs/144/Inter-regular.otf', 'Inter')
        fontRecord.loadSync();
        const image = pureimage.make(100, 100);
        const ctx = image.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 100, 100);
        ctx.font = '50px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText('B', 50, 50)
        await save(image, "text_bug_144")
    })
})

const fs          = require('fs');
const pureimage   = require('pureimage');


describe('text drawing',() => {
    var image;
    var context;
    const WHITE = 0xFFFFFFFF
    const BLACK = 0x000000FF

    beforeEach(() => {
        image  = pureimage.make(200, 200);
        context = image.getContext('2d');
    });


    it('can draw some text',(done) => {
        expect.assertions(1)
        var fnt = pureimage.registerFont('tests/unit/fixtures/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
        fnt.load(()=> {
            context.fillStyle = 'blue'
            context.font = "48pt 'Source Sans Pro'";
            context.fillText("some text", 50, 50)
            expect(true).toBe(true)
            done()
        })
    })


    it('can measure text',(done) => {
        expect.assertions(1)
        var fnt = pureimage.registerFont('tests/unit/fixtures/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
        fnt.load(()=> {
            context.font = "48pt 'Source Sans Pro'";
            var metrics = context.measureText('some text')
            expect(metrics.width).toBe(197.088)
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
        expect.assertions(6)
        var fnt = pureimage.registerFont('tests/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro');
        fnt.load(() => {
            clear()
            write('U',50,50,'start')
            expect(image.getPixelRGBA(49,20)).toBe(WHITE)
            expect(image.getPixelRGBA(57,20)).toBe(BLACK)
            clear()
            write('U',50,50,'end')
            expect(image.getPixelRGBA(43,20)).toBe(BLACK)
            expect(image.getPixelRGBA(57,20)).toBe(WHITE)
            clear()
            write('U',50,50,'center')
            expect(image.getPixelRGBA(41,20)).toBe(BLACK)
            expect(image.getPixelRGBA(50,20)).toBe(WHITE)

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
        expect.assertions(2)
        var fnt = pureimage.registerFont('tests/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro');
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
                expect(image.getPixelRGBA(90,37-13)).toBe(BLACK)
                expect(image.getPixelRGBA(90,40-13)).toBe(WHITE)
                done()
            });
        })
    })
})

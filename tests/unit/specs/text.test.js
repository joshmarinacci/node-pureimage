const fs          = require('fs');
const pureimage   = require('pureimage');
const PassThrough = require('stream').PassThrough;


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
        context.fillText('U', x,y)
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

            pureimage.encodePNGToStream(image, fs.createWriteStream('bug31.png')).then(() => {
                console.log('wrote out bug31.png')
                done()
            });
        })
    })
})
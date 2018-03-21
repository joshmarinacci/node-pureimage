const fs          = require('fs');
const pureimage   = require('pureimage');
const PassThrough = require('stream').PassThrough;


describe('text drawing',() => {
    var image;
    var context;

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


})
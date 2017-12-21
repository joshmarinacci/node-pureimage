const fs          = require('fs');
const pureimage   = require('pureimage');
const PassThrough = require('stream').PassThrough;

expect.extend(require('../matchers/toBeOfFileType'));

/**
 * @test {pureimage}
 */
describe('PNG image', () => {

    var PImage;
    var context;

    beforeEach(() => {
        PImage  = pureimage.make(200, 200);
        context = PImage.getContext('2d');
    });

    /**
     * @test {encodePNGToStream}
     */
    it('can be encoded to a stream', (done) => {
        expect.assertions(1);

        const passThroughStream = new PassThrough();
        const PNGData           = [];

        const PNGPromise = pureimage.encodePNGToStream(PImage, passThroughStream);

        passThroughStream.on('data', chunk => PNGData.push(chunk));
        passThroughStream.on('end', () => {
            expect(Buffer.concat(PNGData)).toBeOfFileType('png');
            PNGPromise.then(done);
        });
    });

    /**
     * @test {encodePNGToStream}
     */
    it('must be generated from a valid bitmap buffer', () => {
        expect(pureimage.encodePNGToStream('this is a string, not a bitmap buffer', new PassThrough())).rejects;
    });

    /**
     * @test {decodePNGFromStream}
     */
    it('can be decoded from a stream', (done) => {
        expect.assertions(3);

        pureimage.decodePNGFromStream(fs.createReadStream(FIXTURES_DIR + 'images/bird.png')).then((png) => {
            expect(png.width).toBe(200);
            expect(png.height).toBe(133);
            expect(png.getPixelRGBA(3, 3)).toBe(0xEAE9EEFF);

            done();
        });

    });

    afterEach(() => {
        PImage  = undefined;
        context = undefined;
    });
});

/**
 * @test {pureimage}
 */
describe('JPEG image', () => {

    var PImage;
    var context;

    beforeEach(() => {
        PImage  = pureimage.make(200, 200);
        context = PImage.getContext('2d');
    });

    /**
     * @test {decodeJPEGFromStream}
     */
    it.skip('can be decoded from a stream', () => {

    });

    /**
     * @test {encodeJPEGToStream}
     */
    it('can be encoded to a stream', (done) => {
        expect.assertions(1);

        const passThroughStream = new PassThrough();
        const JPEGData          = [];

        const JPEGPromise = pureimage.encodeJPEGToStream(PImage, passThroughStream)

        passThroughStream.on('data', chunk => JPEGData.push(chunk))
        passThroughStream.on('end', () => {
            expect(Buffer.concat(JPEGData)).toBeOfFileType('jpg');
            JPEGPromise.then(done);
        });
    });

    afterEach(() => {
        PImage  = undefined;
        context = undefined;
    });
});

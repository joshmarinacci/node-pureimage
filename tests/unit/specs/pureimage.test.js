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

        context.fillStyle = 'rgba(255,0,0, 0.5)';
        context.fillRect(0, 0, 100, 100);

        const PNGPromise = pureimage.encodePNGToStream(PImage, passThroughStream)

        passThroughStream.on('data', chunk => PNGData.push(chunk))
        passThroughStream.on('end', () => {
            expect(Buffer.concat(PNGData)).toBeOfFileType('png');
            PNGPromise.then(done);
        });
    });

    /**
     * @test {decodePNGFromStream}
     */
    it.skip('can be decoded from a stream', () => {

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

        context.fillStyle = 'rgba(255,0,0, 0.5)';
        context.fillRect(0, 0, 100, 100);

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

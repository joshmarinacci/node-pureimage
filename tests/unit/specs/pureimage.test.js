const pureimage   = require('pureimage');
const PassThrough = require('stream').PassThrough;

expect.extend(require('../matchers/toBeOfType'));

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
            expect(Buffer.concat(PNGData)).toBeOfType('png');
            PNGPromise.then(() => done());
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
describe.skip('JPEG image', () => {
    /**
     * @test {decodeJPEGFromStream}
     */
    it('can be decoded from a stream', () => {

    });

    /**
     * @test {encodeJPEGToStream}
     */
    it('can be encoded to a stream', () => {

    });
});

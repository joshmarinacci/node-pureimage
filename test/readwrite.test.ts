import {expect} from 'chai';
import * as pureimage from '../src/index.js';
import type { Context } from '../src/context.js';
import {PassThrough} from 'stream';
import fs from 'fs';
// import {toBeOfFileType} from './unit/matchers/toBeOfFileType.js';
import {FIXTURES_DIR} from './common.test.js';

// expect.extend(toBeOfFileType);
//
/**
 * @test {pureimage}
 */
describe('PNG image', () => {

    let PImage: ReturnType<typeof pureimage.make>;
    let context: Context;

    beforeEach(() => {
        PImage  = pureimage.make(200, 200);
        context = PImage.getContext('2d');
    });

    /**
     * @test {encodePNGToStream}
     */
    it('can be encoded to a stream', (done) => {

        const passThroughStream = new PassThrough();
        const PNGData           = [];

        const PNGPromise = pureimage.encodePNGToStream(PImage, passThroughStream);

        passThroughStream.on('data', chunk => PNGData.push(chunk));
        passThroughStream.on('end', () => {
            // expect(Buffer.concat(PNGData)).toBeOfFileType('png');
            PNGPromise.then(done).catch(e => console.error(e));
        });
        passThroughStream.on('error',e => console.error(e));
    });

    /**
     * @test {encodePNGToStream}
     */
    it('must be generated from a valid bitmap buffer', (done) => {
        // @ts-expect-error
        pureimage.encodePNGToStream('this is a string, not a bitmap buffer', new PassThrough()).catch(e => {
            console.log('should error here');
            done();
        });
    });

    /**
     * @test {decodePNGFromStream}
     */
    it('can be decoded from a stream', (done) => {
        pureimage.decodePNGFromStream(fs.createReadStream(FIXTURES_DIR + 'images/bird.png')).then((png) => {
            expect(png.width).to.eq(200);
            expect(png.height).to.eq(133);
            expect(png.getPixelRGBA(3, 3)).to.eq(0xEAE9EEFF);
            done();
        });

    });

    afterEach(() => {
        PImage  = undefined;
        context = undefined;
    });
    context;
});

/**
 * @test {pureimage}
 */
describe('JPEG image', () => {

    let PImage: ReturnType<typeof pureimage.make>;
    let context: Context;

    beforeEach(() => {
        PImage  = pureimage.make(200, 200);
        context = PImage.getContext('2d');
    });

    /**
     * @test {encodeJPEGToStream}
     */
    it('can be encoded to a stream', (done) => {

        const passThroughStream = new PassThrough();
        const JPEGData          = [];

        const JPEGPromise = pureimage.encodeJPEGToStream(PImage, passThroughStream).catch(e => console.error(e));

        passThroughStream.on('data', chunk => JPEGData.push(chunk));
        passThroughStream.on('end', () => {
            // expect(Buffer.concat(JPEGData)).toBeOfFileType('jpg');
            JPEGPromise.then(done);
        });
    });

    /**
    * @test {encodeJPEGToStream}
    */
    it('must be generated from a valid bitmap buffer', (done) => {
        // @ts-expect-error
        pureimage.encodeJPEGToStream('this is a string, not a bitmap buffer', new PassThrough()).catch(e => done());
    });

    /**
     * @test {decodeJPEGFromStream}
     */
    it('can be decoded from a stream', (done) => {
        pureimage.decodeJPEGFromStream(fs.createReadStream(FIXTURES_DIR + 'images/bird.jpg')).then((jpeg) => {
            expect(jpeg.width).to.eq(200);
            expect(jpeg.height).to.eq(133);
            expect(jpeg.getPixelRGBA(3, 3)).to.eq(0xE8EAEDFF);
            done();
        }).catch(e => console.error(e));
    });

    /**
     * @test {decodeJPEGFromStream}
     */
    it('rejects invalid JPEG data', (done) => {
        pureimage.decodeJPEGFromStream(fs.createReadStream( '/package.json')).catch(_e => done());
    });

    afterEach(() => {
        PImage  = undefined;
        context = undefined;
    });
    context;
});

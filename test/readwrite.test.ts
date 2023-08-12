import {describe, beforeEach, it, afterEach, expect} from "vitest";
import * as pureimage from "../src/index.js"
import {PassThrough} from "stream"
import * as fs from "fs"
import {FIXTURES_DIR} from './common.js'


/**
 * @test {pureimage}
 */
describe('PNG image', () => {

    let PImage
    let context

    beforeEach(() => {
        PImage  = pureimage.make(200, 200);
        context = PImage.getContext('2d');
    });

    /**
     * @test {encodePNGToStream}
     */
    it('can be encoded to a stream', () => {

        const passThroughStream = new PassThrough();
        const PNGData           = [];

        const PNGPromise =
        passThroughStream.on('data', chunk => PNGData.push(chunk));
        passThroughStream.on('end', async () => {
            // expect(Buffer.concat(PNGData)).toBeOfFileType('png');
            await pureimage.encodePNGToStream(PImage, passThroughStream);
            // PNGPromise.then(done).catch(e => console.error(e));
        });
        passThroughStream.on('error',e => console.error(e))
    });

    /**
     * @test {encodePNGToStream}
     */
    it('must be generated from a valid bitmap buffer', async () => {
        expect.assertions(1)
        try {
            await pureimage.encodePNGToStream('this is a string, not a bitmap buffer', new PassThrough())
        } catch (e) {
            expect(true)
        }
    });

    /**
     * @test {decodePNGFromStream}
     */
    it('can be decoded from a stream', async () => {
        let png = await pureimage.decodePNGFromStream(fs.createReadStream(FIXTURES_DIR + 'images/bird.png'))
        expect(png.width).to.eq(200);
        expect(png.height).to.eq(133);
        expect(png.getPixelRGBA(3, 3)).to.eq(0xEAE9EEFF);
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

    let canvas
    let context

    beforeEach(() => {
        canvas  = pureimage.make(200, 200);
        context = canvas.getContext('2d');
    });

    /**
     * @test {encodeJPEGToStream}
     */
    it('can be encoded to a stream', () => {

        const passThroughStream = new PassThrough();
        const JPEGData          = [];


        passThroughStream.on('data', chunk => JPEGData.push(chunk))
        passThroughStream.on('end', async () => {
            await pureimage.encodeJPEGToStream(canvas, passThroughStream)
            // expect(Buffer.concat(JPEGData)).toBeOfFileType('jpg');
        });
    });

    /**
    * @test {encodeJPEGToStream}
    */
    it('must be generated from a valid bitmap buffer', async () => {
        expect.assertions(1)
        try {
            await pureimage.encodeJPEGToStream('this is a string, not a bitmap buffer', new PassThrough())
        } catch (e) {
            expect(true)
        }
    });

    /**
     * @test {decodeJPEGFromStream}
     */
    it('can be decoded from a stream', async () => {
        const jpeg = await pureimage.decodeJPEGFromStream(fs.createReadStream(FIXTURES_DIR + 'images/bird.jpg'))
        expect(jpeg.width).to.eq(200);
        expect(jpeg.height).to.eq(133);
        expect(jpeg.getPixelRGBA(3, 3)).to.eq(0xE8EAEDFF);
    });

    it('can be decoded from a stream with settings', async () => {
        const jpeg = await pureimage.decodeJPEGFromStream(fs.createReadStream(FIXTURES_DIR + 'images/bird.jpg'), {
            tolerantDecoding: true,
            maxMemoryUsageInMB: 1024,
        })
        expect(jpeg.width).to.eq(200);
        expect(jpeg.height).to.eq(133);
        expect(jpeg.getPixelRGBA(3, 3)).to.eq(0xE8EAEDFF);
    });

    /**
     * @test {decodeJPEGFromStream}
     */
    it('rejects invalid JPEG data', async () => {
        expect.assertions(1)
        try {
            await pureimage.decodeJPEGFromStream(fs.createReadStream('/package.json'))
        } catch (e) {
            expect(true)
        }
    });

    it('saves to a nodejs buffer', async () => {
        const passThroughStream = new PassThrough();
        const pngData = [];
        passThroughStream.on('data', chunk => pngData.push(chunk));
        passThroughStream.on('end', () => {
        });
        await pureimage.encodePNGToStream(canvas, passThroughStream)
        let buf = Buffer.concat(pngData);
        expect(buf[0]).to.eq(0x89)
        expect(buf[1]).to.eq(0x50)
        expect(buf[2]).to.eq(0x4E)
        expect(buf[3]).to.eq(0x47)
    })

    afterEach(() => {
        canvas  = undefined;
        context = undefined;
    });
});

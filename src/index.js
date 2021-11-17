import {Bitmap} from './bitmap.js'
import {PNG} from "pngjs"
import * as JPEG from "jpeg-js"
import {getBytesBigEndian} from './uint32.js'

export * from './text.js'

export function make (w,h,options) {
    return new Bitmap(w,h,options)
}

/**
 * Encode the PNG image to output stream
 *
 * @param {Bitmap} bitmap    An instance of {@link Bitmap} to be encoded to PNG, `bitmap.data` must be a buffer of raw PNG data
 * @param {Stream} outstream The stream to write the PNG file to
 *
 * @returns {Promise<void>}
 */
export function encodePNGToStream(bitmap, outstream) {
    return new Promise((res,rej)=>{
        if(!bitmap.hasOwnProperty('data') || !bitmap.hasOwnProperty('width') || !bitmap.hasOwnProperty('height')) {
            return rej(new TypeError('Invalid bitmap image provided'));
        }

        const png = new PNG({
            width: bitmap.width,
            height: bitmap.height
        })

        for(let i=0; i<bitmap.width; i++) {
            for(let j=0; j<bitmap.height; j++) {
                const rgba = bitmap.getPixelRGBA(i, j)
                const n = (j * bitmap.width + i) * 4
                const bytes = getBytesBigEndian(rgba)
                for(let k=0; k<4; k++) {
                    png.data[n+k] = bytes[k];
                }
            }
        }

        png
            .on('error', (err) => { rej(err); })
            .pack()
            .pipe(outstream)
            .on('finish', () => { res(); })
            .on('error', (err) => { rej(err); });
    });
}


/**
 * Decode PNG From Stream
 *
 * Decode a PNG file from an incoming readable stream
 *
 * @param {Stream} instream A readable stream containing raw PNG data
 *
 * @returns {Promise<Bitmap>}
 */
export function decodePNGFromStream(instream) {
    return new Promise((res,rej)=>{
        instream.pipe(new PNG())
            .on("parsed", function() {
                const bitmap = new Bitmap(this.width, this.height,{})
                for(let i=0; i<bitmap.data.length; i++) {
                    bitmap.data[i] = this.data[i];
                }
                res(bitmap);
            }).on("error", function(err) {
            rej(err);
        });
    })
};


/**
 * Encode JPEG To Stream
 *
 * Encode the JPEG image to output stream
 *
 * @param {Bitmap} img       An instance of {@link Bitmap} to be encoded to JPEG, `img.data` must be a buffer of raw JPEG data
 * @param {Stream} outstream The stream to write the raw JPEG buffer to
 * @param {Int} Number between 0 and 100 setting the JPEG quality
 * @returns {Promise<void>}
 */
export function encodeJPEGToStream(img, outstream, quality) {
    quality = quality || 90;
    return new Promise((res,rej)=> {
        if(!img.hasOwnProperty('data') || !img.hasOwnProperty('width') || !img.hasOwnProperty('height')) {
            return rej(new TypeError('Invalid bitmap image provided'));
        }
        const data = {
            data: img.data,
            width: img.width,
            height: img.height
        }
        outstream.on('error', (err) => rej(err));
        outstream.write(JPEG.encode(data, quality).data, () => {
            outstream.end();
            res();
        });
    });
}

/**
 * Decode JPEG From Stream
 *
 * Decode a JPEG image from an incoming stream of data
 *
 * @param {Stream} data A readable stream to decode JPEG data from
 *
 * @returns {Promise<Bitmap>}
 */
export function decodeJPEGFromStream(data) {
    return new Promise((res,rej)=>{
        try {
            const chunks = []
            data.on('data', chunk => chunks.push(chunk));
            data.on('end',() => {
                const buf = Buffer.concat(chunks)
                let rawImageData = null
                try {
                    rawImageData = JPEG.decode(buf);
                } catch(err) {
                    rej(err);
                    return
                }
                const bitmap = new Bitmap(rawImageData.width, rawImageData.height,{})
                for (let x_axis = 0; x_axis < rawImageData.width; x_axis++) {
                    for (let y_axis = 0; y_axis < rawImageData.height; y_axis++) {
                        const n = (y_axis * rawImageData.width + x_axis) * 4
                        bitmap.setPixelRGBA_i(x_axis, y_axis,
                            rawImageData.data[n + 0],
                            rawImageData.data[n + 1],
                            rawImageData.data[n + 2],
                            rawImageData.data[n + 3]
                        );
                    }
                }
                res(bitmap);
            });
            data.on("error", (err) => {
                rej(err);
            });
        } catch (e) {
            console.log(e);
            rej(e);
        }
    })
}

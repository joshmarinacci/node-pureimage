import {Bitmap} from './bitmap.js'
import {PNG} from "pngjs"
import * as uint32 from "./uint32.js"

export {registerFont} from './text.js'

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
            rej(new TypeError('Invalid bitmap image provided'));
        }
        console.log("inside promise")

        const png = new PNG({
            width: bitmap.width,
            height: bitmap.height
        })

        for(let i=0; i<bitmap.width; i++) {
            for(let j=0; j<bitmap.height; j++) {
                const rgba = bitmap.getPixelRGBA(i, j)
                const n = (j * bitmap.width + i) * 4
                const bytes = uint32.getBytesBigEndian(rgba)
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

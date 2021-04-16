import { Bitmap } from './bitmap.js';
import { Stream } from 'stream';

export { registerFont } from './text.js';

export function make(w: number, h: number, options: any): Bitmap;

/**
 * Encode the PNG image to output stream
 *
 * @param {Bitmap} bitmap    An instance of {@link Bitmap} to be encoded to PNG, `bitmap.data` must be a buffer of raw PNG data
 * @param {Stream} outstream The stream to write the PNG file to
 *
 * @returns {Promise<void>}
 */
export function encodePNGToStream(
    bitmap: Bitmap,
    outstream: Stream
): Promise<void>;

/**
 * Decode PNG From Stream
 *
 * Decode a PNG file from an incoming readable stream
 *
 * @param {Stream} instream A readable stream containing raw PNG data
 *
 * @returns {Promise<Bitmap>}
 */
export function decodePNGFromStream(instream: Stream): Promise<Bitmap>;

/**
 * Encode JPEG To Stream
 *
 * Encode the JPEG image to output stream
 *
 * @param {Bitmap} img       An instance of {@link Bitmap} to be encoded to JPEG, `img.data` must be a buffer of raw JPEG data
 * @param {Stream} outstream The stream to write the raw JPEG buffer to
 * @param {number} quality Number between 0 and 100 setting the JPEG quality
 * @returns {Promise<void>}
 */
export function encodeJPEGToStream(
    img: Bitmap,
    outstream: Stream,
    quality?: number
): Promise<void>;

/**
 * Decode JPEG From Stream
 *
 * Decode a JPEG image from an incoming stream of data
 *
 * @param {Stream} data A readable stream to decode JPEG data from
 *
 * @returns {Promise<Bitmap>}
 */
export function decodeJPEGFromStream(data: Stream): Promise<Bitmap>;

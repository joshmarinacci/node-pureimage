/// <reference types="node" />
import Bitmap, { IBitmapOptions } from './bitmap';
import WritableStream = NodeJS.WritableStream;
import ReadableStream = NodeJS.ReadableStream;
export { registerFont } from './text';
/**
 * Create a new bitmap image
 *
 * @param {number} w       Image width
 * @param {number} h       Image height
 * @param {object} options Options to be passed to {@link Bitmap}
 *
 * @returns {Bitmap}
 */
export declare function make(w: number, h: number, options?: IBitmapOptions): Bitmap;
/**
 * Encode the PNG image to output stream
 *
 * @param {Bitmap} bitmap    An instance of {@link Bitmap} to be encoded to PNG, `bitmap.data` must be a buffer of raw PNG data
 * @param {Stream} outstream The stream to write the PNG file to
 *
 * @returns {Promise<void>}
 */
export declare function encodePNGToStream(bitmap: Bitmap, outstream: WritableStream): Promise<unknown>;
/**
 * Encode JPEG To Stream
 *
 * Encode the JPEG image to output stream
 *
 * @param {Bitmap} img       An instance of {@link Bitmap} to be encoded to JPEG, `img.data` must be a buffer of raw JPEG data
 * @param {Stream} outstream The stream to write the raw JPEG buffer to
 * @returns {Promise<void>}
 */
export declare function encodeJPEGToStream(img: Bitmap, outstream: WritableStream): Promise<unknown>;
/**
 * Decode JPEG From Stream
 *
 * Decode a JPEG image from an incoming stream of data
 *
 * @param {Stream} data A readable stream to decode JPEG data from
 *
 * @returns {Promise<Bitmap>}
 */
export declare function decodeJPEGFromStream(data: ReadableStream): Promise<unknown>;
/**
 * Decode PNG From Stream
 *
 * Decode a PNG file from an incoming readable stream
 *
 * @param {Stream} instream A readable stream containing raw PNG data
 *
 * @returns {Promise<Bitmap>}
 */
export declare function decodePNGFromStream(instream: ReadableStream): Promise<unknown>;

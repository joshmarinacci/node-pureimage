import { Context } from './context.js';

/**
 * The Bitmap class is used for direct pixel manipulation(for example setting a pixel colour,
 * transparency etc). It also provides a factory method for creating new instances of
 * {@link Context}
 *
 * @class Bitmap
 */
export class Bitmap {
    width: number;
    height: number;
    data: ArrayBuffer;

    /**
     * Creates an instance of Bitmap.
     * @param {number} w      Width
     * @param {number} h      Height
     * @param {any}   options Currently unused
     * @memberof Bitmap
     */
    constructor(w: number, h: number, options: any);
    /**
     * Calculate Index
     *
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @returns {number}
     *
     * @memberof Bitmap
     */
    calculateIndex(x: number, y: number): number;

    /**
     * Set the RGBA(Red, Green, Blue, Alpha) values on an individual pixel level
     *
     * @param {number} x    X axis position
     * @param {number} y    Y axis position
     * @param {number} rgba A hex representation of the RGBA value of the pixel. See {@link NAMED_COLORS} for examples
     *
     * @returns {void}
     *
     * @memberof Bitmap
     */
    setPixelRGBA(x: number, y: number, rgba: number): void;

    /**
     * Set the individual red, green, blue and alpha levels of an individual pixel
     *
     * @param {number} x X axis position
     * @param {number} y Y axis position
     * @param {number} r Red level
     * @param {number} g Green level
     * @param {number} b Blue level
     * @param {number} a Alpha level
     *
     * @returns {void}
     *
     * @memberof Bitmap
     */
    setPixelRGBA_i(
        x: number,
        y: number,
        r: number,
        g: number,
        b: number,
        a: number
    ): void;

    /**
     * Get the RGBA value of an individual pixel as a hexadecimal number(See {@link NAMED_COLORS} for examples)
     *
     * @param {number} x X axis potiion
     * @param {number} y Y axis position
     *
     * @returns {number}
     *
     * @memberof Bitmap
     */
    getPixelRGBA(x: number, y: number): number;

    /**
     * Get Pixel RGBA Seperate
     *
     * @param {number} x X axis position
     * @param {number} y Y axis position
     *
     * @ignore
     *
     * @returns {ArrayBuffer}
     *
     * @memberof Bitmap
     */
    getPixelRGBA_separate(x: number, y: number): ArrayBuffer;

    /**
     * {@link Context} factory. Creates a new {@link Context} instance object for the current bitmap object
     *
     * @returns {Context}
     *
     * @memberof Bitmap
     */
    getContext(type:string): Context;

    private _copySubBitmap(x: number, y: number, w: number, h: number): Bitmap;

    private _pasteSubBitmap(src: Bitmap, x: number, y: number): void;
}

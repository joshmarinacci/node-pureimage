import {NAMED_COLORS} from './named_colors.js';
import * as uint32 from './uint32.js';

/**
 * Clamping is the process of limiting a position to an area
 *
 * @see https://en.wikipedia.org/wiki/Clamping_(graphics)
 */
export function clamp(
    /** The value to apply the clamp restriction to */
    value: number,
    /** Lower limit */
    min: number,
    /** Upper limit */
    max: number,
): number {
    if(value < min) return min;
    if(value > max) return max;
    return value;
}


/**
 * Linear Interpolation
 *
 * In mathematics, linear interpolation is a method of curve fitting using linear polynomials to construct new data
 * points within the range of a discrete set of known data points.
 *
 * @ignore
 *
 * @see https://en.wikipedia.org/wiki/Linear_interpolation
 */
export const lerp = function(
    a: number,
    b: number,
    t: number,
): number {  return a + (b-a)*t };


export const colorStringToUint32 = function(
    str: string
): number {
    if(!str) return 0x000000;
    //hex values always get 255 for the alpha channel
    if(str.indexOf('#')===0) {
        let int = uint32.toUint32(parseInt(str.substring(1),16));
        int = uint32.shiftLeft(int,8);
        int = uint32.or(int,0xff);
        return int;
    }
    if(str.indexOf('rgba')===0) {
        const parts = str.trim().substring(4).replace('(','').replace(')','').split(',');
        return uint32.fromBytesBigEndian(
            parseInt(parts[0]),
            parseInt(parts[1]),
            parseInt(parts[2]),
            Math.floor(parseFloat(parts[3])*255));
    }
    if(str.indexOf('rgb')===0) {
        const parts = str.trim().substring(3).replace('(','').replace(')','').split(',');
        return uint32.fromBytesBigEndian(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 255);
    }
    if(NAMED_COLORS[str]) {
        return NAMED_COLORS[str];
    }
    throw new Error('unknown style format: ' + str );
};


export const hasOwnProperty = Object.hasOwnProperty;

export function typedArrConcat(arrays: Uint8Array[], type = Uint8Array): Uint8Array {
    // sum of individual array lengths
    const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
    if (!arrays.length) return null;

    const result = new type(totalLength);

    // for each array - copy it over result
    // next array is copied right after the previous one
    let length = 0;
    for(const array of arrays) {
        result.set(array, length);
        length += array.length;
    }

    return result;
}

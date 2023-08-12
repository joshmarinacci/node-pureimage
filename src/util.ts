import {NAMED_COLORS} from './named_colors.js';
import * as uint32 from './uint32.js';
import {fromBytesBigEndian, or, shiftLeft, toUint32} from "./uint32.js";

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


export function colorStringToUint32(
    str: string): number {
    if(!str) return 0x000000;
    if(str.indexOf('#')===0) {
        if(str.length===4) {
            //Color format is #RGB
            //Will get 255 for the alpha channel
            const redNibble = parseInt(str[1], 16);
            const red = (redNibble << 4) | redNibble;
            const greenNibble = parseInt(str[2], 16);
            const green = (greenNibble << 4) | greenNibble;
            const blueNibble = parseInt(str[3], 16);
            const blue = (blueNibble << 4) | blueNibble;

            let int = toUint32(red << 16 | green << 8 | blue);
            int = shiftLeft(int,8);
            return or(int,0xff);
        } else if(str.length===5) {
            //Color format is #RGBA
            const redNibble = parseInt(str[1], 16);
            const red = (redNibble << 4) | redNibble;
            const greenNibble = parseInt(str[2], 16);
            const green = (greenNibble << 4) | greenNibble;
            const blueNibble = parseInt(str[3], 16);
            const blue = (blueNibble << 4) | blueNibble;
            const alphaNibble = parseInt(str[4], 16);
            const alpha = (alphaNibble << 4) | alphaNibble;

            let int = toUint32(red << 16 | green << 8 | blue);
            int = shiftLeft(int,8);
            return or(int,alpha);
        } else if(str.length===7) {
            //Color format is #RRGGBB
            //Will get 255 for the alpha channel
            let int = toUint32(parseInt(str.substring(1),16));
            int = shiftLeft(int,8);
            return or(int,0xff);
        } else if(str.length===9) {
            //Color format is #RRGGBBAA
            return toUint32(parseInt(str.substring(1),16));
        }
    }
    if(str.indexOf('rgba')===0) {
        const parts = str.trim().substring(4).replace('(','').replace(')','').split(',');
        return fromBytesBigEndian(
            parseInt(parts[0]),
            parseInt(parts[1]),
            parseInt(parts[2]),
            Math.floor(parseFloat(parts[3])*255));
    }
    if(str.indexOf('rgb')===0) {
        const parts = str.trim().substring(3).replace('(','').replace(')','').split(',');
        return fromBytesBigEndian(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 255);
    }
    if(hasOwnProperty.call(NAMED_COLORS,str)) {
        return NAMED_COLORS[str];
    }
    throw new Error('unknown style format: ' + str );
}


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

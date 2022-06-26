import {NAMED_COLORS} from "./named_colors.js"
import {fromBytesBigEndian, or, shiftLeft, toUint32} from "./uint32.js";

/**
 * Clamping is the process of limiting a position to an area
 *
 * @see https://en.wikipedia.org/wiki/Clamping_(graphics)
 *
 * @param {number} value The value to apply the clamp restriction to
 * @param {number} min   Lower limit
 * @param {number} max   Upper limit
 *
 * @returns {number}
 */
export function clamp(value,min,max) {
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
 * @param {number} a
 * @param {number} b
 * @param {number} t
 *
 * @ignore
 *
 * @see https://en.wikipedia.org/wiki/Linear_interpolation
 *
 * @returns {number}
 */
export const lerp = function(a,b,t) {  return a + (b-a)*t; }

/**
 * Color String To Unint32
 *
 * Convert a color string to Uint32 notation
 *
 * @static
 * @param {string} str The color string to convert
 *
 * @returns {number}
 *
 * @example
 * var uInt32 = colorStringToUint32('#FF00FF');
 * console.log(uInt32); // Prints 4278255615
 *
 * @memberof Context
 */
export function colorStringToUint32(str) {
    if(!str) return 0x000000;
    //hex values always get 255 for the alpha channel
    if(str.indexOf('#')===0) {
        if(str.length===4) {
            //Color format is #RGB
            //Will get 255 for the alpha channel
            let redNibble = parseInt(str[1], 16);
            let red = (redNibble << 4) | redNibble;
            let greenNibble = parseInt(str[2], 16);
            let green = (greenNibble << 4) | greenNibble;
            let blueNibble = parseInt(str[3], 16);
            let blue = (blueNibble << 4) | blueNibble;

            let int = toUint32(red << 16 | green << 8 | blue);
            int = shiftLeft(int,8);
            return or(int,0xff);
        } else if(str.length===5) {
            //Color format is #RGBA
            let redNibble = parseInt(str[1], 16);
            let red = (redNibble << 4) | redNibble;
            let greenNibble = parseInt(str[2], 16);
            let green = (greenNibble << 4) | greenNibble;
            let blueNibble = parseInt(str[3], 16);
            let blue = (blueNibble << 4) | blueNibble;
            let alphaNibble = parseInt(str[4], 16);
            let alpha = (alphaNibble << 4) | alphaNibble;

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
    if(NAMED_COLORS.hasOwnProperty(str)) {
        return NAMED_COLORS[str];
    }
    throw new Error("unknown style format: " + str );
}



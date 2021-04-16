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
export function clamp(value: number, min: number, max: number): number;

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
export function lerp(a: number, b: number, t: number): number;

export function colorStringToUint32(str: string): number;

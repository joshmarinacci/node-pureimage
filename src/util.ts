import { parseColor } from "./color.js";

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
  if (value < min) return min;
  if (value > max) return max;
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
export const lerp = function (a: number, b: number, t: number): number {
  return a + (b - a) * t;
};

/**
 * Parse a CSS color string into a 32-bit RGBA integer.
 *
 * @throws if the string is not a supported CSS color
 */
export function colorStringToUint32(str: string): number {
  if (!str) return 0x000000;
  const color = parseColor(str);
  if (color === null) throw new Error("unknown style format: " + str);
  return color;
}

export const hasOwnProperty = Object.hasOwnProperty;

export function typedArrConcat(
  arrays: Uint8Array[],
  type = Uint8Array,
): Uint8Array {
  // sum of individual array lengths
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
  if (!arrays.length) return null;

  const result = new type(totalLength);

  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0;
  for (const array of arrays) {
    result.set(array, length);
    length += array.length;
  }

  return result;
}

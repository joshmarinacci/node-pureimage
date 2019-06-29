import NAMED_COLORS, { INAMED_COLORS_KEYS } from './named_colors';
import { toUint32, or, shiftLeft, fromBytesBigEndian } from './uint32';

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
export function clamp(value: number, min: number, max: number)
{
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
export function lerp(a: number, b: number, t: number)
{
    return a + (b - a) * t;
}

export function colorStringToUint32(str: string | INAMED_COLORS_KEYS)
{
	if (!str) return 0x000000;
	//hex values always get 255 for the alpha channel
	if (str.indexOf('#') === 0)
	{
		let int = toUint32(parseInt(str.substring(1), 16));
		int = shiftLeft(int, 8);
		int = or(int, 0xff);
		return int;
	}
	if (str.indexOf('rgba') === 0)
	{
		const parts = str.trim().substring(4).replace('(', '').replace(')', '').split(',');
		return fromBytesBigEndian(
			parseInt(parts[0]),
			parseInt(parts[1]),
			parseInt(parts[2]),
			Math.floor(parseFloat(parts[3]) * 255),
		);
	}
	if (str.indexOf('rgb') === 0)
	{
		const parts = str.trim().substring(3).replace('(', '').replace(')', '').split(',');
		return fromBytesBigEndian(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 255);
	}
	if (NAMED_COLORS[str as INAMED_COLORS_KEYS])
	{
		return NAMED_COLORS[str as INAMED_COLORS_KEYS];
	}
	throw new Error("unknown style format: " + str);
}

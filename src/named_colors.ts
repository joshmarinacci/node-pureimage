/**
 * Enumeration containing popular colors
 * @enum {string}
 */

export enum NAMED_COLORS
{
	'white' = 0xFFFFFFff,
	'black' = 0x000000ff,
	'red' = 0xFF0000ff,
	'green' = 0x00FF00ff,
	'blue' = 0x0000FFff,
	'transparent' = 0x00000000,
}

export type INAMED_COLORS_KEYS = keyof typeof NAMED_COLORS;

export default NAMED_COLORS;

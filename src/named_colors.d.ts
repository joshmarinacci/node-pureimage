/**
 * Enumeration containing popular colors
 * @enum {string}
 */
export declare enum NAMED_COLORS {
    'white' = 4294967295,
    'black' = 255,
    'red' = 4278190335,
    'green' = 16711935,
    'blue' = 65535,
    'transparent' = 0
}
export declare type INAMED_COLORS_KEYS = keyof typeof NAMED_COLORS;
export default NAMED_COLORS;

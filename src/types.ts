import type {Point} from './point.js';
/**
 * Enum for path commands (used for encoding and decoding lines, curves etc. to and from a path)
 */
export enum PATH_COMMAND {
    MOVE = 'm',
    LINE = 'l',
    QUADRATIC_CURVE = 'q',
    BEZIER_CURVE = 'b',
}
export type RGBA = [number,number,number,number]
export type RGB = [number,number,number]
export type TextAlign = 'start' | 'end' | 'left' | 'center' | 'right';
export type TextBaseline = 'top' | 'middle' | 'alphabetic' | 'bottom';
export type PathCmd = {
    0: PATH_COMMAND,
    1: Point,
    2?: Point,
    3?: Point,
}
export type MinimumBounds = {
    x:number,
    y:number,
    x2:number,
    y2:number,
}

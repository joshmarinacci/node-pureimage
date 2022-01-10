
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
export type Font = {
    /** The font family to set */
    family: string;
    /** An integer representing the font size to use */
    size?: number;
    binary?: string;
    weight?: number;
    style?: string;
    variant?: string;
    loaded?: boolean;
    font?: opentype.Font | null;
    load?: (cb: CallableFunction) => void;
    loadSync?: () => Font;
    loadPromise?: () => Promise<void>;
};
export type TextAlign = 'start' | 'end' | 'left' | 'center' | 'right';
export type TextBaseline = 'top' | 'middle' | 'alphabetic' | 'bottom';
export type PathCmd = {
    0: PATH_COMMAND,
    1: Point,
    2?: Point,
    3?: Point,
}

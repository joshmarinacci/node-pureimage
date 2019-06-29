import Context from './context';
import { Font as IOpenTypeFont } from 'opentype.js';
interface ITextFont {
    binary: string;
    family: string;
    weight: number;
    style: string;
    variant: string;
    loaded: boolean;
    font: IOpenTypeFont;
    load(cb: () => void): void;
}
/**
 * Register Font
 *
 * @param {string} binaryPath Path to the font binary file(.eot, .ttf etc.)
 * @param {string} family     The name to give the font
 * @param {number} weight     The font weight to use
 * @param {string} style      Font style
 * @param {string} variant    Font variant
 *
 * @returns {void}
 */
export declare function registerFont(binaryPath: string, family: string, weight: number, style: string, variant: string): ITextFont;
/**@ignore */
export declare const debug_list_of_fonts: Record<string, ITextFont>;
export declare type IAlignH = 'start' | 'left' | 'end' | 'right' | 'center';
export declare type IAlignV = 'alphabetic' | 'top' | 'middle' | 'bottom';
/**
 * Process Text Path
 *
 * @param {Context} ctx  The {@link Context} to paint on
 * @param {string}  text The text to write to the given Context
 * @param {number}  x    X position
 * @param {number}  y    Y position
 * @param {boolean} fill Indicates wether or not the font should be filled
 *
 * @returns {void}
 */
export declare function processTextPath(ctx: Context, text: string, x: number, y: number, fill: any, hAlign: any, vAlign: any): void;
/**
 * Process Text Path
 *
 * @param {Context} ctx The {@link Context} to paint on
 * @param {string} text The name to give the font
 *
 * @returns {object}
 */
export declare function measureText(ctx: Context, text: string): {
    width: number;
    emHeightAscent: number;
    emHeightDescent: number;
};
export {};

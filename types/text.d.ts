import * as opentype from 'opentype.js';
import { Context } from './context';

type FontRecord = {
    binary: string;
    family: string;
    weight: number;
    style: string;
    variant: string;
    loaded: boolean;
    font: opentype.Font;
    load(cb: () => void): void;
    loadSync(): FontRecord | void;
};

/**
 * Register Font
 *
 * @param {string} binaryPath Path to the font binary file(.eot, .ttf etc.)
 * @param {string} family     The name to give the font
 * @param {number} weight     The font weight to use
 * @param {string} style      Font style
 * @param {string} variant    Font variant
 *
 * @returns {FontRecord} Font instance
 */
export function registerFont(
    binaryPath: string,
    family: string,
    weight: number,
    style: string,
    variant: string
): FontRecord;

/**@ignore */
export const debug_list_of_fonts: Record<string, FontRecord>;

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
export function processTextPath(
    ctx: Context,
    text: string,
    x: number,
    y: number,
    fill: boolean,
    hAlign: 'start' | 'left' | 'end' | 'right' | 'center',
    vAlign: 'alphabetic' | 'top' | 'middle' | 'bottom'
): void;

/**
 * Process Text Path
 *
 * @param {Context} ctx The {@link Context} to paint on
 * @param {string} text The name to give the font
 *
 */
export function measureText(
    ctx: Context,
    text: string
): {
    width: number;
    emHeightAscent: number;
    emHeightDescent: number;
};

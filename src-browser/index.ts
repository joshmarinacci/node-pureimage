
// eslint-disable-next-line no-console
console.log('we are in the browser. No need to do anything. Just use new Canvas()');

export const make = function(width: number,height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

export const pureimage = {
    make,
}
export type {Font, TextAlign, TextBaseline} from '../src/types.js';
export type {NAMED_COLORS} from '../src/named_colors.js';

export type {Bitmap} from '../src/bitmap.js';
import type {
    CanvasGradient,
    LinearGradient,
    RadialGradient,
    ColorGradient,
} from '../src/gradients.js';
export interface Gradients {
    CanvasGradient: CanvasGradient,
    LinearGradient: LinearGradient,
    RadialGradient: RadialGradient,
    ColorGradient: ColorGradient,
}
export type {registerFont} from '../src/text.js';
export type {Context} from '../src/context.js';

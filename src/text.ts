import * as opentype from 'opentype.js';
import type {Context} from './context.js';
import { TextAlign, TextBaseline } from './types.js';

/** Map containing all the fonts available for use */
const _fonts: Record<string,RegisteredFont> = {};

/** The default font family to use for text */
// const DEFAULT_FONT_FAMILY = 'source';

// export type Font = {
//     /** The font family to set */
//     family: string;
//     /** An integer representing the font size to use */
//     size?: number;
//     binary?: string;
//     weight?: number;
//     style?: string;
//     variant?: string;
//     loaded?: boolean;
//     font?: opentype.Font | null;
//     load?: (cb: CallableFunction) => void;
//     loadSync?: () => Font;
//     loadPromise?: () => Promise<void>;
// };


class RegisteredFont {
    binary: string
    family: string
    weight: number
    style: string
    variant: string
    loaded: boolean;
    font: null;
    constructor(binaryPath:string, family:string, weight?:number, style?:string, variant?:string) {
        this.binary = binaryPath
        this.family = family
        this.weight = weight
        this.style = style
        this.variant = variant
        this.loaded = false
        this.font = null
    }

    _load(cb) {
        if(this.loaded) {
            if(cb)cb();
            return;
        }
        const onLoad = (function(err, font) {
            if (err) throw new Error('Could not load font: ' + err);
            this.loaded = true;
            this.font = font;
            if(cb)cb();
        }).bind(this);
        opentype.load(this.binary, onLoad);
    }
    loadSync() {
        if(this.loaded) {
            return this;
        }
        try {
            this.font = opentype.loadSync(this.binary);
            this.loaded = true;
            return this;
        } catch (err) {
            throw new Error('Could not load font: ' + err);
        }
    }
    load() {
        return this.loadPromise()
    }
    loadPromise() {
        return new Promise<void>((res,_rej)=>{
            this._load(() => res())
        })
    }
}

/**
 * Register Font
 *
 * @returns Font instance
 */
export function registerFont(
    /** Path to the font binary file(.eot, .ttf etc.) */
    binaryPath: string,
    /** The name to give the font */
    family: string,
    /** The font weight to use */
    weight?: number,
    /** Font style */
    style?: string,
    /** Font variant */
    variant?: string,
) {
    _fonts[family] = new RegisteredFont(binaryPath, family, weight, style, variant)
    return _fonts[family];
}

/**@ignore */
export const debug_list_of_fonts = _fonts;

/**
 * Find Font
 *
 * Search the `fonts` array for a given font family name
 */
function findFont(
    /** The name of the font family to search for */
    family: string
):RegisteredFont|undefined {
    if(_fonts[family]) return _fonts[family];
    family =  Object.keys(_fonts)[0];
    return _fonts[family];
}

/** Process Text Path */
export function processTextPath(
    /** The {@link Context} to paint on */
    ctx: Context,
    /** The text to write to the given Context */
    text: string,
    /** X position */
    x: number,
    /** Y position */
    y: number,
    /** Indicates wether or not the font should be filled */
    fill: boolean,
    hAlign: TextAlign,
    vAlign: TextBaseline,
) {
    const font = findFont(ctx._font.family);
    if(!font) {
        // eslint-disable-next-line no-console
        console.warn('Font missing',ctx._font);
    }
    const metrics = measureText(ctx,text);
    /* if(hAlign === 'start' || hAlign === 'left')  x = x; */
    if(hAlign === 'end'   || hAlign === 'right')  x = x - metrics.width;
    if(hAlign === 'center')  x = x - metrics.width/2;

    /* if(vAlign === 'alphabetic') y = y; */
    if(vAlign === 'top') y = y + metrics.emHeightAscent;
    if(vAlign === 'middle') y = y + metrics.emHeightAscent/2+metrics.emHeightDescent/2;
    if(vAlign === 'bottom') y = y + metrics.emHeightDescent;
    const size = ctx._font.size;
    if(!font.loaded) {
        console.warn("font not loaded yet",ctx._font)
        return
    }
    const path = font.font.getPath(text, x, y, size);
    ctx.beginPath();
    path.commands.forEach(function(cmd) {
        switch(cmd.type) {
        case 'M': ctx.moveTo(cmd.x,cmd.y); break;
        case 'Q': ctx.quadraticCurveTo(cmd.x1,cmd.y1,cmd.x,cmd.y); break;
        case 'L': ctx.lineTo(cmd.x,cmd.y); break;
        case 'Z':
        {
            ctx.closePath();
            fill ? ctx.fill() : ctx.stroke();
            ctx.beginPath();
            break;
        }
        }
    });
}

/** Process Text Path */
export function measureText(
    /** The {@link Context} to paint on */
    ctx: Context,
    /** The name to give the font */
    text: string,
) {
    const font = findFont(ctx._font.family);
    if(!font) console.warn("WARNING. Can't find font family ", ctx._font);
    if(!font.font) console.warn("WARNING. Can't find font family ", ctx._font);
    const fsize = ctx._font.size;
    const glyphs = font.font.stringToGlyphs(text);
    let advance = 0;
    glyphs.forEach(function(g) { advance += g.advanceWidth });

    return {
        width: advance/font.font.unitsPerEm*fsize,
        emHeightAscent: font.font.ascender/font.font.unitsPerEm*fsize,
        emHeightDescent: font.font.descender/font.font.unitsPerEm*fsize,
    };
}

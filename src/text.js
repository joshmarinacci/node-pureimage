const opentype = require('opentype.js');


/**
 * @type {object} Map containing all the fonts available for use
 */
var _fonts = { };

/**
 * The default font family to use for text
 * @type {string}
 */
const DEFAULT_FONT_FAMILY = 'source';

/**
 * Register Font
 *
 * @param {string} binaryPath Path to the font binary file(.eot, .ttf etc.)
 * @param {string} family     The name to give the font
 * @param {number} weight     The font weight to use
 * @param {string} style      Font style
 * @param {string} variant    Font variant
 *
 * @returns {font} Font instance
 */
exports.registerFont = function(binaryPath, family, weight, style, variant) {
    _fonts[family] = {
        binary: binaryPath,
        family: family,
        weight: weight,
        style: style,
        variant: variant,
        loaded: false,
        font: null,
        load: function(cb) {
            if(this.loaded) {
                if(cb)cb();
                return;
            }
            var self = this;
            opentype.load(binaryPath, function (err, font) {
                if (err) throw new Error('Could not load font: ' + err);
                self.loaded = true;
                self.font = font;
                if(cb)cb();
            });
        },
        loadSync: function() {
            if(this.loaded) {
                return;
            }
            try {
                this.font = opentype.loadSync(binaryPath);
                this.loaded = true;
                return this;
            } catch (err) {
                throw new Error('Could not load font: ' + err);
            }
        }
    };
    return _fonts[family];
};
/**@ignore */
exports.debug_list_of_fonts = _fonts;

/**
 * Find Font
 *
 * Search the `fonts` array for a given font family name
 *
 * @param {string} family The name of the font family to search for
 *
 * @returns {object}
 */
function findFont(family) {
    if(_fonts[family]) return _fonts[family];
    family =  Object.keys(_fonts)[0];
    return _fonts[family];
}

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
exports.processTextPath = function(ctx,text,x,y, fill, hAlign, vAlign) {
    let font = findFont(ctx._font.family);
    if(!font) {
        console.warn("Font missing",ctx._font)
    }
    const metrics = exports.measureText(ctx,text)
    if(hAlign === 'start' || hAlign === 'left') /* x = x*/ ;
    if(hAlign === 'end'   || hAlign === 'right')  x = x - metrics.width
    if(hAlign === 'center')  x = x - metrics.width/2

    if(vAlign === 'alphabetic') /* y = y */ ;
    if(vAlign === 'top') y = y + metrics.emHeightAscent
    if(vAlign === 'middle') y = y + metrics.emHeightAscent/2+metrics.emHeightDescent/2
    if(vAlign === 'bottom') y = y + metrics.emHeightDescent
    var size = ctx._font.size;
    if(ctx.USE_FONT_GLYPH_CACHING) {
        var off = 0;
        for(var i=0; i<text.length; i++) {
            var ch = text[i];
            if(!cache.contains(font,size,ch)) {
                var glyph = renderGlyphToBitmap(font,ch,size);
                cache.insert(font,size,ch,glyph);
            }
            var glyph = cache.get(font,size,ch);
            var fx = x+off;
            var fy = y-glyph.ascent;
            var fpt = ctx.transform.transformPoint(fx,fy);
            ctx.copyImage(glyph.bitmap, Math.floor(fpt.x), Math.floor(fpt.y), ctx._fillColor);
            off += glyph.advance;
        }
    } else {
        font.load(function(){
            var path = font.font.getPath(text, x, y, size);
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
        });
    }
};

/**
 * Process Text Path
 *
 * @param {Context} ctx The {@link Context} to paint on
 * @param {string} text The name to give the font
 *
 * @returns {object}
 */
exports.measureText = function(ctx,text) {
    let font = findFont(ctx._font.family);
    if(!font) console.warn("WARNING. Can't find font family ", ctx._font);
    var fsize   = ctx._font.size;
    var glyphs  = font.font.stringToGlyphs(text);
    var advance = 0;
    glyphs.forEach(function(g) { advance += g.advanceWidth; });

    return {
        width: advance/font.font.unitsPerEm*fsize,
        emHeightAscent: font.font.ascender/font.font.unitsPerEm*fsize,
        emHeightDescent: font.font.descender/font.font.unitsPerEm*fsize,
    };
};

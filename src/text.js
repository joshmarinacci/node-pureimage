var opentype = require('opentype.js');

/**
 * Created by josh on 7/2/17.
 */
var _fonts = { };
const DEFAULT_FONT_FAMILY = 'source';

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
        }
    };
    return _fonts[family];
};
exports.debug_list_of_fonts = _fonts;

function findFont(family) {
    if(_fonts[family]) return _fonts[family];
    family =  Object.keys(_fonts)[0];
    return _fonts[family];
}

exports.processTextPath = function(ctx,text,x,y, fill) {
    let font = findFont(ctx._font.family);
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
    }
};

exports.measureText = function(ctx,text) {
    var font = _fonts[ctx._settings.font.family];
    if(!font) console.log("WARNING. Can't find font family ", ctx._settings.font.family);
    var fsize = ctx._settings.font.size;
    var glyphs = font.font.stringToGlyphs(text);
    var advance = 0;
    glyphs.forEach(function(g) { advance += g.advanceWidth; });

    return {
        width: advance/font.font.unitsPerEm*fsize,
        emHeightAscent: font.font.ascender/font.font.unitsPerEm*fsize,
        emHeightDescent: font.font.descender/font.font.unitsPerEm*fsize,
    };
};

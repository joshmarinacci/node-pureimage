import * as fs from "node:fs";
import * as opentype from "opentype.js";
import type { Context } from "./context.js";
import { TextAlign, TextBaseline } from "./types.js";

/** Map containing all the fonts available for use */
const _fonts: Record<string, RegisteredFont> = {};

/** The default font family to use for text */
// const DEFAULT_FONT_FAMILY = 'source';

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

class RegisteredFont {
  binary: string;
  family: string;
  weight: number;
  style: string;
  variant: string;
  loaded: boolean;
  font: opentype.Font;
  /** baseline coordinates from the font's BASE table, in font units; read lazily */
  baselines?: FontBaselines | null;
  constructor(
    binaryPath: string,
    family: string,
    weight?: number,
    style?: string,
    variant?: string,
  ) {
    this.binary = binaryPath;
    this.family = family;
    this.weight = weight;
    this.style = style;
    this.variant = variant;
    this.loaded = false;
    this.font = null;
  }

  _load(cb) {
    if (this.loaded) {
      if (cb) cb();
      return;
    }
    const onLoad = function (err, font) {
      if (err) throw new Error("Could not load font: " + err);
      this.loaded = true;
      this.font = font;
      if (cb) cb();
    }.bind(this);
    opentype.load(this.binary, onLoad);
  }
  loadSync() {
    if (this.loaded) {
      return this;
    }
    try {
      this.font = opentype.loadSync(this.binary);
      this.loaded = true;
      return this;
    } catch (err) {
      throw new Error("Could not load font: " + err);
    }
  }
  load() {
    return this.loadPromise();
  }
  loadPromise() {
    return new Promise<void>((res, _rej) => {
      this._load(() => res());
    });
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
  _fonts[family] = new RegisteredFont(
    binaryPath,
    family,
    weight,
    style,
    variant,
  );
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
  family: string,
): RegisteredFont | undefined {
  if (_fonts[family]) return _fonts[family];
  family = Object.keys(_fonts)[0];
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
  if (!font) {
    warnOnce(`no fonts registered; cannot draw text in "${ctx._font.family}"`);
    return;
  }
  if (!font.loaded) {
    warnOnce(`font "${font.family}" is not loaded yet; call load() or loadSync() before drawing`);
    return;
  }
  text = prepareText(text);
  const metrics = measureText(ctx, text);
  // move from the alignment point to the start of the text on the alphabetic baseline
  if (hAlign === "end" || hAlign === "right") x = x - metrics.width;
  if (hAlign === "center") x = x - metrics.width / 2;
  y = y + baselineCoordinate(fontMetrics(font, ctx._font.size), vAlign);
  const size = ctx._font.size;
  const path = font.font.getPath(text, x, y, size);
  ctx.beginPath();
  path.commands.forEach(function (cmd) {
    switch (cmd.type) {
      case "M":
        ctx.moveTo(cmd.x, cmd.y);
        break;
      case "Q":
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        break;
      case "L":
        ctx.lineTo(cmd.x, cmd.y);
        break;
      case "C":
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        break;
      case "Z": {
        ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
        ctx.beginPath();
        break;
      }
    }
  });
}
/**
 * Text measurements, as returned by {@link Context.measureText}.
 *
 * Vertical values are distances from the current textBaseline; horizontal ink extents are
 * distances from the textAlign alignment point.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics
 */
export type TextMetrics = {
  width: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  fontBoundingBoxAscent: number;
  fontBoundingBoxDescent: number;
  emHeightAscent: number;
  emHeightDescent: number;
  hangingBaseline: number;
  alphabeticBaseline: number;
  ideographicBaseline: number;
};

type FontBaselines = { hanging?: number; ideographic?: number };

/**
 * Vertical metrics of a font at a size, in pixels. Positions are measured upwards from the
 * alphabetic baseline; descents are positive distances below it.
 */
type FontMetrics = {
  ascent: number;
  descent: number;
  emAscent: number;
  emDescent: number;
  hanging: number;
  ideographic: number;
};

const warned = new Set<string>();
/** Warn about a problem once, rather than for every glyph or call. */
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  // eslint-disable-next-line no-console
  console.warn("pureimage: " + message);
}

/**
 * Canvas text preparation: ASCII whitespace (tab, LF, FF, CR) becomes a space. U+0000 is
 * dropped so it takes up no space, as in browsers; other characters are drawn as-is.
 */
function prepareText(text: string): string {
  return String(text)
    .replace(/[\t\n\f\r]/g, " ")
    .replace(/\u0000/g, "");
}

/** Read the horizontal baselines from a font's BASE table, if it has one. */
function readBaselines(binaryPath: string): FontBaselines | null {
  try {
    const b = fs.readFileSync(binaryPath);
    const numTables = b.readUInt16BE(4);
    let base = -1;
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + 16 * i;
      if (b.toString("latin1", rec, rec + 4) === "BASE") base = b.readUInt32BE(rec + 8);
    }
    if (base < 0) return null;
    const axis = base + b.readUInt16BE(base + 4); // horizAxisOffset
    if (axis === base) return null;
    const tagList = axis + b.readUInt16BE(axis);
    const scriptList = axis + b.readUInt16BE(axis + 2);
    const tags: string[] = [];
    for (let i = 0; i < b.readUInt16BE(tagList); i++) {
      tags.push(b.toString("latin1", tagList + 2 + 4 * i, tagList + 6 + 4 * i));
    }
    if (b.readUInt16BE(scriptList) === 0) return null;
    // use the first script (usually DFLT or latn)
    const script = scriptList + b.readUInt16BE(scriptList + 6);
    const valuesOffset = b.readUInt16BE(script);
    if (valuesOffset === 0) return null;
    const values = script + valuesOffset;
    const coords: Record<string, number> = {};
    const count = b.readUInt16BE(values + 2);
    for (let i = 0; i < count && i < tags.length; i++) {
      const coord = values + b.readUInt16BE(values + 4 + 2 * i);
      coords[tags[i]] = b.readInt16BE(coord + 2);
    }
    const romn = coords.romn ?? 0;
    return {
      hanging: coords.hang !== undefined ? coords.hang - romn : undefined,
      ideographic: coords.ideo !== undefined ? coords.ideo - romn : undefined,
    };
  } catch {
    return null;
  }
}

function fontMetrics(font: RegisteredFont, size: number): FontMetrics {
  const f = font.font;
  const scale = size / f.unitsPerEm;
  const os2 = f.tables.os2;
  // like browsers, prefer the typographic metrics when the font asks for them (USE_TYPO_METRICS)
  const useTypo = os2 && (os2.fsSelection & 0x80) !== 0;
  const ascentUnits = useTypo ? os2.sTypoAscender : f.ascender;
  const descentUnits = -(useTypo ? os2.sTypoDescender : f.descender);
  const ascent = ascentUnits * scale;
  const descent = descentUnits * scale;
  // the em box is the font's ascent:descent ratio scaled to exactly one em
  const total = ascentUnits + descentUnits;
  const emAscent = total > 0 ? (size * ascentUnits) / total : size;
  if (font.baselines === undefined) font.baselines = readBaselines(font.binary);
  const base = font.baselines;
  return {
    ascent,
    descent,
    emAscent,
    emDescent: size - emAscent,
    hanging: base?.hanging !== undefined ? base.hanging * scale : ascent * 0.8,
    ideographic: base?.ideographic !== undefined ? base.ideographic * scale : -descent,
  };
}

/** The position of a textBaseline, upwards from the alphabetic baseline. */
function baselineCoordinate(m: FontMetrics, baseline: string): number {
  switch (baseline) {
    case "top":
      return m.emAscent;
    case "hanging":
      return m.hanging;
    case "middle":
      return (m.emAscent - m.emDescent) / 2;
    case "ideographic":
      return m.ideographic;
    case "bottom":
      return -m.emDescent;
    default:
      return 0;
  }
}

/** Measure text in the context's current font, relative to its textAlign and textBaseline. */
export function measureText(
  /** The {@link Context} whose font, textAlign and textBaseline are used */
  ctx: Context,
  /** The text to measure */
  text: string,
): TextMetrics {
  const font = findFont(ctx._font.family);
  if (!font || !font.font) {
    warnOnce(`can't measure text: font "${ctx._font.family}" is not registered and loaded`);
    return emptyMetrics(10, 8, 2);
  }
  text = prepareText(text);
  const size = ctx._font.size;
  const scale = size / font.font.unitsPerEm;
  // pass the render options explicitly: with no options, opentype.js 1.3.4 applies GSUB
  // features in a way that throws for fonts using lookups it doesn't support (e.g. Lato)
  // (@types/opentype.js omits the options parameter)
  const otFont = font.font as unknown as {
    defaultRenderOptions: opentype.RenderOptions;
    stringToGlyphs(s: string, options?: opentype.RenderOptions): opentype.Glyph[];
  };
  const glyphs = otFont.stringToGlyphs(text, otFont.defaultRenderOptions);
  let advance = 0;
  glyphs.forEach(function (g) {
    advance += g.advanceWidth;
  });
  const width = advance * scale;

  const m = fontMetrics(font, size);
  const ref = baselineCoordinate(m, ctx.textBaseline);
  const align = ctx.textAlign;
  const alignX = align === "right" || align === "end" ? width : align === "center" ? width / 2 : 0;

  // ink bounds; whitespace without a glyph in this font is blank, as with a fallback font
  const inkText = text.replace(/\s/g, " ");
  // path coordinates grow downwards; an empty path has an all-zero box
  const { x1, y1, x2, y2 } = font.font.getPath(inkText, 0, 0, size).getBoundingBox();

  return {
    width,
    actualBoundingBoxLeft: alignX - x1,
    actualBoundingBoxRight: x2 - alignX,
    actualBoundingBoxAscent: -y1 - ref,
    actualBoundingBoxDescent: y2 + ref,
    fontBoundingBoxAscent: m.ascent - ref,
    fontBoundingBoxDescent: m.descent + ref,
    emHeightAscent: m.emAscent - ref,
    emHeightDescent: m.emDescent + ref,
    hangingBaseline: m.hanging - ref,
    alphabeticBaseline: -ref,
    ideographicBaseline: m.ideographic - ref,
  };
}

function emptyMetrics(width: number, ascent: number, descent: number): TextMetrics {
  return {
    width,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: width,
    actualBoundingBoxAscent: ascent,
    actualBoundingBoxDescent: descent,
    fontBoundingBoxAscent: ascent,
    fontBoundingBoxDescent: descent,
    emHeightAscent: ascent,
    emHeightDescent: descent,
    hangingBaseline: ascent * 0.8,
    alphabeticBaseline: 0,
    ideographicBaseline: -descent,
  };
}

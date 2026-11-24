import * as fs from "node:fs";
import * as opentype from "opentype.js";
import type { Context } from "./context.js";
import { FontFamily, isGenericFamily } from "./font.js";
import { TextAlign, TextBaseline } from "./types.js";

/** Map containing all the fonts available for use */
const _fonts: Record<string, RegisteredFont> = {};

/** The default font family to use for text */
// const DEFAULT_FONT_FAMILY = 'source';

export type Font = {
  /** The font family to set; the first of `families` when there is a list */
  family: string;
  /** The font-family list, in order of preference */
  families?: FontFamily[];
  stretch?: string;
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
 * Find the registered font for a context font: the first family in its list that is registered,
 * or else the first registered font.
 */
function findFont(font: Font): RegisteredFont | undefined {
  const families = font.families ?? [{ name: font.family, quoted: false }];
  for (const family of families) {
    if (_fonts[family.name] && !isGenericFamily(family)) return _fonts[family.name];
  }
  // a generic family such as serif can still name a registered font
  for (const family of families) {
    if (_fonts[family.name]) return _fonts[family.name];
  }
  return _fonts[Object.keys(_fonts)[0]];
}

/** start and end resolved to left or right by the context's direction. */
function physicalAlign(align: TextAlign, ctx: Context): "left" | "right" | "center" {
  if (align === "left" || align === "right" || align === "center") return align;
  const rtl = ctx.direction === "rtl";
  return (align === "start") !== rtl ? "left" : "right";
}

const isWordSeparator = (ch: string) => ch === " " || ch === "\u00a0";

/** The glyphs of a text in a font, with their pen positions in px from the start of the text. */
type Layout = { glyphs: { glyph: opentype.Glyph; x: number }[]; width: number };

/**
 * Lays out text with the context's letterSpacing and wordSpacing. Without spacing, glyphs come
 * from opentype.js's shaping (so ligatures apply); with spacing, there is one glyph per character.
 */
function layoutText(font: opentype.Font, text: string, size: number, ctx: Context): Layout {
  const scale = size / font.unitsPerEm;
  const spacing = ctx._spacingPx();
  const glyphs: Layout["glyphs"] = [];
  // advances are summed in font units and scaled once, so widths don't pick up rounding error
  let units = 0;
  let extra = 0;
  if (spacing.letter === 0 && spacing.word === 0) {
    // pass the render options explicitly: with no options, opentype.js 1.3.4 applies GSUB
    // features in a way that throws for fonts using lookups it doesn't support (e.g. Lato)
    // (@types/opentype.js omits the options parameter)
    const otFont = font as unknown as {
      defaultRenderOptions: opentype.RenderOptions;
      stringToGlyphs(s: string, options?: opentype.RenderOptions): opentype.Glyph[];
    };
    for (const glyph of otFont.stringToGlyphs(text, otFont.defaultRenderOptions)) {
      glyphs.push({ glyph, x: units * scale });
      units += glyph.advanceWidth;
    }
    return { glyphs, width: units * scale };
  }
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    glyphs.push({ glyph, x: units * scale + extra });
    units += glyph.advanceWidth;
    extra += spacing.letter + (isWordSeparator(ch) ? spacing.word : 0);
  }
  return { glyphs, width: units * scale + extra };
}

/** Text width when no font is available: half an em per character, plus spacing. */
function fallbackWidth(text: string, size: number, ctx: Context): number {
  const spacing = ctx._spacingPx();
  let width = 0;
  for (const ch of text) width += size / 2 + spacing.letter + (isWordSeparator(ch) ? spacing.word : 0);
  return width;
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
  /** If given, the text is squeezed horizontally to fit this width; nothing is drawn if it isn't positive */
  maxWidth?: number,
) {
  if (maxWidth !== undefined && !(maxWidth > 0)) return;
  const font = findFont(ctx._font);
  if (!font) {
    warnOnce(`no fonts registered; cannot draw text in "${ctx._font.family}"`);
    return;
  }
  if (!font.loaded) {
    warnOnce(`font "${font.family}" is not loaded yet; call load() or loadSync() before drawing`);
    return;
  }
  text = prepareText(text);
  const size = ctx._font.size;
  const layout = layoutText(font.font, text, size, ctx);
  const scaleX = maxWidth !== undefined && layout.width > maxWidth ? maxWidth / layout.width : 1;
  const drawnWidth = layout.width * scaleX;
  // move from the alignment point to the start of the text on the alphabetic baseline
  const align = physicalAlign(hAlign, ctx);
  if (align === "right") x = x - drawnWidth;
  if (align === "center") x = x - drawnWidth / 2;
  y = y + baselineCoordinate(fontMetrics(font, size), vAlign);
  // glyph outlines are laid out from x = 0, then squeezed to fit maxWidth
  const commands: opentype.PathCommand[] = [];
  if (ctx._spacingPx().letter === 0 && ctx._spacingPx().word === 0) {
    commands.push(...font.font.getPath(text, 0, y, size).commands);
  } else {
    for (const g of layout.glyphs) commands.push(...g.glyph.getPath(g.x, y, size).commands);
  }
  const px = (cx: number) => x + cx * scaleX;
  // build every contour into one path and fill it once: a glyph's inner contours wind the
  // opposite way to its outer ones, so the nonzero rule cuts out holes such as the middle of an o
  ctx.beginPath();
  commands.forEach(function (cmd) {
    switch (cmd.type) {
      case "M":
        ctx.moveTo(px(cmd.x), cmd.y);
        break;
      case "Q":
        ctx.quadraticCurveTo(px(cmd.x1), cmd.y1, px(cmd.x), cmd.y);
        break;
      case "L":
        ctx.lineTo(px(cmd.x), cmd.y);
        break;
      case "C":
        ctx.bezierCurveTo(px(cmd.x1), cmd.y1, px(cmd.x2), cmd.y2, px(cmd.x), cmd.y);
        break;
      case "Z":
        ctx.closePath();
        break;
    }
  });
  if (fill) ctx.fill();
  else ctx.stroke();
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
  const font = findFont(ctx._font);
  text = prepareText(text);
  const size = ctx._font.size;
  if (!font || !font.font) {
    warnOnce(`can't measure text: font "${ctx._font.family}" is not registered and loaded`);
    return fallbackMetrics(fallbackWidth(text, size, ctx), size, physicalAlign(ctx.textAlign, ctx));
  }
  const layout = layoutText(font.font, text, size, ctx);
  const width = layout.width;

  const m = fontMetrics(font, size);
  const ref = baselineCoordinate(m, ctx.textBaseline);
  const align = physicalAlign(ctx.textAlign, ctx);
  const alignX = align === "right" ? width : align === "center" ? width / 2 : 0;

  // ink bounds; path coordinates grow downwards, and an empty path has an all-zero box
  let x1 = 0;
  let y1 = 0;
  let x2 = 0;
  let y2 = 0;
  let first = true;
  // whitespace without a glyph in this font is blank, as with a fallback font
  const inkText = text.replace(/\s/g, " ");
  for (const g of layoutText(font.font, inkText, size, ctx).glyphs) {
    const box = g.glyph.getPath(g.x, 0, size).getBoundingBox();
    if (box.x1 === 0 && box.x2 === 0 && box.y1 === 0 && box.y2 === 0) continue;
    if (first) ({ x1, y1, x2, y2 } = box);
    else {
      x1 = Math.min(x1, box.x1);
      y1 = Math.min(y1, box.y1);
      x2 = Math.max(x2, box.x2);
      y2 = Math.max(y2, box.y2);
    }
    first = false;
  }

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

/** Approximate metrics when no font is available. */
function fallbackMetrics(width: number, size: number, align: "left" | "right" | "center"): TextMetrics {
  const ascent = size * 0.8;
  const descent = size * 0.2;
  const alignX = align === "right" ? width : align === "center" ? width / 2 : 0;
  return {
    width,
    actualBoundingBoxLeft: alignX,
    actualBoundingBoxRight: width - alignX,
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

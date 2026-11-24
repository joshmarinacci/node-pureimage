/**
 * Parsing and serializing the CSS values used by the canvas text attributes: the `font`
 * shorthand, and the lengths used by `letterSpacing` and `wordSpacing`.
 *
 * Font-relative units are resolved against the canvas default font, 10px sans-serif.
 */

/** A family in a font-family list. Quoted names are kept apart so `"serif"` isn't the generic serif. */
export type FontFamily = { name: string; quoted: boolean };

export type ParsedFont = {
  /** in pixels */
  size: number;
  families: FontFamily[];
  style?: string;
  variant?: string;
  weight?: number;
  stretch?: string;
};

/** The size font-relative units refer to: the default font is 10px sans-serif. */
const DEFAULT_FONT_SIZE = 10;

const ABSOLUTE_UNITS: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
};

/** Font-relative units, in ems. ex and ch use the usual approximation of half an em. */
const FONT_RELATIVE_UNITS: Record<string, number> = {
  em: 1,
  rem: 1,
  ex: 0.5,
  ch: 0.5,
  ic: 1,
};

const SIZE_KEYWORDS: Record<string, number> = {
  "xx-small": 9,
  "x-small": 10,
  small: 13,
  medium: 16,
  large: 18,
  "x-large": 24,
  "xx-large": 32,
  "xxx-large": 48,
  larger: DEFAULT_FONT_SIZE * 1.2,
  smaller: DEFAULT_FONT_SIZE / 1.2,
};

export const FONT_STRETCHES = [
  "ultra-condensed",
  "extra-condensed",
  "condensed",
  "semi-condensed",
  "normal",
  "semi-expanded",
  "expanded",
  "extra-expanded",
  "ultra-expanded",
] as const;

/** Keywords that can't be an unquoted family name. */
const RESERVED_FAMILY_NAMES = new Set([
  "inherit",
  "initial",
  "unset",
  "default",
  "revert",
  "revert-layer",
]);

/**
 * The px value of a length in the given unit, or undefined for an unknown unit.
 * Font-relative units are resolved against `fontSize`.
 */
export function lengthToPx(
  value: number,
  unit: string,
  fontSize = DEFAULT_FONT_SIZE,
): number | undefined {
  unit = unit.toLowerCase();
  if (unit in ABSOLUTE_UNITS) return value * ABSOLUTE_UNITS[unit];
  if (unit in FONT_RELATIVE_UNITS) {
    // rem is relative to the root font, which for a canvas is the default font
    const base = unit === "rem" ? DEFAULT_FONT_SIZE : fontSize;
    return value * FONT_RELATIVE_UNITS[unit] * base;
  }
  return undefined;
}

type Token =
  | { type: "ident"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "dimension"; value: number; unit: string }
  | { type: "percentage"; value: number }
  | { type: "comma" }
  | { type: "slash" };

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i;
const IDENT_RE = /^-?(?:[a-zA-Z_\u0080-￿]|-)[\w\-\u0080-￿]*/;

/** A small CSS tokenizer; null for anything a font value can't contain (blocks, functions, ...). */
function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let s = input;
  while (s.length > 0) {
    const ws = s.match(/^\s+/);
    if (ws) {
      s = s.slice(ws[0].length);
      continue;
    }
    const c = s[0];
    if (c === ",") {
      tokens.push({ type: "comma" });
      s = s.slice(1);
      continue;
    }
    if (c === "/") {
      tokens.push({ type: "slash" });
      s = s.slice(1);
      continue;
    }
    if (c === '"' || c === "'") {
      const str = readString(s);
      if (!str) return null;
      tokens.push({ type: "string", value: str.value });
      s = s.slice(str.length);
      continue;
    }
    const num = s.match(NUMBER_RE);
    if (num) {
      const value = parseFloat(num[0]);
      s = s.slice(num[0].length);
      if (s[0] === "%") {
        tokens.push({ type: "percentage", value });
        s = s.slice(1);
        continue;
      }
      const unit = s.match(/^[a-zA-Z]+/);
      if (unit) {
        tokens.push({ type: "dimension", value, unit: unit[0].toLowerCase() });
        s = s.slice(unit[0].length);
      } else {
        tokens.push({ type: "number", value });
      }
      continue;
    }
    const ident = s.match(IDENT_RE);
    if (ident) {
      s = s.slice(ident[0].length);
      // a function, such as var(), isn't supported
      if (s[0] === "(") return null;
      tokens.push({ type: "ident", value: ident[0] });
      continue;
    }
    return null;
  }
  return tokens;
}

/** Reads a quoted CSS string at the start of `s`, handling backslash escapes. */
function readString(s: string): { value: string; length: number } | null {
  const quote = s[0];
  let value = "";
  let i = 1;
  while (i < s.length) {
    const c = s[i];
    if (c === quote) return { value, length: i + 1 };
    if (c === "\n") return null;
    if (c === "\\") {
      const hex = s.slice(i + 1).match(/^[0-9a-fA-F]{1,6}\s?/);
      if (hex) {
        value += String.fromCodePoint(parseInt(hex[0], 16) || 0xfffd);
        i += 1 + hex[0].length;
      } else {
        // an escaped newline is a line continuation
        if (s[i + 1] !== "\n") value += s[i + 1] ?? "";
        i += 2;
      }
      continue;
    }
    value += c;
    i++;
  }
  return null;
}

/**
 * Parses a CSS `font` shorthand value, as assigned to {@link Context.font}. Returns null if the
 * value isn't valid, in which case the assignment is ignored.
 */
export function parseFont(value: string): ParsedFont | null {
  const tokens = tokenize(String(value));
  if (!tokens || tokens.length === 0) return null;
  const font: Partial<ParsedFont> = {};
  let i = 0;
  let prefixCount = 0;

  // [ <font-style> || <font-variant-css2> || <font-weight> || <font-stretch-css3> ]?
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "ident") {
      const v = t.value.toLowerCase();
      if (v in SIZE_KEYWORDS) break;
      if (++prefixCount > 4) return null;
      if (v === "normal") continue;
      if ((v === "italic" || v === "oblique") && font.style === undefined)
        font.style = v;
      else if (v === "small-caps" && font.variant === undefined)
        font.variant = v;
      else if (v === "bold" && font.weight === undefined) font.weight = 700;
      // relative to the default weight, 400
      else if (v === "bolder" && font.weight === undefined) font.weight = 700;
      else if (v === "lighter" && font.weight === undefined) font.weight = 100;
      else if (
        (FONT_STRETCHES as readonly string[]).includes(v) &&
        font.stretch === undefined
      )
        font.stretch = v;
      else return null;
      continue;
    }
    if (t.type === "number") {
      if (
        ++prefixCount > 4 ||
        font.weight !== undefined ||
        t.value < 1 ||
        t.value > 1000
      )
        return null;
      font.weight = t.value;
      continue;
    }
    break;
  }

  // <font-size>
  const sizeToken = tokens[i++];
  if (!sizeToken) return null;
  let size: number | undefined;
  if (sizeToken.type === "ident")
    size = SIZE_KEYWORDS[sizeToken.value.toLowerCase()];
  // PureImage has always treated pt as px in font sizes (CSS says 1pt = 4/3 px); kept for compatibility
  else if (sizeToken.type === "dimension") {
    size =
      sizeToken.unit === "pt"
        ? sizeToken.value
        : lengthToPx(sizeToken.value, sizeToken.unit);
  } else if (sizeToken.type === "percentage")
    size = (sizeToken.value / 100) * DEFAULT_FONT_SIZE;
  if (size === undefined || !Number.isFinite(size) || size < 0) return null;

  // [ / <line-height> ]?, which a canvas ignores
  if (tokens[i]?.type === "slash") {
    const lh = tokens[i + 1];
    const ok =
      lh &&
      (lh.type === "number" ||
        lh.type === "dimension" ||
        lh.type === "percentage" ||
        (lh.type === "ident" && lh.value.toLowerCase() === "normal"));
    if (!ok) return null;
    i += 2;
  }

  // <font-family>#
  const families: FontFamily[] = [];
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "string") {
      families.push({ name: t.value, quoted: true });
      i++;
    } else if (t.type === "ident") {
      const words: string[] = [];
      while (tokens[i]?.type === "ident")
        words.push((tokens[i++] as { value: string }).value);
      if (words.some((w) => RESERVED_FAMILY_NAMES.has(w.toLowerCase())))
        return null;
      families.push({ name: words.join(" "), quoted: false });
    } else {
      return null;
    }
    if (i < tokens.length) {
      if (tokens[i].type !== "comma") return null;
      i++;
      if (i === tokens.length) return null; // a trailing comma
    }
  }
  if (families.length === 0) return null;

  return { ...font, size, families };
}

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "cursive",
  "fantasy",
  "monospace",
  "system-ui",
  "math",
  "emoji",
  "fangsong",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
]);

/** Whether a family is a generic family keyword, such as serif, rather than a font name. */
export function isGenericFamily(family: FontFamily): boolean {
  return !family.quoted && GENERIC_FAMILIES.has(family.name.toLowerCase());
}

function serializeFamily(family: FontFamily): string {
  if (!family.quoted)
    return isGenericFamily(family) ? family.name.toLowerCase() : family.name;
  return `"${family.name.replace(/[\\"]/g, (c) => "\\" + c)}"`;
}

/** Serializes a font the way browsers do: omitting normal values, with the size in px. */
export function serializeFont(font: ParsedFont): string {
  const parts: string[] = [];
  if (font.style && font.style !== "normal") parts.push(font.style);
  if (font.variant && font.variant !== "normal") parts.push(font.variant);
  if (font.weight !== undefined && font.weight !== 400)
    parts.push(font.weight === 700 ? "bold" : String(font.weight));
  if (font.stretch && font.stretch !== "normal") parts.push(font.stretch);
  parts.push(`${font.size}px`);
  parts.push(font.families.map(serializeFamily).join(", "));
  return parts.join(" ");
}

/** A parsed letterSpacing or wordSpacing length. */
export type SpacingLength = { value: number; unit: string };

const SPACING_RE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]*)$/i;

/** Parses a CSS length for letterSpacing or wordSpacing; null if it isn't one. */
export function parseSpacing(value: unknown): SpacingLength | null {
  const m = String(value).trim().match(SPACING_RE);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (!Number.isFinite(n)) return null;
  if (unit === "") return n === 0 ? { value: 0, unit: "px" } : null;
  if (lengthToPx(1, unit) === undefined) return null;
  return { value: n, unit };
}

export function serializeSpacing(s: SpacingLength): string {
  return `${s.value}${s.unit}`;
}

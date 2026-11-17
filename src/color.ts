import { NAMED_COLORS } from "./named_colors.js";
import { fromBytesBigEndian, getBytesBigEndian } from "./uint32.js";

/**
 * CSS color parsing and serialization for canvas fillStyle/strokeStyle.
 *
 * Supports hex (#rgb, #rgba, #rrggbb, #rrggbbaa), named colors (case-insensitive),
 * and rgb()/rgba()/hsl()/hsla() in both the legacy comma syntax and the
 * CSS Color 4 space syntax with an optional `/ alpha`.
 *
 * @see https://www.w3.org/TR/css-color-4/
 */

const NUMBER = /^[+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?$/;
const PERCENT = /^([+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?)%$/;
const ANGLE = /^([+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?)(deg|grad|rad|turn)$/;
const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const FUNC = /^(rgba?|hsla?)\(([^()]*)\)?$/;

type Component =
  | { kind: "number"; value: number }
  | { kind: "percent"; value: number }
  | { kind: "angle"; value: number }
  | { kind: "none" };

const ANGLE_TO_DEGREES: Record<string, number> = {
  deg: 1,
  grad: 360 / 400,
  rad: 180 / Math.PI,
  turn: 360,
};

function parseComponent(token: string): Component | null {
  if (token === "none") return { kind: "none" };
  if (NUMBER.test(token)) return { kind: "number", value: parseFloat(token) };
  let m = PERCENT.exec(token);
  if (m) return { kind: "percent", value: parseFloat(m[1]) };
  m = ANGLE.exec(token);
  if (m) return { kind: "angle", value: parseFloat(m[1]) * ANGLE_TO_DEGREES[m[5]] };
  return null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const toByte = (v: number) => Math.round(clamp01(v) * 255);

function alphaFrom(c: Component | undefined): number | null {
  if (!c) return 1;
  if (c.kind === "number") return clamp01(c.value);
  if (c.kind === "percent") return clamp01(c.value / 100);
  if (c.kind === "none") return 0;
  return null;
}

/** Split a function body into its three channels plus optional alpha, or null if malformed. */
function splitArgs(body: string): { legacy: boolean; parts: string[] } | null {
  if (body.includes(",")) {
    if (body.includes("/")) return null;
    const parts = body.split(",").map((s) => s.trim());
    if (parts.length < 3 || parts.length > 4) return null;
    if (parts.some((p) => p === "" || /\s/.test(p))) return null;
    return { legacy: true, parts };
  }
  const slash = body.split("/");
  if (slash.length > 2) return null;
  const channels = slash[0].trim().split(/\s+/);
  if (channels.length !== 3 || channels[0] === "") return null;
  if (slash.length === 2) {
    const alpha = slash[1].trim();
    if (alpha === "" || /\s/.test(alpha)) return null;
    channels.push(alpha);
  }
  return { legacy: false, parts: channels };
}

function parseRgb(comps: Component[], legacy: boolean): number | null {
  const channels = comps.slice(0, 3);
  if (channels.some((c) => c.kind === "angle")) return null;
  if (legacy) {
    // legacy syntax requires all channels to be the same type, and forbids `none`
    if (channels.some((c) => c.kind === "none")) return null;
    if (!channels.every((c) => c.kind === channels[0].kind)) return null;
  }
  const bytes = channels.map((c) => {
    if (c.kind === "number") return toByte(c.value / 255);
    if (c.kind === "percent") return toByte(c.value / 100);
    return 0;
  });
  const alpha = alphaFrom(comps[3]);
  if (alpha === null) return null;
  return fromBytesBigEndian(bytes[0], bytes[1], bytes[2], toByte(alpha));
}

function parseHsl(comps: Component[], legacy: boolean): number | null {
  const [h, s, l] = comps;
  if (h.kind === "percent") return null;
  if (legacy) {
    if (h.kind === "none" || s.kind !== "percent" || l.kind !== "percent") return null;
  } else if (s.kind === "angle" || l.kind === "angle") {
    return null;
  }
  const value = (c: Component) => (c.kind === "none" ? 0 : (c as { value: number }).value);
  const hue = (((value(h) % 360) + 360) % 360) / 360;
  const sat = clamp01(value(s) / 100);
  const light = clamp01(value(l) / 100);
  const alpha = alphaFrom(comps[3]);
  if (alpha === null) return null;
  const [r, g, b] = hslToRgb(hue, sat, light);
  return fromBytesBigEndian(toByte(r), toByte(g), toByte(b), toByte(alpha));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

function parseHex(hex: string): number {
  const digits =
    hex.length <= 4 ? hex.split("").map((d) => d + d).join("") : hex;
  const full = digits.length === 6 ? digits + "ff" : digits;
  return parseInt(full, 16) >>> 0;
}

/**
 * Parse a CSS color string into a 32-bit RGBA integer.
 *
 * @returns the color, or null if the string is not a supported CSS color
 */
export function parseColor(input: string): number | null {
  const str = input.trim().toLowerCase();
  const hex = HEX.exec(str);
  if (hex) return parseHex(hex[1]);

  const named = (NAMED_COLORS as unknown as Record<string, unknown>)[str];
  if (typeof named === "number") return named >>> 0;

  const fn = FUNC.exec(str);
  if (!fn) return null;
  const args = splitArgs(fn[2]);
  if (!args) return null;
  const comps: Component[] = [];
  for (const part of args.parts) {
    const c = parseComponent(part);
    if (!c) return null;
    comps.push(c);
  }
  return fn[1].startsWith("rgb")
    ? parseRgb(comps, args.legacy)
    : parseHsl(comps, args.legacy);
}

function serializeAlpha(byte: number): string {
  if (byte === 0) return "0";
  // shortest decimal that round-trips to the same 8-bit value, as browsers do
  const two = Math.round((byte / 255) * 100) / 100;
  if (Math.round(two * 255) === byte) return String(two);
  return String(Math.round((byte / 255) * 1000) / 1000);
}

/**
 * Serialize a 32-bit RGBA color the way canvas style getters do:
 * `#rrggbb` when opaque, otherwise `rgba(r, g, b, a)`.
 */
export function serializeColor(color: number): string {
  const [r, g, b, a] = getBytesBigEndian(color);
  if (a === 255) {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  return `rgba(${r}, ${g}, ${b}, ${serializeAlpha(a)})`;
}

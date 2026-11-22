import { PathBuilder, requireArgs } from "./path.js";
import { matrixFromInit, MatrixInit } from "./pattern.js";
import { Point } from "./point.js";
import { Transform } from "./transform.js";
import { PATH_COMMAND, PathCmd } from "./types.js";

const IDENTITY = new Transform();

/** A copy of `path` with every point mapped through `f`. */
export function mapPath(path: PathCmd[], f: (pt: Point) => Point): PathCmd[] {
  return path.map((cmd) => {
    const out: PathCmd = [cmd[0], f(cmd[1])];
    if (cmd[2]) out[2] = f(cmd[2]);
    if (cmd[3]) out[3] = f(cmd[3]);
    return out;
  });
}

/**
 * A path that can be built once and then filled, stroked, clipped to or hit-tested by any
 * context, as many times as needed. Its points are in user space: the context's current
 * transform is applied when the path is used, not when it is built.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#path2d-objects
 */
export class Path2D extends PathBuilder {
  /**
   * @param path another Path2D to copy, or SVG path data such as `"M 10 10 L 50 50 Z"`.
   *   Anything else is converted to a string, as WebIDL does.
   */
  constructor(path?: Path2D | string) {
    super();
    if (path instanceof Path2D) {
      this.path = path.path.slice();
      this.pathstart = path.pathstart;
    } else if (path !== undefined) {
      parseSvgPath(String(path), this);
    }
  }

  protected pathTransform(): Transform {
    return IDENTITY;
  }

  /**
   * Appends the subpaths of `path`, optionally transformed by a DOMMatrix2DInit.
   *
   * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-path2d-addpath
   */
  addPath(path: Path2D, transform: MatrixInit = {}): void {
    requireArgs(arguments.length, 1, "addPath");
    if (!(path instanceof Path2D)) throw new TypeError("addPath: argument 1 is not a Path2D");
    const m = matrixFromInit(transform ?? {}, "addPath");
    if (!m.every(Number.isFinite)) return;
    const t = new Transform();
    t.setMatrix(m);
    const added = mapPath(path.path, (pt) => t.transformPoint(pt));
    if (added.length === 0) return;
    this.path = this.path.concat(added);
    // the added path's last subpath is now the current one
    for (let i = added.length - 1; i >= 0; i--) {
      if (added[i][0] === PATH_COMMAND.MOVE) {
        this.pathstart = added[i][1];
        break;
      }
    }
  }
}

/** Arguments taken by each SVG path command, by its upper-case letter. */
const ARG_COUNTS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/**
 * Adds SVG path data to `target`. As SVG requires, parsing stops at the first error, keeping
 * everything before it.
 *
 * @see https://www.w3.org/TR/SVG2/paths.html#PathDataBNF
 */
function parseSvgPath(d: string, target: PathBuilder): void {
  let i = 0;
  const skipSpace = () => {
    while (i < d.length && /[\s]/.test(d[i])) i++;
  };
  const skipSeparator = () => {
    skipSpace();
    if (d[i] === ",") {
      i++;
      skipSpace();
    }
  };
  const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
  const readNumber = (): number | null => {
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(d);
    if (!m) return null;
    i = NUMBER.lastIndex;
    return Number(m[0]);
  };
  // arc flags are single digits and may run straight into the next number
  const readFlag = (): number | null => {
    if (d[i] !== "0" && d[i] !== "1") return null;
    return Number(d[i++]);
  };

  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // the reflected control point for S and T, and which kind of curve came last
  let ctrlX = 0;
  let ctrlY = 0;
  let prev = "";

  skipSpace();
  let cmd = "";
  while (i < d.length) {
    if (/[a-zA-Z]/.test(d[i])) {
      cmd = d[i++];
      if (!(cmd.toUpperCase() in ARG_COUNTS)) return;
    } else if (!cmd || cmd === "Z" || cmd === "z") {
      return; // numbers without a command
    }
    if (!prev && cmd !== "M" && cmd !== "m") return; // must start with a moveto
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    const args: number[] = [];
    skipSpace();
    for (let n = 0; n < ARG_COUNTS[upper]; n++) {
      if (n > 0) skipSeparator();
      const v = upper === "A" && (n === 3 || n === 4) ? readFlag() : readNumber();
      if (v === null) return;
      args.push(v);
    }
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let curve = "";
    switch (upper) {
      case "M":
        x = startX = ox + args[0];
        y = startY = oy + args[1];
        target.moveTo(x, y);
        // further coordinate pairs after a moveto are implicit linetos
        cmd = rel ? "l" : "L";
        break;
      case "L":
        target.lineTo((x = ox + args[0]), (y = oy + args[1]));
        break;
      case "H":
        target.lineTo((x = ox + args[0]), y);
        break;
      case "V":
        target.lineTo(x, (y = oy + args[0]));
        break;
      case "C":
      case "S": {
        let [c1x, c1y] = [2 * x - ctrlX, 2 * y - ctrlY];
        if (prev !== "C") [c1x, c1y] = [x, y];
        const a = upper === "C" ? args : [c1x - ox, c1y - oy, ...args];
        ctrlX = ox + a[2];
        ctrlY = oy + a[3];
        target.bezierCurveTo(ox + a[0], oy + a[1], ctrlX, ctrlY, (x = ox + a[4]), (y = oy + a[5]));
        curve = "C";
        break;
      }
      case "Q":
      case "T": {
        let [cx, cy] = [2 * x - ctrlX, 2 * y - ctrlY];
        if (prev !== "Q") [cx, cy] = [x, y];
        const a = upper === "Q" ? args : [cx - ox, cy - oy, ...args];
        ctrlX = ox + a[0];
        ctrlY = oy + a[1];
        target.quadraticCurveTo(ctrlX, ctrlY, (x = ox + a[2]), (y = oy + a[3]));
        curve = "Q";
        break;
      }
      case "A": {
        const x2 = ox + args[5];
        const y2 = oy + args[6];
        svgArc(target, x, y, args[0], args[1], args[2], !!args[3], !!args[4], x2, y2);
        x = x2;
        y = y2;
        break;
      }
      case "Z":
        target.closePath();
        x = startX;
        y = startY;
        break;
    }
    prev = curve || upper;
    skipSeparator();
  }
}

/**
 * An SVG elliptical arc from (x1, y1) to (x2, y2), converted to the centre form `ellipse` takes.
 *
 * @see https://www.w3.org/TR/SVG2/implnote.html#ArcConversionEndpointToCenter
 */
function svgArc(
  target: PathBuilder,
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angleDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): void {
  if (x1 === x2 && y1 === y2) return; // no arc at all
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx === 0 || ry === 0) return target.lineTo(x2, y2);
  const phi = ((angleDeg % 360) * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  // the midpoint between the ends, in the ellipse's own (unrotated) frame
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const px = cos * dx + sin * dy;
  const py = -sin * dx + cos * dy;
  // radii too small to reach both ends are scaled up until they just do
  const lambda = (px * px) / (rx * rx) + (py * py) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
  const den = rx * rx * py * py + ry * ry * px * px;
  let k = Math.sqrt(Math.max(0, num / den));
  if (largeArc === sweep) k = -k;
  const cpx = (k * rx * py) / ry;
  const cpy = (-k * ry * px) / rx;
  const cx = cos * cpx - sin * cpy + (x1 + x2) / 2;
  const cy = sin * cpx + cos * cpy + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta1 = angle(1, 0, (px - cpx) / rx, (py - cpy) / ry);
  let delta = angle((px - cpx) / rx, (py - cpy) / ry, (-px - cpx) / rx, (-py - cpy) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  target.ellipse(cx, cy, rx, ry, phi, theta1, theta1 + delta, !sweep);
}

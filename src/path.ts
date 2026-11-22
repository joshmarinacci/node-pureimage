import { Point, PointIsh } from "./point.js";
import { PATH_COMMAND, PathCmd } from "./types.js";
import type { Transform } from "./transform.js";

// converts every argument first (as WebIDL does) so valueOf side effects happen for all of them
export const allFinite = (...values: unknown[]) => values.map(Number).every(Number.isFinite);

/**
 * The swept angle of an arc from `start` to `end`: a full turn if the angles are at least a
 * full turn apart in the drawing direction, otherwise the shorter-than-a-turn sweep that way.
 */
export function arcSweep(start: number, end: number, anticlockwise: boolean): number {
  const TAU = Math.PI * 2;
  // angles an exact number of turns apart (other than zero) also make a full circle
  if (anticlockwise) {
    if (start - end >= TAU) return -TAU;
    return start < end ? -(TAU - ((end - start) % TAU)) : end - start;
  }
  if (end - start >= TAU) return TAU;
  return start > end ? TAU - ((start - end) % TAU) : end - start;
}

type CornerRadius = { x: number; y: number };
type RoundRectRadius = number | { x?: number; y?: number };

const isIterable = (v: unknown): v is Iterable<unknown> =>
  typeof v === "object" && v !== null && typeof (v as Iterable<unknown>)[Symbol.iterator] === "function";

/** WebIDL ToNumber, which (unlike Number()) rejects BigInts. */
function toNumber(v: unknown): number {
  if (typeof v === "bigint") throw new TypeError("can't convert a BigInt to a number");
  return Number(v);
}

/** Convert a roundRect radius: a number, or a DOMPointInit whose missing x and y are 0. */
function toCornerRadius(r: unknown): CornerRadius {
  if (r === null || r === undefined || typeof r === "object" || typeof r === "function") {
    const p = (r ?? {}) as { x?: unknown; y?: unknown };
    return { x: toNumber(p.x ?? 0), y: toNumber(p.y ?? 0) };
  }
  const n = toNumber(r);
  return { x: n, y: n };
}

/** Points closer than a millionth of a pixel, e.g. equal up to floating-point error from trig. */
export const samePoint = (a: PointIsh, b: PointIsh) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

export function requireArgs(actual: number, minimum: number, method: string): void {
  if (actual < minimum) throw new TypeError(`${method} requires at least ${minimum} argument(s)`);
}

/**
 * The path-building methods shared by {@link Context} and {@link Path2D}.
 *
 * Points are stored after mapping through {@link pathTransform}: the context's current
 * transform for a context (so its path is in canvas coordinates), the identity for a Path2D
 * (whose user-space path is transformed when it is drawn).
 */
export abstract class PathBuilder {
  path: PathCmd[] = [];
  protected pathstart?: Point;

  /** The transform applied to points as they are added. */
  protected abstract pathTransform(): Transform;

  /**
   * Moves the starting point of a new sub-path to the (x, y) coordinates.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/moveTo
   *
   * @param {number} x The x axis of the point.
   * @param {number} y The y axis of the point.
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   * */
  moveTo(x: number, y: number) {
    requireArgs(arguments.length, 2, "moveTo");
    if (!allFinite(x, y)) return;
    return this._moveTo(new Point(x, y));
  }

  /**
   * Moves the starting point of a new sub-path to the (x, y) coordinates.
   *
   * @param {Point} pt A `point` object representing a set of co-ordinates to move the "pen" to.
   *
   * @example
   * //All of the following are valid:
   * this._moveTo({x: 20, y: 40})
   * this._moveTo(new Point(20, 40))
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   * */
  _moveTo(pt) {
    pt = this.pathTransform().transformPoint(pt);
    /**
     * Set the starting co-ordinates for the path starting point
     * @type {Point}
     */
    this.pathstart = pt;
    this.path.push([PATH_COMMAND.MOVE, pt]);
  }

  /**
   * Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo
   *
   * @param {number} x The x axis of the coordinate for the end of the line.
   * @param {number} y The y axis of the coordinate for the end of the line.
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   */
  lineTo(x: number, y: number) {
    requireArgs(arguments.length, 2, "lineTo");
    if (!allFinite(x, y)) return;
    // with no subpath yet, lineTo starts one at the given point
    if (!this.currentPoint()) return this._moveTo(new Point(x, y));
    return this._lineTo(new Point(x, y));
  }

  /**
   * Connects the last point in the sub-path to the x, y coordinates with a straight line (but does not actually draw it).
   *
   * @param {Point} pt A point object to draw a line to from the current set of co-ordinates
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   */
  _lineTo(pt) {
    this.path.push([PATH_COMMAND.LINE, this.pathTransform().transformPoint(pt)]);
  }

  /** The last point of the current path in device space, or null if the path is empty. */
  protected currentPoint(): Point | null {
    const cmd = this.path[this.path.length - 1];
    if (!cmd) return null;
    return cmd[3] ?? (cmd[0] === PATH_COMMAND.QUADRATIC_CURVE ? cmd[2] : cmd[1]);
  }

  /** Start a subpath at (x, y), in user space, if the path is empty. */
  protected ensureSubpath(x: number, y: number): void {
    if (!this.currentPoint()) this._moveTo(new Point(x, y));
  }

  /**
   * Adds a quadratic Bézier curve to the path. It requires two points. The first point is a control point and the second one is the end point. The starting point is the last point in the current path, which can be changed using moveTo() before creating the quadratic Bézier curve.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/quadraticCurveTo
   *
   * @param {number} cp1x The x axis of the coordinate for the control point.
   * @param {number} cp1y The y axis of the coordinate for the control point.
   * @param {number} x    The x axis of the coordinate for the end point.
   * @param {number} y    The y axis of the coordinate for the end point.
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   */
  quadraticCurveTo(cp1x: number, cp1y: number, x: number, y: number) {
    requireArgs(arguments.length, 4, "quadraticCurveTo");
    if (!allFinite(cp1x, cp1y, x, y)) return;
    this.ensureSubpath(cp1x, cp1y);
    // stored as the equivalent cubic so filling and stroking share one curve flattener
    const p0 = this.currentPoint();
    const q = this.pathTransform().transformPoint(new Point(cp1x, cp1y));
    const p1 = this.pathTransform().transformPoint(new Point(x, y));
    const c1 = new Point(p0.x + (2 / 3) * (q.x - p0.x), p0.y + (2 / 3) * (q.y - p0.y));
    const c2 = new Point(p1.x + (2 / 3) * (q.x - p1.x), p1.y + (2 / 3) * (q.y - p1.y));
    this.path.push([PATH_COMMAND.BEZIER_CURVE, c1, c2, p1]);
  }

  /**
   * Adds a cubic Bézier curve to the path. It requires three points. The first two points are control points and the third one is the end point. The starting point is the last point in the current path, which can be changed using moveTo() before creating the Bézier curve.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/bezierCurveTo
   *
   * @param {number} cp1x The x axis of the coordinate for the first control point.
   * @param {number} cp1y The y axis of the coordinate for first control point.
   * @param {number} cp2x The x axis of the coordinate for the second control point.
   * @param {number} cp2y The y axis of the coordinate for the second control point.
   * @param {number} x    The x axis of the coordinate for the end point.
   * @param {number} y    The y axis of the coordinate for the end point.
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   */
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
    requireArgs(arguments.length, 6, "bezierCurveTo");
    if (!allFinite(cp1x, cp1y, cp2x, cp2y, x, y)) return;
    this.ensureSubpath(cp1x, cp1y);
    this._bezierCurveTo(
      new Point(cp1x, cp1y),
      new Point(cp2x, cp2y),
      new Point(x, y),
    );
  }

  /**
   * Bezier Curve To
   *
   * @param {number} cp1 Curve point 1
   * @param {number} cp2 Curve point 2
   * @param {Point}  pt
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   * */
  _bezierCurveTo(cp1, cp2, pt) {
    cp1 = this.pathTransform().transformPoint(cp1);
    cp2 = this.pathTransform().transformPoint(cp2);
    pt = this.pathTransform().transformPoint(pt);
    this.path.push([PATH_COMMAND.BEZIER_CURVE, cp1, cp2, pt]);
  }

  /**
   * Adds an arc to the path which is centered at (x, y) position with radius r starting at startAngle and ending at endAngle going in the given direction by anticlockwise (defaulting to clockwise).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
   *
   * @param {number}  x         The x coordinate of the arc's center
   * @param {number}  y         The y coordinate of the arc's center
   * @param {number}  rad       The arc's radius
   * @param {number}  start     The angle at which the arc starts, measured clockwise from the positive x axis and expressed in radians
   * @param {number}  end       The angle at which the arc ends, measured clockwise from the positive x axis and expressed in radians
   * @param {boolean} anticlockwise A boolean which, if true, causes the arc to be drawn anticlockwise between the two angles.
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   */
  arc(
    x: number,
    y: number,
    rad: number,
    start: number,
    end: number,
    anticlockwise = false,
  ) {
    requireArgs(arguments.length, 5, "arc");
    if (!allFinite(x, y, rad, start, end)) return;
    if (rad < 0) throw new DOMException(`arc: negative radius ${rad}`, "IndexSizeError");
    this.ellipse(x, y, rad, rad, 0, start, end, anticlockwise);
  }

  /**
   * Adds a straight line to the path, ending in an arc of the given radius that touches both the
   * line from the current point to (x1, y1) and the line from (x1, y1) to (x2, y2).
   *
   * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-arcto
   */
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {
    requireArgs(arguments.length, 5, "arcTo");
    if (!allFinite(x1, y1, x2, y2, radius)) return;
    if (radius < 0) throw new DOMException(`arcTo: negative radius ${radius}`, "IndexSizeError");
    this.ensureSubpath(x1, y1);
    // the geometry is computed in user space, so bring the current point back out of device space
    const inverse = this.pathTransform().cloneTransform();
    inverse.invert();
    const p0 = inverse.transformPoint(this.currentPoint());
    const u1x = p0.x - x1;
    const u1y = p0.y - y1;
    const u2x = x2 - x1;
    const u2y = y2 - y1;
    const len1 = Math.hypot(u1x, u1y);
    const len2 = Math.hypot(u2x, u2y);
    // sine of the angle between the two tangent lines; zero when the points are collinear
    const cross = len1 && len2 ? (u1x * u2y - u1y * u2x) / (len1 * len2) : 0;
    if (radius === 0 || Math.abs(cross) < 1e-12) {
      this._lineTo(new Point(x1, y1));
      return;
    }
    const cos = (u1x * u2x + u1y * u2y) / (len1 * len2);
    const half = Math.acos(Math.max(-1, Math.min(1, cos))) / 2;
    const tangent = radius / Math.tan(half); // distance from (x1, y1) to each tangent point
    const t1x = x1 + (u1x / len1) * tangent;
    const t1y = y1 + (u1y / len1) * tangent;
    const t2x = x1 + (u2x / len2) * tangent;
    const t2y = y1 + (u2y / len2) * tangent;
    // the centre lies along the bisector, at the radius from both tangent points
    const bx = u1x / len1 + u2x / len2;
    const by = u1y / len1 + u2y / len2;
    const blen = Math.hypot(bx, by);
    const dist = radius / Math.sin(half);
    const cx = x1 + (bx / blen) * dist;
    const cy = y1 + (by / blen) * dist;
    this.ellipse(
      cx,
      cy,
      radius,
      radius,
      0,
      Math.atan2(t1y - cy, t1x - cx),
      Math.atan2(t2y - cy, t2x - cx),
      cross > 0,
    );
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rect
   * Draws a rectangle with the upper left corner at the specified (x, y)
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   *
   *
   * @param {number}  x         The x coordinate of the rectangle
   * @param {number}  y         The y coordinate of the rectangle
   * @param {number}  width     The width of the rectangle
   * @param {number}  height    The height of the rectangle
   *
   *
   * @memberof PathBuilder
   */
  rect(x: number, y: number, width: number, height: number): void {
    requireArgs(arguments.length, 4, "rect");
    if (!allFinite(x, y, width, height)) return;
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
    // the rectangle is a closed subpath of its own; a new one starts back at (x, y)
    this.moveTo(x, y);
  }

  /**
   * Adds a rectangle with rounded corners as a closed subpath. Each radius is a number or a
   * DOMPointInit `{x, y}` for an elliptical corner; 1 to 4 radii are given CSS-style.
   *
   * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-roundrect
   */
  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: RoundRectRadius | RoundRectRadius[] = 0,
  ) {
    requireArgs(arguments.length, 4, "roundRect");
    // convert every argument (which can throw) before acting on any of them, as WebIDL does
    const list = (isIterable(radii) ? Array.from(radii) : [radii]).map(toCornerRadius);
    if (!allFinite(x, y, width, height)) return;
    if (list.length < 1 || list.length > 4) {
      throw new RangeError(`roundRect: expected 1 to 4 radii, got ${list.length}`);
    }
    for (const r of list) {
      if (!allFinite(r.x, r.y)) return;
      if (r.x < 0 || r.y < 0) throw new RangeError(`roundRect: negative radius ${r.x}, ${r.y}`);
    }
    let [ul, ur, lr, ll] =
      list.length === 4
        ? list
        : list.length === 3
          ? [list[0], list[1], list[2], list[1]]
          : list.length === 2
            ? [list[0], list[1], list[0], list[1]]
            : [list[0], list[0], list[0], list[0]];

    // corners are named as if the size were positive: "upper left" is always the corner at
    // (x, y). A negative size mirrors the shape about (x, y), so it also winds the other way.
    const sx = Math.sign(width) || 1;
    const sy = Math.sign(height) || 1;
    const w = Math.abs(width);
    const h = Math.abs(height);

    // radii that would overlap along a side are scaled down together until they fit
    const scale = Math.min(
      1,
      w / (ul.x + ur.x),
      h / (ur.y + lr.y),
      w / (lr.x + ll.x),
      h / (ul.y + ll.y),
    );
    if (scale < 1) [ul, ur, lr, ll] = [ul, ur, lr, ll].map((r) => ({ x: r.x * scale, y: r.y * scale }));

    // round the corner at (px, py), arriving along one side and leaving along the next; the
    // signs (dx, dy) point from the corner towards the rectangle's inside
    const corner = (r: CornerRadius, px: number, py: number, dx: number, dy: number, start: number) => {
      if (!(r.x > 0 && r.y > 0)) return this.lineTo(px, py); // a square corner
      // mirroring the rectangle mirrors the arc's angles and, if mirrored once, its direction
      const mirror = (a: number) => Math.atan2(sy * Math.sin(a), sx * Math.cos(a));
      const end = start + Math.PI / 2;
      this.ellipse(px + dx * r.x, py + dy * r.y, r.x, r.y, 0, mirror(start), mirror(end), sx * sy < 0);
    };
    this.moveTo(x + sx * ul.x, y);
    this.lineTo(x + width - sx * ur.x, y);
    corner(ur, x + width, y, -sx, sy, -Math.PI / 2);
    this.lineTo(x + width, y + height - sy * lr.y);
    corner(lr, x + width, y + height, -sx, -sy, 0);
    this.lineTo(x + sx * ll.x, y + height);
    corner(ll, x, y + height, sx, -sy, Math.PI / 2);
    this.lineTo(x, y + sy * ul.y);
    corner(ul, x, y, sx, sy, Math.PI);
    this.closePath();
    // like rect(), the shape is a closed subpath of its own; a new one starts back at (x, y)
    this.moveTo(x, y);
  }

  /**
   * Adds an elliptical arc to the path, joined to any existing subpath by a straight line.
   *
   * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-ellipse
   */
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    start: number,
    end: number,
    anticlockwise = false,
  ) {
    requireArgs(arguments.length, 7, "ellipse");
    if (!allFinite(x, y, radiusX, radiusY, rotation, start, end)) return;
    if (radiusX < 0 || radiusY < 0) {
      throw new DOMException(`ellipse: negative radius ${radiusX}, ${radiusY}`, "IndexSizeError");
    }
    const sweep = arcSweep(start, end, anticlockwise);
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const pointAt = (angle: number) => {
      const ex = radiusX * Math.cos(angle);
      const ey = radiusY * Math.sin(angle);
      return new Point(x + ex * cosR - ey * sinR, y + ex * sinR + ey * cosR);
    };

    // derivative of pointAt, for the Bézier control points
    const tangentAt = (angle: number) => {
      const ex = -radiusX * Math.sin(angle);
      const ey = radiusY * Math.cos(angle);
      return new Point(ex * cosR - ey * sinR, ex * sinR + ey * cosR);
    };

    // join the arc to the existing subpath with a line, or start a new subpath
    const first = pointAt(start);
    const curr = this.currentPoint();
    if (!curr) this._moveTo(first);
    else if (!samePoint(curr, this.pathTransform().transformPoint(first))) this._lineTo(first);

    // one cubic Bézier per quarter turn (or less): its error is under 0.03% of the radius
    const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
    const delta = sweep / pieces;
    const k = (4 / 3) * Math.tan(delta / 4);
    for (let i = 0; i < pieces; i++) {
      const a0 = start + delta * i;
      const a1 = a0 + delta;
      const p0 = pointAt(a0);
      const p3 = pointAt(a1);
      const t0 = tangentAt(a0);
      const t1 = tangentAt(a1);
      const c1 = this.pathTransform().transformPoint(new Point(p0.x + k * t0.x, p0.y + k * t0.y));
      const c2 = this.pathTransform().transformPoint(new Point(p3.x - k * t1.x, p3.y - k * t1.y));
      const end = this.pathTransform().transformPoint(p3);
      // a zero radius or sweep collapses the curve onto one point; leave it out
      const from = this.currentPoint();
      if (samePoint(from, c1) && samePoint(from, c2) && samePoint(from, end)) continue;
      this.path.push([PATH_COMMAND.BEZIER_CURVE, c1, c2, end]);
    }
  }

  /**
   * Causes the point of the pen to move back to the start of the current sub-path. It tries to add a straight line (but does not actually draw it) from the current point to the start. If the shape has already been closed or has only one point, this function does nothing.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/closePath
   *
   * @returns {void}
   *
   * @memberof PathBuilder
   */
  closePath() {
    const curr = this.currentPoint();
    if (!curr || !this.pathstart) return; // nothing to close
    // marks the subpath closed (so strokes join at its start) and returns to its first point
    this.path.push([PATH_COMMAND.CLOSE, this.pathstart]);
  }
}

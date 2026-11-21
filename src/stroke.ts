/**
 * Stroke outlines.
 *
 * A stroke is built as a set of simple polygons: one quad per segment, plus join and cap
 * shapes. Every polygon is wound the same way, so filling them all together with the nonzero
 * rule paints their union, without seams or double coverage where they overlap.
 *
 * @see https://html.spec.whatwg.org/multipage/canvas.html#trace-a-path
 */
export type LineCap = "butt" | "round" | "square";
export type LineJoin = "bevel" | "round" | "miter";

export interface StrokeStyle {
  width: number;
  cap: LineCap;
  join: LineJoin;
  miterLimit: number;
  /** the largest allowed distance between a curve and its polygon approximation */
  tolerance: number;
}

export type Pt = { x: number; y: number };

/**
 * A subpath with at least one segment, as consecutive distinct points. A single point is a
 * subpath whose segments all have zero length.
 */
export interface Subpath {
  points: Pt[];
  /**
   * Per point, the curve's direction there if the point is inside a curve (where the outline
   * bends smoothly instead of joining), or null at a corner.
   */
  tangents?: (Pt | null)[];
  closed: boolean;
}

type Polygon = Pt[];

const EPSILON = 1e-9;

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Pt, s: number): Pt => ({ x: a.x * s, y: a.y * s });
const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;

function unit(v: Pt): Pt {
  const len = Math.hypot(v.x, v.y);
  return { x: v.x / len, y: v.y / len };
}

/** The left-hand normal of a unit direction (in y-down coordinates, a quarter turn clockwise). */
const normal = (d: Pt): Pt => ({ x: -d.y, y: d.x });

function signedArea(poly: Polygon): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) area += cross(poly[i], poly[(i + 1) % poly.length]);
  return area / 2;
}

/** Points along an arc of radius r around c, from angle a0 sweeping by `sweep`. */
function arcPoints(c: Pt, r: number, a0: number, sweep: number, tolerance: number): Pt[] {
  const step = r > tolerance ? 2 * Math.acos(1 - tolerance / r) : Math.PI / 2;
  const n = Math.max(2, Math.ceil(Math.abs(sweep) / Math.min(step, Math.PI / 8)));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (sweep * i) / n;
    pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
  }
  return pts;
}

/**
 * The outline polygons for stroking `subpaths`, all with positive signed area.
 * Each subpath's points must already be free of consecutive duplicates.
 */
export function strokePolygons(subpaths: Subpath[], style: StrokeStyle): Polygon[] {
  const hw = style.width / 2;
  const out: Polygon[] = [];
  const emit = (poly: Polygon) => {
    const area = signedArea(poly);
    if (Math.abs(area) < EPSILON) return;
    out.push(area > 0 ? poly : poly.slice().reverse());
  };
  const circle = (c: Pt) => emit(arcPoints(c, hw, 0, Math.PI * 2, style.tolerance).slice(0, -1));

  function join(b: Pt, d1: Pt, d2: Pt) {
    const turn = cross(d1, d2);
    const cos = dot(d1, d2);
    if (Math.abs(turn) < EPSILON && cos > 0) return; // straight on: nothing to fill
    // the gap to fill is on the outside of the turn
    const side = turn > 0 ? -1 : 1;
    const o1 = add(b, scale(normal(d1), side * hw));
    const o2 = add(b, scale(normal(d2), side * hw));
    if (style.join === "round") {
      const a1 = Math.atan2(o1.y - b.y, o1.x - b.x);
      let sweep = Math.atan2(o2.y - b.y, o2.x - b.x) - a1;
      if (sweep > Math.PI) sweep -= 2 * Math.PI;
      if (sweep < -Math.PI) sweep += 2 * Math.PI;
      // doubling back: the half circle goes round the end, the way the line was heading
      if (Math.abs(turn) < EPSILON) sweep = -side * Math.PI;
      emit([b, ...arcPoints(b, hw, a1, sweep, style.tolerance)]);
      return;
    }
    if (style.join === "miter" && 1 + cos > EPSILON) {
      // miter length / line width = 1 / sin(θ / 2), θ being the angle between the segments
      const ratio = Math.sqrt(2 / (1 + cos));
      if (ratio <= style.miterLimit) {
        const tip = add(b, scale(add(normal(d1), normal(d2)), (side * hw) / (1 + cos)));
        emit([b, o1, tip, o2]);
        return;
      }
    }
    emit([b, o1, o2]);
  }

  function cap(p: Pt, d: Pt) {
    // d points away from the line, out of its end
    if (style.cap === "round") return circle(p);
    if (style.cap === "square") {
      const n = scale(normal(d), hw);
      const e = scale(d, hw);
      emit([sub(p, n), add(sub(p, n), e), add(add(p, n), e), add(p, n)]);
    }
  }

  for (const { points, tangents: tangentsIn, closed } of subpaths) {
    const pts = points.slice();
    const tangents = (tangentsIn ?? []).slice(0, pts.length);
    if (closed && pts.length > 1 && same(pts[0], pts[pts.length - 1])) pts.pop();
    // zero-length subpaths are pruned: they draw nothing, not even caps
    if (pts.length === 1) continue;
    const count = closed ? pts.length : pts.length - 1;
    const dirs: Pt[] = [];
    for (let i = 0; i < count; i++) dirs.push(unit(sub(pts[(i + 1) % pts.length], pts[i])));
    const isSmooth = (i: number) => !!tangents[i] && (closed || (i > 0 && i < pts.length - 1));

    // the offset from a point to the outline's left edge. Inside a curve it follows the
    // curve's own normal, and both neighbouring segments share it, so the outline bends
    // without gaps or join shapes
    const offset = (i: number, seg: number): Pt =>
      scale(normal(isSmooth(i) ? unit(tangents[i]) : dirs[seg]), hw);

    for (let i = 0; i < count; i++) {
      const a = pts[i];
      const j = (i + 1) % pts.length;
      const b = pts[j];
      const oa = offset(i, i);
      const ob = offset(j, i);
      const a1 = add(a, oa);
      const a2 = sub(a, oa);
      const b1 = add(b, ob);
      const b2 = sub(b, ob);
      // where a curve is tighter than half the line width, the two ends' offsets cross over;
      // split the twisted quad at the crossing so both halves wind the same way
      const x = intersect(a1, a2, b1, b2);
      if (x) {
        emit([a1, b1, x]);
        emit([x, b2, a2]);
      } else {
        emit([a1, b1, b2, a2]);
      }
    }
    for (let i = 1; i < count; i++) if (!isSmooth(i)) join(pts[i], dirs[i - 1], dirs[i]);
    if (closed && !isSmooth(0)) join(pts[0], dirs[count - 1], dirs[0]);
    else {
      cap(pts[0], scale(dirs[0], -1));
      cap(pts[pts.length - 1], dirs[count - 1]);
    }
  }
  return out;
}

/** Where segments p1-p2 and q1-q2 cross, strictly between their ends, or null. */
function intersect(p1: Pt, p2: Pt, q1: Pt, q2: Pt): Pt | null {
  const r = sub(p2, p1);
  const s = sub(q2, q1);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPSILON) return null;
  const qp = sub(q1, p1);
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  if (t <= EPSILON || t >= 1 - EPSILON || u <= EPSILON || u >= 1 - EPSILON) return null;
  return add(p1, scale(r, t));
}

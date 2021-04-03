/**
 * Represents a set of co-ordinates on a 2D plane
 *
 * @class Point
 */
export class Point {
    x: number;
    y: number;

    /**
     * Creates an instance of Point.
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @memberof Point
     */
    constructor(x: number, y: number);

    distance(pt: Point): number;

    subtract(pt: Point): Point;

    magnitude(): number;

    dotProduct(v: Point): number;

    divide(scalar: number): Point;

    floor(): Point;
    round(): Point;
}

export function calc_min_bounds(pts: Point[]): Bounds;

export class Bounds {
    x1: number;
    y1: number;
    x2: number;
    y2: number;

    constructor(x1: number, y1: number, x2: number, y2: number);
    contains(pt: Point): boolean;

    intersect(bds: Bounds): Bounds;
}

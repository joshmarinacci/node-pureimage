export type PointIsh = {
    x?: number,
    y?: number,
}
export type PointIshQuad = [PointIsh,PointIsh,PointIsh,PointIsh]
export type PointIshTri = [PointIsh,PointIsh,PointIsh]
/**
 * Represents a set of co-ordinates on a 2D plane
 */
export class Point {
    /**
     * Creates an instance of Point.
     */
    constructor(
        /** X position */
        public x: number,
        /** Y position */
        public y: number,
    ) {}
    clone() {
        return new Point(this.x,this.y);
    }
    distance(pt: Point) {
        return Math.sqrt(
            Math.pow(pt.x-this.x,2)+
            Math.pow(pt.y-this.y,2)
        );
    }
    add(pt: Point) {
        return new Point(this.x+pt.x, this.y+pt.y);
    }
    subtract(pt: Point) {
        return new Point(this.x-pt.x, this.y-pt.y);
    }
    magnitude() {
        return Math.sqrt(this.dotProduct(this));
    }
    dotProduct(v: Point) {
        return this.x*v.x + this.y*v.y;
    }
    divide(scalar: number) {
        return new Point(this.x/scalar, this.y/scalar);
    }
    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }
    round() {
        return new Point(Math.round(this.x), Math.round(this.y));
    }
    unit() {
        return this.divide(this.magnitude());
    }
    rotate(theta: number) {
        return new Point(
            Math.cos(theta)*this.x - Math.sin(theta)*this.y,
            Math.sin(theta)*this.x + Math.cos(theta)*this.y
        );
    }
    scale(scalar: number) {
        return new Point(
            this.x*scalar,
            this.y*scalar
        );
    }
    equals(pt: Point) {
        return this.x === pt.x && this.y === pt.y;
    }
}

export const toRad = (deg: number) => Math.PI/180*deg;
export const toDeg = (rad: number) => 180/Math.PI*rad;


export function calc_min_bounds(pts: Point[]) {
    let x1 = Number.POSITIVE_INFINITY;
    let y1 = Number.POSITIVE_INFINITY;
    let x2 = Number.NEGATIVE_INFINITY;
    let y2 = Number.NEGATIVE_INFINITY;
    pts.forEach(pt => {
        x1 = Math.min(x1,pt.x);
        y1 = Math.min(y1,pt.y);
        x2 = Math.max(x2,pt.x);
        y2 = Math.max(y2,pt.y);
    });
    return new Bounds(x1,y1,x2,y2);
}

export class Bounds {
    constructor(
        public x1: number,
        public y1: number,
        public x2: number,
        public y2: number,
    ) {}
    contains(pt: Point) {
        if(pt.x < this.x1) return false;
        if(pt.x >= this.x2) return false;
        if(pt.y < this.y1) return false;
        if(pt.y >= this.y2) return false;
        return true;
    }

    intersect(bds: Bounds) {
        const x1 = Math.max(this.x1,bds.x1);
        const y1 = Math.max(this.y1,bds.y1);
        const x2 = Math.min(this.x2,bds.x2);
        const y2 = Math.min(this.y2,bds.y2);
        return new Bounds(x1,y1,x2,y2);
    }
}

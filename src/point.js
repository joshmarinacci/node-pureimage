/**
 * Represents a set of co-ordinates on a 2D plane
 *
 * @class Point
 */
export class Point {
    /**
     * Creates an instance of Point.
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @memberof Point
     */
    constructor (x, y) {
        /**
         * @type {number}
         */
        this.x = x;

        /**
         * @type {number}
         */
        this.y = y;
    }
    clone() {
        return new Point(this.x,this.y)
    }
    distance(pt) {
        return Math.sqrt(
            Math.pow(pt.x-this.x,2)+
            Math.pow(pt.y-this.y,2)
        )
    }
    add(pt) {
        return new Point(this.x+pt.x, this.y+pt.y)
    }
    subtract(pt) {
        return new Point(this.x-pt.x, this.y-pt.y)
    }
    magnitude() {
        return Math.sqrt(this.dotProduct(this))
    }
    dotProduct(v) {
        return this.x*v.x + this.y*v.y
    }
    divide(scalar) {
        return new Point(this.x/scalar, this.y/scalar)
    }
    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y))
    }
    round() {
        return new Point(Math.round(this.x), Math.round(this.y))
    }
    unit() {
        return this.divide(this.magnitude())
    }
    rotate(theta) {
        return new Point(
            Math.cos(theta)*this.x - Math.sin(theta)*this.y,
            Math.sin(theta)*this.x + Math.cos(theta)*this.y
        )
    }
    scale(scalar) {
        return new Point(
            this.x*scalar,
            this.y*scalar
        )
    }
    equals(pt) {
        return this.x === pt.x && this.y === pt.y;
    }
}

export const toRad = (deg) => Math.PI/180*deg
export const toDeg = (rad) => 180/Math.PI*rad


export function calc_min_bounds(pts) {
    let x1 = Number.POSITIVE_INFINITY
    let y1 = Number.POSITIVE_INFINITY
    let x2 = Number.NEGATIVE_INFINITY
    let y2 = Number.NEGATIVE_INFINITY
    pts.forEach(pt => {
        x1 = Math.min(x1,pt.x)
        y1 = Math.min(y1,pt.y)
        x2 = Math.max(x2,pt.x)
        y2 = Math.max(y2,pt.y)
    })
    return new Bounds(x1,y1,x2,y2)
}

export class Bounds {
    constructor(x1,y1,x2,y2) {
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }
    contains(pt) {
        if(pt.x < this.x1) return false
        if(pt.x >= this.x2) return false
        if(pt.y < this.y1) return false
        if(pt.y >= this.y2) return false
        return true
    }

    intersect(bds) {
        let x1 = Math.max(this.x1,bds.x1)
        let y1 = Math.max(this.y1,bds.y1)
        let x2 = Math.min(this.x2,bds.x2)
        let y2 = Math.min(this.y2,bds.y2)
        return new Bounds(x1,y1,x2,y2)
    }
}

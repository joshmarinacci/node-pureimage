/**
 * Represents a set of co-ordinates on a 2D plane
 *
 * @class Points
 */
export class Points {
    /**
     * Creates an instance of Points.
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @memberof Points
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

    distance(pt) {
        return Math.sqrt(
            Math.pow(pt.x-this.x,2)+
            Math.pow(pt.y-this.y,2)
        )
    }

    subtract(pt) {
        return new Points(this.x-pt.x, this.y-pt.y)
    }

    magnitude() {
        return Math.sqrt(this.dotProduct(this))
    }

    dotProduct(v) {
        return this.x*v.x + this.y*v.y
    }

    divide(scalar) {
        return new Points(this.x/scalar, this.y/scalar)
    }
}
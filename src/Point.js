/**
 * Represents a set of co-ordinates on a 2D plane
 *
 * @class Point
 */
class Point {
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

    distance(pt) {
        return Math.sqrt(
            Math.pow(pt.x-this.x,2)+
            Math.pow(pt.y-this.y,2)
        )
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
}

module.exports = Point;

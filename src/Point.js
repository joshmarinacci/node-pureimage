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
}

module.exports = Point;

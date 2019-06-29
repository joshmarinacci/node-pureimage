/**
 * Represents a set of co-ordinates on a 2D plane
 *
 * @class Point
 */
export declare class Point implements IPoint {
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
    distance(pt: IPoint): number;
    subtract(pt: IPoint): Point;
    magnitude(): number;
    dotProduct(v: IPoint): number;
    divide(scalar: number): Point;
}
export interface IPoint {
    x: number;
    y: number;
}
export default Point;

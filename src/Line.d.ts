import Point from './Point';
declare const _default: {
    new (startX: number, startY: number, endX?: number, endY?: number): {
        start: Point;
        end: Point;
        /**
         * Get the line length
         *
         * @returns {number}
         *
         * @memberof Line
         */
        getLength(): number;
    };
};
/**
 * Create a line object represnting a set of two points in 2D space.
 *
 * Line objects can be constructed by passing in either 4 numbers (startX, startY, endX, endY) - or
 * two {@link Point} objects representing `start` and `end` respectively
 *
 * @class Line
 */
export = _default;

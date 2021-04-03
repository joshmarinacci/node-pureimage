import { Point } from './point.js';

/**
 * Create a line object represnting a set of two points in 2D space.
 *
 * Line objects can be constructed by passing in either 4 numbers (startX, startY, endX, endY) - or
 * two {@link Point} objects representing `start` and `end` respectively
 *
 * @class Line
 */
export class Line {
    start: Point;
    end: Point;
    /**
     * Construct a Line using two {@link Point} objects
     * .
     * @param {Point} start An instance of {@link Point} containing X and Y co-ordinates
     * @param {Point} end   An instance of {@link Point} containing X and Y co-ordinates
     * @memberof Line
     */
    /**
     * Construct a Line using 4 {@link number}s
     *
     * @param {number} startX Starting position on the X axis
     * @param {number} startY Starting position on the Y axis
     * @param {number} endX   Ending position on the X axis
     * @param {number} endY   Ending position on the Y acis
     * @memberof Line
     */
    constructor();

    /**
     * Get the line length
     *
     * @returns {number}
     *
     * @memberof Line
     */
    getLength(): number;
}

/** @ignore */

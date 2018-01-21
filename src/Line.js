const Point = require('./Point');

/**
 * Create a line object represnting a set of two points in 2D space.
 *
 * Line objects can be constructed by passing in either 4 numbers (startX, startY, endX, endY) - or
 * two {@link Point} objects representing `start` and `end` respectively
 *
 * @class Line
 */
class Line {
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
    constructor (){
        if (arguments.length === 4) {

            /**
             * @type {Point}
            */
            this.start = {};

            /**
             * @type {Point}
            */
            this.end   = {};

            [this.start.x, this.start.y, this.end.x, this.end.y] = arguments;
            for(let argument_index in arguments) {
                if(arguments.hasOwnProperty(argument_index)) {
                    let argument = arguments[argument_index];
                    if(typeof argument !== 'number'){
                        throw TypeError('When passing 4 arguments, only numbers may be passed');
                    }
                }
            }
        } else if(arguments.length === 2) {
            [this.start, this.end] = arguments;
        } else {
            throw Error('Please pass either two Point objects, or 4 integers to the constructor');
        }
    }

    /**
     * Get the line length
     *
     * @returns {number}
     *
     * @memberof Line
     */
    getLength() {
        return Math.sqrt(
            Math.pow(this.start.x - this.end.x, 2) + Math.pow(this.start.y - this.end.y, 2)
        );
    }
}

/** @ignore */
module.exports = Line;

import {Points} from "./points.js"

/**
 * Create a line object represnting a set of two points in 2D space.
 *
 * Lines objects can be constructed by passing in either 4 numbers (startX, startY, endX, endY) - or
 * two {@link Points} objects representing `start` and `end` respectively
 *
 * @class Lines
 */
export class Lines {
    /**
     * Construct a Lines using two {@link Points} objects
     * .
     * @param {Points} start An instance of {@link Points} containing X and Y co-ordinates
     * @param {Points} end   An instance of {@link Points} containing X and Y co-ordinates
     * @memberof Lines
     */
    /**
     * Construct a Lines using 4 {@link number}s
     *
     * @param {number} startX Starting position on the X axis
     * @param {number} startY Starting position on the Y axis
     * @param {number} endX   Ending position on the X axis
     * @param {number} endY   Ending position on the Y acis
     * @memberof Lines
     */
    constructor (){
        if (arguments.length === 4) {

            /**
             * @type {Points}
            */
            this.start = {};

            /**
             * @type {Points}
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
            throw Error('Please pass either two Points objects, or 4 integers to the constructor');
        }
    }

    /**
     * Get the line length
     *
     * @returns {number}
     *
     * @memberof Lines
     */
    getLength() {
        return Math.sqrt(
            Math.pow(this.start.x - this.end.x, 2) + Math.pow(this.start.y - this.end.y, 2)
        );
    }
}

/** @ignore */

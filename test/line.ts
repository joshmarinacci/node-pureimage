import chai, {expect} from "chai"

import {Line} from "../src/line.js"
import {Point} from "../src/point.js"

/**
 * @test {Line}
 */
describe('Line', () => {

    /**
     * @test {Line#constructor}
     */
    it('can be created from two points and uses them as start and end points', () => {
        const start = new Point(6, 8);
        const end   = new Point(12, 6);

        expect(() => new Line(start, end)).not.throw(TypeError);
    });

    /**
     * @test {Line#constructor}
    */
    it('can be created from 4 numbers and uses them as start and end points', () => {
        expect(() => new Line(6, 8, 12, 6)).not.throw();
        expect(() => new Line({}, "spaghetti", "hello world", [])).to.throw(TypeError);
    });

    /**
     * @test {Line#constructor}
    */
    it('can only be created with either 2 or 4 arguments', () => {
        const errorMsg = 'Please pass either two Point objects, or 4 integers to the constructor';

        expect(() => new Line()).to.throw(errorMsg);
        expect(() => new Line(12)).to.throw(errorMsg);
        expect(() => new Line(12, 30, 92)).to.throw(errorMsg);
        expect(() => new Line(12, 30, 92, 10, 99)).to.throw(errorMsg);
    });

    /**
     * @test {Line#constructor}
    */
    it('is the distance between two points', () => {
        const start = new Point(6, 8);
        const end   = new Point(0, 0);

        const line  = new Line(start, end);

        expect(line.getLength()).to.eq(10);
    })
});

import chai, {expect} from "chai"

import {Lines} from "../src/lines.js"
import {Points} from "../src/points.js"

/**
 * @test {Lines}
 */
describe('Line', () => {

    /**
     * @test {Lines#constructor}
     */
    it('can be created from two points and uses them as start and end points', () => {
        const start = new Points(6, 8);
        const end   = new Points(12, 6);

        expect(() => new Lines(start, end)).not.throw(TypeError);
    });

    /**
     * @test {Lines#constructor}
    */
    it('can be created from 4 numbers and uses them as start and end points', () => {
        expect(() => new Lines(6, 8, 12, 6)).not.throw();
        expect(() => new Lines({}, "spaghetti", "hello world", [])).to.throw(TypeError);
    });

    /**
     * @test {Lines#constructor}
    */
    it('can only be created with either 2 or 4 arguments', () => {
        const errorMsg = 'Please pass either two Points objects, or 4 integers to the constructor';

        expect(() => new Lines()).to.throw(errorMsg);
        expect(() => new Lines(12)).to.throw(errorMsg);
        expect(() => new Lines(12, 30, 92)).to.throw(errorMsg);
        expect(() => new Lines(12, 30, 92, 10, 99)).to.throw(errorMsg);
    });

    /**
     * @test {Lines#constructor}
    */
    it('is the distance between two points', () => {
        const start = new Points(6, 8);
        const end   = new Points(0, 0);

        const line  = new Lines(start, end);

        expect(line.getLength()).to.eq(10);
    })
});

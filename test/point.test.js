import chai, {expect} from "chai"
import {Points} from "../src/points.js"

/**
 * @test {Points}
 */
describe('Point', () => {
    /**
     * @test {Points#constructor}
     */
    it('represents a set of x and y co-ordinates in 2D space', () => {
        const point = new Points(20, 60);

        expect(point.x).to.eq(20);
        expect(point.y).to.eq(60);
    });
});

import {describe, it, expect} from "vitest";
import {Point} from "../src/point.js"

/**
 * @test {Point}
 */
describe('Point', () => {
    /**
     * @test {Point#constructor}
     */
    it('represents a set of x and y co-ordinates in 2D space', () => {
        const point = new Point(20, 60);

        expect(point.x).to.eq(20);
        expect(point.y).to.eq(60);
    });
});

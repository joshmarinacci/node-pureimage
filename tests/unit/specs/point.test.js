const Point = require('Point');

/**
 * @test {Point}
 */
describe('Point', () => {
    /**
     * @test {Point#constructor}
     */
    it('represents a set of x and y co-ordinates in 2D space', () => {
        const point = new Point(20, 60);

        expect(point.x).toBe(20);
        expect(point.y).toBe(60);
    });
});

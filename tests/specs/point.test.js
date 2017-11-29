const Point = require('Point');

describe('Point', () => {
    it('represents a set of x and y co-ordinates in 2D space', () => {
        let point = new Point(20, 60);

        expect(point.x).toBe(20);
        expect(point.y).toBe(60);
    });
});

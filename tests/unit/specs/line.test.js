const Point = require('Point');
const Line  = require('Line');

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

        expect(() => new Line(start, end)).not.toThrow(TypeError);
    });

    /**
     * @test {Line#constructor}
    */
    it('can be created from 4 numbers and uses them as start and end points', () => {
        expect(() => new Line(6, 8, 12, 6)).not.toThrow();
        expect(() => new Line({}, "spaghetti", "hello world", [])).toThrow(TypeError);
    });

    /**
     * @test {Line#constructor}
    */
    it('can only be created with either 2 or 4 arguments', () => {
        const errorMsg = 'Please pass either two Point objects, or 4 integers to the constructor';

        expect(() => new Line()).toThrow(errorMsg);
        expect(() => new Line(12)).toThrow(errorMsg);
        expect(() => new Line(12, 30, 92)).toThrow(errorMsg);
        expect(() => new Line(12, 30, 92, 10, 99)).toThrow(errorMsg);
    });

    /**
     * @test {Line#constructor}
    */
    it('is the distance between two points', () => {
        const start = new Point(6, 8);
        const end   = new Point(0, 0);

        const line  = new Line(start, end);

        expect(line.getLength()).toBe(10);
    })
});

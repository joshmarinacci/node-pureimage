const test   = require('tape');
const Line   = require('../src/Line');
const Point  = require('../src/Point');

test('lines can be constructed with numbers or points', (assert) => {
    assert.plan(2);

    const start = new Point(6, 8);
    const end   = new Point(0, 0);

    assert.doesNotThrow(() => new Line(6, 8, 0, 0), /Error/, 'Lines can be constructed with 4 integers');
    assert.doesNotThrow(() => new Line(start, end), /Error/, 'Lines can be constructed with 2 Point objects');
    
    assert.end();
});

test('the length of a line can be calculated', (assert) => {
    assert.plan(1);

    const start = new Point(6, 8);
    const end   = new Point(0, 0);
    const line  = new Line(start, end);

    assert.equal(line.getLength(), 10);

    assert.end();
});

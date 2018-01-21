var PImage = require('../src/pureimage');

var fs = require('fs');
var assert = require('assert');

function simpleTransforms() {
    var img = PImage.make(10,10);
    var ctx = img.getContext('2d');

    function drawLine() {
        ctx.beginPath();
        ctx.moveTo(5, 5);
        ctx.lineTo(10, 10);
        ctx.lineTo(5, 10);
        ctx.closePath();
    }
    drawLine();

    assert.equal(ctx.path[0][0],'m');
    assert.equal(ctx.path[0][1].x,5);

    ctx.save();
    ctx.translate(5,0);
    drawLine();
    ctx.restore();
    assert.equal(ctx.path[0][0],'m');
    assert.equal(ctx.path[0][1].x,10);

    drawLine();
    assert.equal(ctx.path[0][0],'m');
    assert.equal(ctx.path[0][1].x,5);


    ctx.save();
    ctx.rotate(Math.PI/180.0*90);
    drawLine();
    ctx.restore();
    assert.equal(ctx.path[0][0],'m');
    assert.equal(ctx.path[0][1].x,-5);
    assert.equal(ctx.path[0][1].y,5);


    ctx.save();
    ctx.scale(2,2);
    drawLine();
    ctx.restore();
    assert.equal(ctx.path[0][0],'m');
    assert.equal(ctx.path[0][1].x,10);
    assert.equal(ctx.path[0][1].y,10);

    assert.equal(ctx.path[1][0],'l');
    assert.equal(ctx.path[1][1].x,20);
    assert.equal(ctx.path[1][1].y,20);

    assert.equal(ctx.path[2][0],'l');
    assert.equal(ctx.path[2][1].x,10);
    assert.equal(ctx.path[2][1].y,20);

    assert.equal(ctx.path[3][0],'l');
    assert.equal(ctx.path[3][1].x,10);
    assert.equal(ctx.path[3][1].y,10);
}

simpleTransforms();


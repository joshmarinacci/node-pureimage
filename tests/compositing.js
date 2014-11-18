var PImage = require('../src/pureimage');

{

    // compositing tests
    // red onto white
    eq(PImage.compositePixel(0xFF0000FF, 0xFFFFFFFF), 0xFF0000FF);
    // blue onto white
    eq(PImage.compositePixel(0x00FF00FF, 0xFFFFFFFF), 0x00FF00FF);
    // red onto black
    eq(PImage.compositePixel(0xFF0000FF, 0x000000FF), 0xFF0000FF);
    // red 50% onto black
    eq(PImage.compositePixel(0xFF00007F, 0x000000FF), 0x7F0000FF);
}

function eq(a,b) {
    if(a != b) throw new Error(a.toString(16) + " is not equal to " + b.toString(16));
}
function dumpBytes(img) {
    for(var i=0; i<10; i++) {
        console.log(i,img._buffer[i].toString(16));
    }
}

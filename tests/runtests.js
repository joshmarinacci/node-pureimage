/**
 * Created by josh on 3/16/17.
 */

var test = require('tape');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var PImage = require('../src/pureimage');

var BUILD_DIR = "build";
mkdir(BUILD_DIR);

const white = '#ffffff';
const black = '#000000';

test('set pixel', (t) => {
    var img = PImage.make(50,50);
    var c = img.getContext('2d');
    c.fillStyle = black;
    c.fillRect(0,0,50,50);
    c.fillStyle = white;
    c.fillRect(0,0,25,25);

    var id1 = c.getImageData(0,0,100,100);
    t.equal(id1.width,50);
    t.equal(id1.height,50);
    t.equal(id1.data.length,50*50*4);

    t.equal(img.getPixelRGBA(0,0),0xFFFFFFFF);
    t.equal(img.getPixelRGBA(24,24),0xFFFFFFFF);
    t.equal(img.getPixelRGBA(25,25),0x000000FF);
    t.equal(img.getPixelRGBA(26,26),0x000000FF);
    t.end();

});


function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        console.log("mkdir",dir);
        fs.mkdirSync(dir);
    }
}


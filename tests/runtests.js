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

test('fill rect', (t) => {
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
test('clear rect', (t)=>{
    console.log("clear rect test");
    //clear rect
    var img = PImage.make(100,100);
    var c = img.getContext('2d');
    c.fillStyle = white;
    c.fillRect(0,0,100,100);
    c.clearRect(25,25,50,50);
    t.equal(img.getPixelRGBA(0,0),0xFFFFFFFF);
    t.equal(img.getPixelRGBA(30,30),0x00000000);
    t.end();
});
/*test('stroke rect', (t)=>{
    var img = PImage.make(50,50);
    var c = img.getContext('2d');
    c.fillStyle = black;
    c.fillRect(0,0,50,50);
    c.strokeStyle = white;
    c.strokeRect(0,0,25,25);
    t.equal(img.getPixelRGBA(0,0),0xFFFFFFFF);
    t.equal(img.getPixelRGBA(1,1),0x000000FF);
    t.end();
});*/
test('load png', (t)=>{
    PImage.decodePNGFromStream(fs.createReadStream("tests/images/bird.png")).then((img)=>{
        t.equal(img.width,200);
        t.equal(img.height,133);
        t.end();
    });
});

test('load jpg', (t)=>{
    PImage.decodeJPEGFromStream(fs.createReadStream("tests/images/bird.jpg")).then((img)=>{
        t.equal(img.width,200);
        t.equal(img.height,133);
        t.end();
    }).catch((e) => {
        t.fail();
    })
});
/*
test('save png', (t)=>{

});
test('save jpg', (t)=>{

});
*/


function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        console.log("mkdir",dir);
        fs.mkdirSync(dir);
    }
}


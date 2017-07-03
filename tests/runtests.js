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
const WHITE = 0xFFFFFFFF;
const black = '#000000';
const BLACK = 0x000000FF;
const blue  = '#0000ff';
const BLUE = 0x0000FFFF;
const green = '#00ff00';
const GREEN = 0x00FF00FF;

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

/* image loading and saving tests */

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

function makeTestImage() {
    var img = PImage.make(50,50);
    var c = img.getContext('2d');
    c.fillStyle = black;
    c.fillRect(0,0,50,50);
    c.fillStyle = white;
    c.fillRect(0,0,25,25);
    c.fillRect(25,25,25,25);
    return img;
}

test('save png', (t)=>{
    var img = makeTestImage();
    var pth = path.join(BUILD_DIR,"test.png");
    PImage.encodePNGToStream(img,fs.createWriteStream(pth)).then(()=>{
        console.log('done writing');
        PImage.decodePNGFromStream(fs.createReadStream(pth)).then((img)=>{
            t.equal(img.width,50);
            t.equal(img.height,50);
            t.equal(img.getPixelRGBA(0,0),0xFFFFFFFF);
            t.equal(img.getPixelRGBA(0,30),0x000000FF);
            t.end();
        });
    });
});

test('save jpg', (t)=>{
    var img = makeTestImage();
    var pth = path.join(BUILD_DIR,"test.jpg");
    PImage.encodeJPEGToStream(img,fs.createWriteStream(pth)).then(()=>{
        PImage.decodeJPEGFromStream(fs.createReadStream(pth)).then((img)=>{
            t.equal(img.width,50);
            t.equal(img.height,50);
            t.equal(img.getPixelRGBA(0,0),0xFFFFFFFF);
            t.equal(img.getPixelRGBA(0,30),0x000000FF);
            t.end();
        });
    });
});

test('resize jpg', (t) => {
    PImage.decodeJPEGFromStream(fs.createReadStream("tests/images/bird.jpg")).then((img)=>{
        t.equal(img.width,200);
        t.equal(img.height,133);

        var img2 = PImage.make(50,50);
        var c = img2.getContext('2d');
        c.drawImage(img,
            0, 0, 200, 133, // source dimensions
            0, 0, 50, 50   // destination dimensions
        );
        var pth = path.join(BUILD_DIR,"resized_bird.jpg");
        PImage.encodeJPEGToStream(img2,fs.createWriteStream(pth)).then(()=> {
            PImage.decodeJPEGFromStream(fs.createReadStream(pth)).then((img)=> {
                t.equal(img.width,50);
                t.equal(img.height,50);
                t.end();
            });
        });
    }).catch((e) => {
        console.log(e);
        t.fail();
    })

});


function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        console.log("mkdir",dir);
        fs.mkdirSync(dir);
    }
}


test('fill rect', (t) => {
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.fillStyle = blue;
    ctx.fillRect(10,10,50,50);
    t.equal(img.getPixelRGBA(40,40),BLUE);
    t.equal(img.getPixelRGBA(0,0),BLACK);
    t.end();
});

test('stroke rect', (t) => {
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.strokeStyle = blue;
    ctx.strokeRect(0,0,50,50);
    t.equal(img.getPixelRGBA(0,0),BLUE);
    t.equal(img.getPixelRGBA(1,1),BLACK);
    t.equal(img.getPixelRGBA(50,40),BLUE);
    t.equal(img.getPixelRGBA(50,49),BLUE);
    //t.equal(img.getPixelRGBA(50,50),BLUE);  TODO: corner is missing for some reason
    t.end();
});


test('fill triangle', (t) => {
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(100,30);
    ctx.lineTo(90,90);
    ctx.lineTo(10,10);
    ctx.fill();
    t.equal(img.getPixelRGBA(60,50),BLUE);
    t.end();
});

test('stroke triangle', (t) => {
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.strokeStyle = blue;
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(100,30);
    ctx.lineTo(90,90);
    ctx.lineTo(10,10);
    ctx.stroke();
    t.equal(img.getPixelRGBA(10,10),BLUE);
    t.equal(img.getPixelRGBA(20,15),BLACK);
    t.end();
     //var path = "build/p3.png";
     //PImage.encodePNGToStream(img, fs.createWriteStream(path)).then((e)=>{
     //    console.log("wrote out the png file to ",path);
     //    t.end();
     //});
});

return;

test('font test', (t) => {
    var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
    fnt.load(function() {
        var img = PImage.make(200,200);
        var ctx = img.getContext('2d');
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(0,0,200,200);
        ctx.fillStyle = '#00ff00';
        ctx.font = "48pt 'Source Sans Pro'";
        ctx.fillText("Hello world", 10, 60);
        PImage.encodePNGToStream(img, fs.createWriteStream('build/text.png')).then(()=>{
            console.log("wrote out the png file to build/text.png");
            t.end();
        });
    });

});
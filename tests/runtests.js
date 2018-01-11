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
const red   = '#ff0000';
const RED   = 0xFF0000FF;
const blue  = '#0000ff';
const BLUE = 0x0000FFFF;
const green = '#00ff00';
const GREEN = 0x00FF00FF;



test('rgba polygon', (t) => {
    let img = PImage.make(100,100);
    let ctx = img.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),0xffffffff);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),0x000000ff);

    ctx.fillStyle = 'rgba(255,0,0,1)';
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),0xff0000ff);

    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),0x000000ff);

    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),0x7f0000bf);



    ctx.fillStyle = 'white';
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),WHITE);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = red;
    ctx.fillRect(0,0,1,1);
    t.equal(img.getPixelRGBA(0,0),4286545855);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,100,100);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0,25,100,50);
    ctx.fillStyle = 'rgba(255,0,0,1.0)';
    ctx.fillRect(50,0,50,50);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(50,50,50,50);
    var path = 'build/rgba_fill.png';
    PImage.encodePNGToStream(img, fs.createWriteStream(path)).then(()=>{
        console.log("wrote out the png file to",path);
        t.end();
    });
});

test('clip path', (t) => {

    const img = PImage.make(100,100);
    const c = img.getContext('2d');
    c.fillStyle = 'white';
    c.fillRect(0,0,100,100);

    c.beginPath();
    c.moveTo(10,10);
    c.lineTo(100,30);
    c.lineTo(50,90);
    c.lineTo(10,10);
    c.clip();

    t.false(c.pixelInsideClip(0,0));
    t.false(c.pixelInsideClip(0,20));
    t.true(c.pixelInsideClip(40,30));

    c.fillStyle = 'black';
    c.fillRect(0,0,100,100);

    var path = 'build/clip_path.png';
    PImage.encodePNGToStream(img, fs.createWriteStream(path)).then(()=>{
        console.log("wrote out the png file to",path);
        t.end();
    });
});

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

test('fill circle (arc)', (t)=>{
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.arc(50,50,40,0,Math.PI*2,true); // Outer circle
    ctx.closePath();
    ctx.fill();
    t.equal(img.getPixelRGBA(50,20),BLUE);
    t.equal(img.getPixelRGBA(10,10),BLACK);
    t.end();
});

test('stroke circle (arc)', (t)=>{
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.strokeStyle = blue;
    ctx.beginPath();
    ctx.arc(50,50,40,0,Math.PI*2,true); // Outer circle
    ctx.closePath();
    ctx.stroke();
    t.equal(img.getPixelRGBA(50,10),BLUE);
    t.equal(img.getPixelRGBA(50,50),BLACK);
    t.end();
});

test('fill partial circle (arcTo)', (t)=>{
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(50,50,40,0,Math.PI,true); // Outer circle
    ctx.closePath();
    ctx.fill();
    //t.equal(img.getPixelRGBA(50,10),BLUE);
    //t.equal(img.getPixelRGBA(50,50),BLACK);
    //t.end();

    var path = 'build/arcto.png';
    PImage.encodePNGToStream(img, fs.createWriteStream(path)).then(()=>{
        // console.log("wrote out the png file to",path);
        t.end();
    });
});

test('fill quad curves', (t) => {
    var img = PImage.make(150,150);

    var ctx = img.getContext('2d');
    ctx.fillStyle = blue;

    // Quadratric curves example
    ctx.beginPath();
    ctx.moveTo(75,25);
    ctx.quadraticCurveTo(25,25,25,62.5);
    ctx.quadraticCurveTo(25,100,50,100);
    ctx.quadraticCurveTo(50,120,30,125);
    ctx.quadraticCurveTo(60,120,65,100);
    ctx.quadraticCurveTo(125,100,125,62.5);
    ctx.quadraticCurveTo(125,25,75,25);
    ctx.fill();

    t.equal(img.getPixelRGBA(80,25),BLACK);
    t.equal(img.getPixelRGBA(80,26),BLUE);
    t.end();
});


test('stroke quad curves', (t) => {
    var img = PImage.make(150,150);

    var ctx = img.getContext('2d');
    ctx.strokeStyle = blue;

    // Quadratric curves example
    ctx.beginPath();
    ctx.moveTo(75,25);
    ctx.quadraticCurveTo(25,25,25,62.5);
    ctx.quadraticCurveTo(25,100,50,100);
    ctx.quadraticCurveTo(50,120,30,125);
    ctx.quadraticCurveTo(60,120,65,100);
    ctx.quadraticCurveTo(125,100,125,62.5);
    ctx.quadraticCurveTo(125,25,75,25);
    ctx.stroke();

    t.equal(img.getPixelRGBA(80,25),BLUE);
    t.equal(img.getPixelRGBA(50,50),BLACK);
    t.end();
});

test('fill cubic curves', (t) => {
    var img = PImage.make(150,150);
    var ctx = img.getContext('2d');
    ctx.fillStyle = blue;
    // Cubic curves example
    ctx.beginPath();
    ctx.moveTo(75,40);
    ctx.bezierCurveTo(75,37,70,25,50,25);
    ctx.bezierCurveTo(20,25,20,62.5,20,62.5);
    ctx.bezierCurveTo(20,80,40,102,75,120);
    ctx.bezierCurveTo(110,102,130,80,130,62.5);
    ctx.bezierCurveTo(130,62.5,130,25,100,25);
    ctx.bezierCurveTo(85,25,75,37,75,40);
    ctx.fill();
    t.end();
});

test('stroke cubic curves', (t) => {
    var img = PImage.make(150,150);
    var ctx = img.getContext('2d');
    ctx.strokeStyle = blue;
    // Cubic curves example
    ctx.beginPath();
    ctx.moveTo(75,40);
    ctx.bezierCurveTo(75,37,70,25,50,25);
    ctx.bezierCurveTo(20,25,20,62.5,20,62.5);
    ctx.bezierCurveTo(20,80,40,102,75,120);
    ctx.bezierCurveTo(110,102,130,80,130,62.5);
    ctx.bezierCurveTo(130,62.5,130,25,100,25);
    ctx.bezierCurveTo(85,25,75,37,75,40);
    ctx.stroke();
    t.end();
});



test('font test', (t) => {
    var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
    fnt.load(function() {
        var img = PImage.make(200,200);
        var ctx = img.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = "48pt 'Source Sans Pro'";
        ctx.fillText("ABC", 80, 80);
        var path = 'build/text.png';
        PImage.encodePNGToStream(img, fs.createWriteStream(path)).then(()=>{
            // console.log("wrote out the png file to",path);
            t.end();
        });
    });

});

function calcCrop(img1, specs) {
    var scw = specs.width / img1.width;
    var sch = specs.height / img1.height;
    var sc = 1;
    if(sch > scw) {
        //scale height first
        sc = sch;
    } else {
        sc = scw;
    }
    //specs.width / scale
    var ow = specs.width / sc;
    var oh = specs.height / sc;
    // console.log(ow,oh);
    var ow2 = img1.width-ow;
    var oh2 = img1.height-oh;
    return {
        sx:Math.floor(ow2/2),
        sy:Math.floor(oh2/2),
        sw:ow,
        sh:oh,
        dx:0,
        dy:0,
        dw:specs.width,
        dh:specs.height
    }
}

test('image cropping', (t)=>{
    var specs = {width:100, height:133};
    PImage.decodeJPEGFromStream(fs.createReadStream('tests/images/bird.jpg')).then((src)=>{
        // console.log('source image',src.width,src.height, "to",specs);
        var calcs = calcCrop(src, specs);
        // console.log(calcs);
        var img = PImage.make(specs.width, specs.height);
        var ctx = img.getContext('2d');
        ctx.drawImage(src,
            calcs.sx, calcs.sy, calcs.sw, calcs.sh,
            calcs.dx, calcs.dy, calcs.dw, calcs.dh);
        PImage.encodePNGToStream(img, fs.createWriteStream('build/croptest.png')).then(()=>{
            // console.log('wrote to build/croptest.png');
            t.end();
        });
    });
});

test('aa polygon', (t) => {
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.strokeStyle = white;
    ctx.lineWidth = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(80,30);
    ctx.lineTo(50,90);
    ctx.lineTo(10,10);
    ctx.stroke();

    var path = 'build/aa.png';
    PImage.encodePNGToStream(img, fs.createWriteStream(path)).then(()=>{
        // console.log("wrote out the png file to",path);
        t.end();
    });
});

test('aa polygon fill', (t) => {
    var img = PImage.make(100,100);
    var ctx = img.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.imageSmoothingEnabled = true;
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(80,30);
    ctx.lineTo(50,90);
    ctx.lineTo(10,10);
    ctx.fill();

    var path = 'build/aa_fill.png';
    PImage.encodePNGToStream(img, fs.createWriteStream(path)).then(()=>{
        // console.log("wrote out the png file to",path);
        t.end();
    });
});

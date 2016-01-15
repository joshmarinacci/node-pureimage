var PImage = require('../src/pureimage');

var fs = require('fs');
var black = 0x000000ff;
var red =   0xff0000ff;
var green = 0x00ff00ff;


if(!fs.existsSync("build")) {
    fs.mkdirSync("build");
}

{
    var img1 = PImage.make(100,50);

    eq(img1.width,100);
    eq(img1.height,50);
    eq(img1._buffer.length, 100*50*4);




    var ctx = img1.getContext('2d');

    eq(ctx.getPixeli32(0,0), 0x000000ff); // black with 100% alpha
    //ctx.setPixelRGBA(0,0, 255,0,0, 0.5);  // set to red with 50% alpha
    //eq(ctx.getPixeli32(0,0), 0xFF00007F); // red with 50% alpha

    //draw a red rect
    ctx.fillStyle = "#00FFFF";
    ctx.fillRect(10,0,200,200);
    eq(ctx.getPixeli32(1,1), 0x000000FF); // still black outside the rect
    eq(ctx.getPixeli32(15,25), 0x00FFFFFF); // red inside the rect
    ctx.compositePixel(1,1, 0x00FFFFFF); //set 1,1 to the current fill style, which is red
    eq(ctx.getPixeli32(1,1), 0x00FFFFFF); // this pixel is now red
}

{
    //copy between images
    var img1 = PImage.make(100,100); // filled with black

    var img2 = PImage.make(16,16);   // filled with black
    eq(img2.width,16);
    eq(img2.height,16);
    var ctx = img2.getContext('2d');
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(0,0,16,16);         //fill img2 with green

    var ctx = img1.getContext('2d');
    ctx.drawImage(img2, 10,10);
    eq(ctx.getPixeli32(0,0), black);
    eq(ctx.getPixeli32(11,11), green);
}

{

    //encoding test
    var img1 = PImage.make(100,100);
    var ctx = img1.getContext('2d');
    //make a simple blue and black checkerboard
    ctx.fillStyle = "blue";
    ctx.fillRect(0,0,50.0,50.0);
    ctx.fillRect(50,50,50,50);
    PImage.encodePNG(img1, fs.createWriteStream('build/checkerboard.png'), function(err) {
        console.log("wrote out the png file to build/checkerboard.png");
    });
}


{
    //simple polygon fill test
    var img1 = PImage.make(100,100);
    var ctx = img1.getContext('2d');
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(100,30);
    ctx.lineTo(90,90);
    ctx.lineTo(10,10);
    ctx.fill();
    PImage.encodePNG(img1, fs.createWriteStream('build/polygon.png'), function(err) {
        console.log("wrote out the png file to build/polygon.png");
    });
}


{
    //draw lines with translation
    var img1 = PImage.make(100,100);
    var ctx = img1.getContext('2d');
    ctx.fillStyle = 'green';
    ctx.fillRect(0,0,5,5);
    ctx.translate(30,50);
    ctx.fillRect(0,0,5,5);
    PImage.encodePNG(img1, fs.createWriteStream('build/translate.png'), function(err) {
        console.log("wrote out the png file to build/translate.png");
    });

}


{

    //uint32 tests

    var uint32 = require('../src/uint32');
    var int = uint32.toUint32(0xff0000);
    var int2 = uint32.shiftLeft(int,8);
    var int3 = uint32.or(int2,0xff);
}

{
    //antialiased polygon
    var img = PImage.make(10,10);
    var ctx = img.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(2,2);
    ctx.lineTo(8,2);
    ctx.lineTo(8,8);
    ctx.closePath();
    ctx.fill();
    /*
    for(var j=0; j<img.height; j++) {
        var line = "";
        for(var i=0; i<img.width; i++) {
            var px = (ctx.getPixeli32(i,j)>>24&0xFF);
            var str = px.toString(16);
            if(str == '0') {
                str = '00';
            }
            line += str+' ';
        }
        console.log(line);
    }
    */
    PImage.encodePNG(img, fs.createWriteStream('build/aapoly.png'), function(err) {
        console.log("wrote out the png file to build/aapoly.png");
    });
    PImage.encodeJPEG(img, fs.createWriteStream('build/aapoly.jpg'), function(err) {
        console.log("wrote out the jpg file to build/aapoly.jpg");
    });

    ctx.fillStyle = "red";
}

{

    //compositing tests
    var src = 0xFF0000FF;
    var dst = 0xFFFFFFFF;
    eq(PImage.compositePixel(src,dst),0xFF0000FF);
}

function eq(a,b) {
    if(a != b) throw new Error(a.toString(16) + " is not equal to " + b.toString(16));
}
function dumpBytes(img) {
    for(var i=0; i<10; i++) {
        console.log(i,img._buffer[i].toString(16));
    }
}


function clearRectTest() {
     //clear rect
     var img = PImage.make(100,100);
     var ctx = img.getContext('2d');
     ctx.fillStyle = 'green';
     ctx.fillRect(0,0,100,100);
     ctx.clearRect(25,25,50,50);
     eq(ctx.getPixeli32(1,1), 0x00FF00ff); // opaque green
     eq(ctx.getPixeli32(30,30), 0x00000000); //transparent black
     PImage.encodePNG(img, fs.createWriteStream('build/clearrect.png'), function(err) {
        console.log("wrote out the png file to build/clearrect.png",err);
     });
}
clearRectTest();

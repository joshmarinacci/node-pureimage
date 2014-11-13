var PImage = require('../src/pureimage');

var fs = require('fs');
var black = 0x000000ff;
var red =   0xff0000ff;
var green = 0x00ff00ff;

{
    var img1 = PImage.make(100,50);

    eq(img1.width,100);
    eq(img1.height,50);
    eq(img1._buffer.length, 100*50*4);




    var ctx = img1.getContext('2d');

    eq(ctx.getPixeli32(0,0), 0x000000ff); // black with 100% alpha
    ctx.setPixelRGBA(0,0, 255,0,0, 0.5);  // set to red with 50% alpha
    eq(ctx.getPixeli32(0,0), 0xFF00007F); // red with 50% alpha

    //draw a red rect
    ctx.setFillStyleRGBA(0,255,255, 1);
    ctx.fillRect(10,0,200,200);
    eq(ctx.getPixeli32(1,1), 0x000000FF); // still black outside the rect
    eq(ctx.getPixeli32(15,25), 0x00FFFFFF); // red inside the rect
    ctx.fillPixel(1,1); //set 1,1 to the current fill style, which is red
    eq(ctx.getPixeli32(1,1), 0x00FFFFFF); // this pixel is now red
}

{
    var img1 = PImage.make(100,100); // filled with black

    var img2 = PImage.make(16,16);   // filled with black
    eq(img2.width,16);
    eq(img2.height,16);
    var ctx = img2.getContext('2d');
    ctx.setFillStyleRGBA(0,255,0,1); // set to green
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
    ctx.setFillStyleRGBA(0,0,255,1);
    ctx.fillRect(0,0,50,50);
    ctx.fillRect(50,50,50,50);
    /*
    PImage.encodePNG(img1, fs.createWriteStream('out.png'), function(err) {
        console.log("wrote out the png file to out.png");
    });
    */
}


{
    //simple polygon fill test
    var img1 = PImage.make(100,100);
    var ctx = img1.getContext('2d');
    ctx.setFillStyleRGBA(0,0,255,1);
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(100,30);
    ctx.lineTo(90,90);
    ctx.lineTo(10,10);
    ctx.fill();
    PImage.encodePNG(img1, fs.createWriteStream('out.png'), function(err) {
        console.log("wrote out the png file to out.png");
    });
}

function eq(a,b) {
    if(a != b) throw new Error(a.toString(16) + " is not equal to " + b.toString(16));
}
function dumpBytes(img) {
    for(var i=0; i<10; i++) {
        console.log(i,img._buffer[i].toString(16));
    }
}

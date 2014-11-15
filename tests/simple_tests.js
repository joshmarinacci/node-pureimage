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
    PImage.encodePNG(img1, fs.createWriteStream('polygon.png'), function(err) {
        console.log("wrote out the png file to polygon.png");
    });
}


{
    //draw lines with translation
    var img1 = PImage.make(100,100);
    var ctx = img1.getContext('2d');
    ctx.setFillStyleRGBA(0,255,0,1);
    ctx.fillRect(0,0,5,5);
    ctx.translate(30,50);
    ctx.fillRect(0,0,5,5);
    PImage.encodePNG(img1, fs.createWriteStream('translate.png'), function(err) {
        console.log("wrote out the png file to translate.png");
    });

}


{

    //uint32 tests

    var uint32 = require('../src/uint32');
    var int = uint32.toUint32(0xff0000);
    console.log('int = ', uint32.toHex(int));
    var int2 = uint32.shiftLeft(int,8);
    var int3 = uint32.or(int2,0xff);
    console.log(uint32.toHex(int3));

}

{
    //antialiased polygon
    var img = PImage.make(10,10);
    var ctx = img.getContext('2d');
    ctx.setFillStyle('#ffffff');
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
    PImage.encodePNG(img, fs.createWriteStream('aapoly.png'), function(err) {
        console.log("wrote out the png file to aapoly.png");
    });
    PImage.encodeJPEG(img, fs.createWriteStream('aapoly.jpg'), function(err) {
        console.log("wrote out the png file to aapoly.jpg");
    });

    ctx.fillStyle = "red";
    console.log("ctx fill style  = ", ctx.fillStyle, ctx._fillColor.toString(16));
}

function eq(a,b) {
    if(a != b) throw new Error(a.toString(16) + " is not equal to " + b.toString(16));
}
function dumpBytes(img) {
    for(var i=0; i<10; i++) {
        console.log(i,img._buffer[i].toString(16));
    }
}

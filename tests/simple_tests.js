var PImage = require('../src/pureimage');

var fs = require('fs');
var assert = require('assert');
var black = 0x000000ff;
var red =   0xff0000ff;
var green = 0x00ff00ff;
var transparent = 0x00000000;


if(!fs.existsSync("build")) {
    fs.mkdirSync("build");
}
/*
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
    //eq(ctx.getPixeli32(11,11), green);
}

{

    //encoding test
    var img1 = PImage.make(100,100);
    var ctx = img1.getContext('2d');
    //make a simple blue and black checkerboard
    ctx.fillStyle = "blue";
    ctx.fillRect(0,0,50.0,50.0);
    ctx.fillRect(50,50,50,50);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(0,0,50.0,50.0);
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
*/

/*
function dumpBytes(img) {
    for(var i=0; i<10; i++) {
        console.log(i,img._buffer[i].toString(16));
    }
}
*/

function index(data,x,y) {
    return (data.width * y + x)*4;
}

function simplePixelTest() {
    var image = PImage.make(100,100);
    var c = image.getContext('2d');
    c.fillStyle = '#ff0000';
    c.fillRect(0,0,100,100);
    var id1 = c.getImageData(0,0,100,100);
    assert.equal(id1.width,100);
    assert.equal(id1.height,100);
    assert.equal(id1.data.length,100*100*4);
    var n1 = index(id1,0,0);
    assert.equal(id1.data[n1+0],0xFF);
    assert.equal(id1.data[n1+1],0x00);
    assert.equal(id1.data[n1+2],0x00);
    assert.equal(id1.data[n1+3],0xFF);

    c.fillStyle = '#00ff00';
    c.fillRect(0,0,100,100);
    var id2 = c.getImageData(0,0,100,100);
    assert.equal(id2.getPixelRGBA(0,0),0x00ff00ff);
}
simplePixelTest();


function clearRectTest() {

    console.log("clear rect test");
    //clear rect
    var img = PImage.make(100,100);
    var c = img.getContext('2d');
    c.fillStyle = 'green';
    c.fillRect(0,0,100,100);
    c.clearRect(25,25,50,50);
    var id2 = c.getImageData(0,0,100,100);
    assert.equal(id2.getPixelRGBA(0,0),0x00ff00ff);
    assert.equal(id2.getPixelRGBA(25,25),0x00000000);
}
clearRectTest();


function drawRects() {
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(255,0,0)";
    ctx.fillRect (10, 10, 50, 50);

    ctx.fillStyle = "rgba(0, 0, 255, 1.0)";
    ctx.fillRect (30, 30, 50, 50);
    var id2 = ctx.getImageData(0,0,150,150);
    assert.equal(id2.getPixelRGBA(0,0),0x000000ff);
    assert.equal(id2.getPixelRGBA(10,10),0xff0000ff);
    assert.equal(id2.getPixelRGBA(30,30),0x0000ffff);
}
drawRects();

function px_eq(ctx, x,y, rgba) {
    var id2 = ctx.getImageData(0,0,50,50);
    assert.equal(id2.getPixelRGBA(x,y),rgba);
}
function fillRects() {
    var canvas = PImage.make(50,50);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(255,0,0)";
    ctx.fillRect (0,0,50,50);
    px_eq(ctx,0,0,0xFF0000ff);

    //fill with blue

    //fill with red, then 50% white

    //fill with linear gradient from black to white
    //fill with repeating texture
}
fillRects();

//test fillStyle = rgba(255,255,255,0.5)

function drawClearStrokeRect() {
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext('2d');

    ctx.fillRect(25,25,100,100);
    ctx.clearRect(45,45,60,60);
    ctx.strokeRect(50,50,50,50);
    var id2 = ctx.getImageData(0,0,150,150);
    assert.equal(id2.getPixelRGBA(25,25),black);
    assert.equal(id2.getPixelRGBA(45,45),transparent);
    assert.equal(id2.getPixelRGBA(50,50),black);
    assert.equal(id2.getPixelRGBA(51,51),transparent);
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes
}
drawClearStrokeRect();

function drawTriangle() {
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(75,50);
    ctx.lineTo(100,75);
    ctx.lineTo(100,25);
    ctx.fill();
}

function drawSmileyFace() {
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(75,75,50,0,Math.PI*2,true); // Outer circle
    ctx.moveTo(110,75);
    ctx.arc(75,75,35,0,Math.PI,false);  // Mouth (clockwise)
    ctx.moveTo(65,65);
    ctx.arc(60,65,5,0,Math.PI*2,true);  // Left eye
    ctx.moveTo(95,65);
    ctx.arc(90,65,5,0,Math.PI*2,true);  // Right eye
    ctx.stroke();
}


function drawTriangles() {
    var ctx = canvas.getContext('2d');

    // Filled triangle
    ctx.beginPath();
    ctx.moveTo(25,25);
    ctx.lineTo(105,25);
    ctx.lineTo(25,105);
    ctx.fill();

    // Stroked triangle
    ctx.beginPath();
    ctx.moveTo(125,125);
    ctx.lineTo(125,45);
    ctx.lineTo(45,125);
    ctx.closePath();
    ctx.stroke();
}

function drawArcs() {
    var ctx = canvas.getContext('2d');

    for(var i=0;i<4;i++){
        for(var j=0;j<3;j++){
            ctx.beginPath();
            var x = 25+j*50; // x coordinate
            var y = 25+i*50; // y coordinate
            var radius = 20; // Arc radius
            var startAngle = 0; // Starting point on circle
            var endAngle = Math.PI+(Math.PI*j)/2; // End point on circle
            var anticlockwise = i%2==0 ? false : true; // clockwise or anticlockwise

            ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);

            if (i>1){
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
    }
}


function drawQuadCurves() {
    var ctx = canvas.getContext('2d');

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
}


function drawCubicCurves() {
    var ctx = canvas.getContext('2d');

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
}


function drawPacman() {
    var ctx = canvas.getContext('2d');

    roundedRect(ctx,12,12,150,150,15);
    roundedRect(ctx,19,19,150,150,9);
    roundedRect(ctx,53,53,49,33,10);
    roundedRect(ctx,53,119,49,16,6);
    roundedRect(ctx,135,53,49,33,10);
    roundedRect(ctx,135,119,25,49,10);

    ctx.beginPath();
    ctx.arc(37,37,13,Math.PI/7,-Math.PI/7,false);
    ctx.lineTo(31,37);
    ctx.fill();

    for(var i=0;i<8;i++){
        ctx.fillRect(51+i*16,35,4,4);
    }

    for(i=0;i<6;i++){
        ctx.fillRect(115,51+i*16,4,4);
    }

    for(i=0;i<8;i++){
        ctx.fillRect(51+i*16,99,4,4);
    }

    ctx.beginPath();
    ctx.moveTo(83,116);
    ctx.lineTo(83,102);
    ctx.bezierCurveTo(83,94,89,88,97,88);
    ctx.bezierCurveTo(105,88,111,94,111,102);
    ctx.lineTo(111,116);
    ctx.lineTo(106.333,111.333);
    ctx.lineTo(101.666,116);
    ctx.lineTo(97,111.333);
    ctx.lineTo(92.333,116);
    ctx.lineTo(87.666,111.333);
    ctx.lineTo(83,116);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(91,96);
    ctx.bezierCurveTo(88,96,87,99,87,101);
    ctx.bezierCurveTo(87,103,88,106,91,106);
    ctx.bezierCurveTo(94,106,95,103,95,101);
    ctx.bezierCurveTo(95,99,94,96,91,96);
    ctx.moveTo(103,96);
    ctx.bezierCurveTo(100,96,99,99,99,101);
    ctx.bezierCurveTo(99,103,100,106,103,106);
    ctx.bezierCurveTo(106,106,107,103,107,101);
    ctx.bezierCurveTo(107,99,106,96,103,96);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(101,102,2,0,Math.PI*2,true);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(89,102,2,0,Math.PI*2,true);
    ctx.fill();

// A utility function to draw a rectangle with rounded corners.

    function roundedRect(ctx,x,y,width,height,radius){
        ctx.beginPath();
        ctx.moveTo(x,y+radius);
        ctx.lineTo(x,y+height-radius);
        ctx.arcTo(x,y+height,x+radius,y+height,radius);
        ctx.lineTo(x+width-radius,y+height);
        ctx.arcTo(x+width,y+height,x+width,y+height-radius,radius);
        ctx.lineTo(x+width,y+radius);
        ctx.arcTo(x+width,y,x+width-radius,y,radius);
        ctx.lineTo(x+radius,y);
        ctx.arcTo(x,y,x,y+radius,radius);
        ctx.stroke();
    }
}

function fillStyleGrid() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext('2d');
    for (var i=0;i<6;i++){
        for (var j=0;j<6;j++){
            ctx.fillStyle = 'rgb(' + Math.floor(255-42.5*i) + ',' +
                Math.floor(255-42.5*j) + ',0)';
            ctx.fillRect(j*25,i*25,25,25);
        }
    }
}

function strokeStyleGrid() {
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext('2d');
    for (var i=0;i<6;i++){
        for (var j=0;j<6;j++){
            ctx.strokeStyle = 'rgb(0,' + Math.floor(255-42.5*i) + ',' +
                Math.floor(255-42.5*j) + ')';
            ctx.beginPath();
            ctx.arc(12.5+j*25,12.5+i*25,10,0,Math.PI*2,true);
            ctx.stroke();
        }
    }
}

function drawGlobalAlphaCircles() {
    // draw background
    ctx.fillStyle = '#FD0';
    ctx.fillRect(0,0,75,75);
    ctx.fillStyle = '#6C0';
    ctx.fillRect(75,0,75,75);
    ctx.fillStyle = '#09F';
    ctx.fillRect(0,75,75,75);
    ctx.fillStyle = '#F30';
    ctx.fillRect(75,75,75,75);
    ctx.fillStyle = '#FFF';

    // set transparency value
    ctx.globalAlpha = 0.2;

    // Draw semi transparent circles
    for (i=0;i<7;i++){
        ctx.beginPath();
        ctx.arc(75,75,10+10*i,0,Math.PI*2,true);
        ctx.fill();
    }
}

function drawAlphaRectangles() {
    var ctx = document.getElementById('canvas').getContext('2d');

// Draw background
    ctx.fillStyle = 'rgb(255,221,0)';
    ctx.fillRect(0, 0, 150, 37.5);
    ctx.fillStyle = 'rgb(102,204,0)';
    ctx.fillRect(0, 37.5, 150, 37.5);
    ctx.fillStyle = 'rgb(0,153,255)';
    ctx.fillRect(0, 75, 150, 37.5);
    ctx.fillStyle = 'rgb(255,51,0)';
    ctx.fillRect(0, 112.5, 150, 37.5);

// Draw semi transparent rectangles
    for (var i = 0; i < 10; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (i + 1) / 10 + ')';
        for (var j = 0; j < 4; j++) {
            ctx.fillRect(5 + i * 14, 5 + j * 37.5, 14, 27.5);
        }
    }
}

function drawLineStyles() {
    for (var i = 0; i < 10; i++){
        ctx.lineWidth = 1+i;
        ctx.beginPath();
        ctx.moveTo(5+i*14,5);
        ctx.lineTo(5+i*14,140);
        ctx.stroke();
    }
}


function drawLineCaps() {
    var ctx = document.getElementById('canvas').getContext('2d');
    var lineCap = ['butt','round','square'];

    // Draw guides
    ctx.strokeStyle = '#09f';
    ctx.beginPath();
    ctx.moveTo(10,10);
    ctx.lineTo(140,10);
    ctx.moveTo(10,140);
    ctx.lineTo(140,140);
    ctx.stroke();

    // Draw lines
    ctx.strokeStyle = 'black';
    for (var i=0;i<lineCap.length;i++){
        ctx.lineWidth = 15;
        ctx.lineCap = lineCap[i];
        ctx.beginPath();
        ctx.moveTo(25+i*50,10);
        ctx.lineTo(25+i*50,140);
        ctx.stroke();
    }
}

function drawLineJoins() {
        var ctx = document.getElementById('canvas').getContext('2d');
        var lineJoin = ['round','bevel','miter'];
        ctx.lineWidth = 10;
        for (var i=0;i<lineJoin.length;i++){
            ctx.lineJoin = lineJoin[i];
            ctx.beginPath();
            ctx.moveTo(-5,5+i*40);
            ctx.lineTo(35,45+i*40);
            ctx.lineTo(75,5+i*40);
            ctx.lineTo(115,45+i*40);
            ctx.lineTo(155,5+i*40);
            ctx.stroke();
        }
}


function drawMiterLimit() {
    var ctx = document.getElementById('canvas').getContext('2d');

    // Clear canvas
    ctx.clearRect(0,0,150,150);

    // Draw guides
    ctx.strokeStyle = '#09f';
    ctx.lineWidth   = 2;
    ctx.strokeRect(-5,50,160,50);

    // Set line styles
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 10;

    // check input
    if (document.getElementById('miterLimit').value.match(/\d+(\.\d+)?/)) {
        ctx.miterLimit = parseFloat(document.getElementById('miterLimit').value);
    } else {
        alert('Value must be a positive number');
    }

    // Draw lines
    ctx.beginPath();
    ctx.moveTo(0,100);
    for (i=0;i<24;i++){
        var dy = i%2==0 ? 25 : -25 ;
        ctx.lineTo(Math.pow(i,1.5)*2,75+dy);
    }
    ctx.stroke();
    return false;
}

function linearGradient() {
    var ctx = document.getElementById('canvas').getContext('2d');

    // Create gradients
    var lingrad = ctx.createLinearGradient(0,0,0,150);
    lingrad.addColorStop(0, '#00ABEB');
    lingrad.addColorStop(0.5, '#fff');
    lingrad.addColorStop(0.5, '#26C000');
    lingrad.addColorStop(1, '#fff');

    var lingrad2 = ctx.createLinearGradient(0,50,0,95);
    lingrad2.addColorStop(0.5, '#000');
    lingrad2.addColorStop(1, 'rgba(0,0,0,0)');

    // assign gradients to fill and stroke styles
    ctx.fillStyle = lingrad;
    ctx.strokeStyle = lingrad2;

    // draw shapes
    ctx.fillRect(10,10,130,130);
    ctx.strokeRect(50,50,50,50);


}

function radialGradients() {
    var ctx = document.getElementById('canvas').getContext('2d');

    // Create gradients
    var radgrad = ctx.createRadialGradient(45,45,10,52,50,30);
    radgrad.addColorStop(0, '#A7D30C');
    radgrad.addColorStop(0.9, '#019F62');
    radgrad.addColorStop(1, 'rgba(1,159,98,0)');

    var radgrad2 = ctx.createRadialGradient(105,105,20,112,120,50);
    radgrad2.addColorStop(0, '#FF5F98');
    radgrad2.addColorStop(0.75, '#FF0188');
    radgrad2.addColorStop(1, 'rgba(255,1,136,0)');

    var radgrad3 = ctx.createRadialGradient(95,15,15,102,20,40);
    radgrad3.addColorStop(0, '#00C9FF');
    radgrad3.addColorStop(0.8, '#00B5E2');
    radgrad3.addColorStop(1, 'rgba(0,201,255,0)');

    var radgrad4 = ctx.createRadialGradient(0,150,50,0,140,90);
    radgrad4.addColorStop(0, '#F4F201');
    radgrad4.addColorStop(0.8, '#E4C700');
    radgrad4.addColorStop(1, 'rgba(228,199,0,0)');

    // draw shapes
    ctx.fillStyle = radgrad4;
    ctx.fillRect(0,0,150,150);
    ctx.fillStyle = radgrad3;
    ctx.fillRect(0,0,150,150);
    ctx.fillStyle = radgrad2;
    ctx.fillRect(0,0,150,150);
    ctx.fillStyle = radgrad;
    ctx.fillRect(0,0,150,150);
}

function createPattern() {
    var ctx = document.getElementById('canvas').getContext('2d');

    // create new image object to use as pattern
    var img = new Image();
    img.src = 'https://mdn.mozillademos.org/files/222/Canvas_createpattern.png';
    img.onload = function(){

        // create pattern
        var ptrn = ctx.createPattern(img,'repeat');
        ctx.fillStyle = ptrn;
        ctx.fillRect(0,0,150,150);

    }
}


function shadowText() {
    var ctx = document.getElementById('canvas').getContext('2d');

    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";

    ctx.font = "20px Times New Roman";
    ctx.fillStyle = "Black";
    ctx.fillText("Sample String", 5, 30);
}

function drawText() {
    var ctx = document.getElementById('canvas').getContext('2d');
    ctx.font = "48px serif";
    ctx.fillText("Hello world", 10, 50);
}


function scaleImage() {
    var canvas = PImage.make(150,150);
    var ctx = canvas.getContext('2d');
    PImage.decodeJPEGFromURL('https://mdn.mozillademos.org/files/5397/rhino.jpg',(img)=>{
        for (var i=0;i<4;i++){
            for (var j=0;j<3;j++){
                ctx.drawImage(img,j*50,i*38,50,38);
            }
        }
    });
}
//scaleImage();

function canvasState() {
    var ctx = document.getElementById('canvas').getContext('2d');

    ctx.fillRect(0,0,150,150);   // Draw a rectangle with default settings
    ctx.save();                  // Save the default state

    ctx.fillStyle = '#09F';      // Make changes to the settings
    ctx.fillRect(15,15,120,120); // Draw a rectangle with new settings

    ctx.save();                  // Save the current state
    ctx.fillStyle = '#FFF';      // Make changes to the settings
    ctx.globalAlpha = 0.5;
    ctx.fillRect(30,30,90,90);   // Draw a rectangle with new settings

    ctx.restore();               // Restore previous state
    ctx.fillRect(45,45,60,60);   // Draw a rectangle with restored settings

    ctx.restore();               // Restore original state
    ctx.fillRect(60,60,30,30);   // Draw a rectangle with restored settings
}

function translationTest() {
    var ctx = document.getElementById('canvas').getContext('2d');
    for (var i=0;i<3;i++) {
        for (var j=0;j<3;j++) {
            ctx.save();
            ctx.fillStyle = 'rgb('+(51*i)+','+(255-51*i)+',255)';
            ctx.translate(10+j*50,10+i*50);
            ctx.fillRect(0,0,25,25);
            ctx.restore();
        }
    }
}

function rotateTest() {
    var ctx = document.getElementById('canvas').getContext('2d');

// left rectangles, rotate from canvas origin
    ctx.save();
// blue rect
    ctx.fillStyle = "#0095DD";
    ctx.fillRect(30, 30, 100, 100);
    ctx.rotate((Math.PI / 180) * 25);
// grey rect
    ctx.fillStyle = "#4D4E53";
    ctx.fillRect(30, 30, 100, 100);
    ctx.restore();

// right rectangles, rotate from rectangle center
// draw blue rect
    ctx.fillStyle = "#0095DD";
    ctx.fillRect(150, 30, 100, 100);

    ctx.translate(200, 80); // translate to rectangle center
                            // x = x + 0.5 * width
                            // y = y + 0.5 * height
    ctx.rotate((Math.PI / 180) * 25); // rotate
    ctx.translate(-200, -80); // translate back

// draw grey rect
    ctx.fillStyle = "#4D4E53";
    ctx.fillRect(150, 30, 100, 100);
}



function scaleTest() {

    var ctx = document.getElementById('canvas').getContext('2d');

    // draw a simple rectangle, but scale it.
    ctx.save();
    ctx.scale(10, 3);
    ctx.fillRect(1,10,10,10);
    ctx.restore();

    // mirror horizontally
    ctx.scale(-1, 1);
    ctx.font = "48px serif";
    ctx.fillText("MDN", -135, 120);

}


function setTransform() {
    var ctx = document.getElementById('canvas').getContext('2d');

    var sin = Math.sin(Math.PI/6);
    var cos = Math.cos(Math.PI/6);
    ctx.translate(100, 100);
    var c = 0;
    for (var i=0; i <= 12; i++) {
        c = Math.floor(255 / 12 * i);
        ctx.fillStyle = "rgb(" + c + "," + c + "," + c + ")";
        ctx.fillRect(0, 0, 100, 10);
        ctx.transform(cos, sin, -sin, cos, 0, 0);
    }

    ctx.setTransform(-1, 0, 0, 1, 100, 100);
    ctx.fillStyle = "rgba(255, 128, 255, 0.5)";
    ctx.fillRect(0, 50, 100, 100);
}


function drawClipStar() {
    var ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillRect(0,0,150,150);
    ctx.translate(75,75);

    // Create a circular clipping path
    ctx.beginPath();
    ctx.arc(0,0,60,0,Math.PI*2,true);
    ctx.clip();

    // draw background
    var lingrad = ctx.createLinearGradient(0,-75,0,75);
    lingrad.addColorStop(0, '#232256');
    lingrad.addColorStop(1, '#143778');

    ctx.fillStyle = lingrad;
    ctx.fillRect(-75,-75,150,150);

    // draw stars
    for (var j=1;j<50;j++){
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.translate(75-Math.floor(Math.random()*150),
            75-Math.floor(Math.random()*150));
        drawStar(ctx,Math.floor(Math.random()*4)+2);
        ctx.restore();
    }

    function drawStar(ctx,r){
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(r,0);
        for (var i=0;i<9;i++){
            ctx.rotate(Math.PI/5);
            if(i%2 === 0) {
                ctx.lineTo((r/0.525731)*0.200811,0);
            } else {
                ctx.lineTo(r,0);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}


function grayscaleTest() {
        var canvas = document.getElementById('canvas');
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        img.style.display = 'none';
        var imageData = ctx.getImageData(0,0,canvas.width, canvas.height);
        var data = imageData.data;

        var invert = function() {
            for (var i = 0; i < data.length; i += 4) {
                data[i]     = 255 - data[i];     // red
                data[i + 1] = 255 - data[i + 1]; // green
                data[i + 2] = 255 - data[i + 2]; // blue
            }
            ctx.putImageData(imageData, 0, 0);
        };

        var grayscale = function() {
            for (var i = 0; i < data.length; i += 4) {
                var avg = (data[i] + data[i +1] + data[i +2]) / 3;
                data[i]     = avg; // red
                data[i + 1] = avg; // green
                data[i + 2] = avg; // blue
            }
            ctx.putImageData(imageData, 0, 0);
        };

        var invertbtn = document.getElementById('invertbtn');
        invertbtn.addEventListener('click', invert);
        var grayscalebtn = document.getElementById('grayscalebtn');
        grayscalebtn.addEventListener('click', grayscale);
}

function toDataURL_PNG() {

}

function toDataURL_JPG() {

}




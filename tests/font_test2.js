var PImage = require('../src/pureimage');
var fs = require('fs');

var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
fnt.load(function() {
    var img = PImage.make(800,400);
    var ctx = img.getContext('2d');
    ctx.setFillStyleRGBA(0,255,255, 1);
    ctx.setFont('Source Sans Pro',120);
    ctx.fillText("Greetings",50,150);
    ctx.fillText("Earthling",50,360);
    //ctx.fillText("a",400,300);
    var metrics = ctx.measureText("Greetings");


    function hline(y) {
        ctx.setFillStyleRGBA(0,255,0, 1);
        ctx.beginPath();
        ctx.moveTo(0,  y);
        ctx.lineTo(799,y);
        ctx.stroke();
    }
    function vline(x) {
        ctx.setFillStyleRGBA(0,255,0, 1);
        ctx.beginPath();
        ctx.moveTo(x,  0);
        ctx.lineTo(x, 399);
        ctx.stroke();
    }


    vline(50+0);
    vline(50+metrics.width);
    hline(150-metrics.emHeightAscent);
    hline(150-metrics.emHeightDescent);


    PImage.encodePNG(img, fs.createWriteStream("out2.png"), function(){
        console.log("done");
    });
})

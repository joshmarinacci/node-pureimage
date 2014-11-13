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
    var metrics = ctx.measureText("Greetins");
    console.log("metrics = ", metrics);

    ctx.beginPath();
    ctx.moveTo(0,150-metrics.emHeightAscent);
    ctx.lineTo(500,150-metrics.emHeightAscent);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0,150-metrics.emHeightDescent);
    ctx.lineTo(500,150-metrics.emHeightDescent);
    ctx.stroke();

    PImage.encodePNG(img, fs.createWriteStream("out2.png"), function(){
        console.log("done");
    });
})

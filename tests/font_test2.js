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
    PImage.encodePNG(img, fs.createWriteStream("out2.png"), function(){
        console.log("done");
    });
})

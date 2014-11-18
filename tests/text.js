var PImage = require('../src/pureimage');
var fs = require('fs');

var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');

fnt.load(function() {
    var img = PImage.make(200,200);
    var ctx = img.getContext('2d');
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,200,200);
    ctx.setFont('Source Sans Pro',20);

    ctx.fillStyle = '#000000';
    ctx.fillText("mo",50,50);
    PImage.encodePNG(img, fs.createWriteStream('build/text.png'), function(err) {
        console.log("wrote out the png file to build/text.png");
    });
});

var PImage = require('../src/pureimage');

var opentype = require('../vendor/opentype.js');
var fs = require('fs');
var path = require('path');
opentype.load('tests/fonts/SourceSansPro-Italic.ttf', function (err, font) {
    if (err) {
        throw new Error('Could not load font: ' + err);
    } else {
        // Use your font here.

        //get the path for the letter 'B'

        var path = font.getPath("B", 100, 100, 100);
        //make image, set fill to cyan
        var img = PImage.make(200,200);
        var ctx = img.getContext('2d');
        ctx.setFillStyleRGBA(0,255,255, 1);

        //if red component is greater than 127 we get an overflow error.
        //need a way to store the fill color as an unsigned 32bit int

        // draw the path
        ctx.beginPath();
        path.commands.forEach(function(cmd) {
            switch(cmd.type) {
                case 'M': ctx.moveTo(cmd.x,cmd.y); break;
                case 'Q': ctx.quadraticCurveTo(cmd.x,cmd.y,cmd.x1,cmd.y1); break;
                case 'L': ctx.lineTo(cmd.x,cmd.y); break;
                case 'Z': ctx.fill(); break;
            }
        });

        //write to out.png
        PImage.encodePNG(img, fs.createWriteStream("out.png"), function(){
            console.log("done");
        })



    }
});

var PImage = require('../src/pureimage');
var fs = require('fs');

var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');

fnt.load(function() {
    var img = PImage.make(200,200);
    var ctx = img.getContext('2d');
    //ctx.fillStyle = "#ffffff";
    //ctx.fillRect(0,0,200,200);
    ctx.setFont('Source Sans Pro',20);
    ctx.fillStyle = '#000000';
    ctx.USE_FONT_GLYPH_CACHING = false;
    var before = process.hrtime();
    var count = 20*1000;
    for(var i=0; i<count; i++) {
        var str = "ABCDE";
        ctx.fillText(str,30,30);
    }
    var diff = process.hrtime(before);
    console.log('without caching', diff);

    ctx.USE_FONT_GLYPH_CACHING = true;
    var before = process.hrtime();
    for(var i=0; i<count; i++) {
        var str = "ABCDE";
        ctx.fillText(str,30,30);
    }
    var diff = process.hrtime(before);
    console.log('with caching', diff);

    PImage.encodePNG(img, fs.createWriteStream('build/text.png'), function(err) {
        console.log("wrote out the png file to build/text.png");
    });
});

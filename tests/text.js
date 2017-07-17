var PImage = require('../src/pureimage');
var fs = require('fs');

var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');

// First test: render synchronously loading text
fnt.loadSync();
renderText('textSync');

// Second test: render asynchronously (font is loaded at this point so it's going to be faster)
fnt.load(function() { renderText('textAsync') });

function renderText(fileName) {
    var img = PImage.make(200,200);
    var ctx = img.getContext('2d');
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(0,0,200,200);
    ctx.fillStyle = '#00ff00';
    ctx.font = "48pt 'Source Sans Pro'";
    ctx.fillText("Hello world", 10, 60);

    //ctx.USE_FONT_GLYPH_CACHING = true;
    //var before = process.hrtime();
    //var count = 20*1000;
    //for(var i=0; i<count; i++) {
    //    var str = "ABCDE";
        //ctx.fillStyle = '#00ff00';
        //ctx.fillText(str,30,30);
        //ctx.fillStyle = '#ffff00';
        //ctx.fillText(str,30,60);
        //    ctx.save();
        //ctx.translate(0,80);
        //ctx.fillText(str,30,30);
        //ctx.restore();
    //}
    //var diff = process.hrtime(before);
    //console.log('with caching', diff);

    //ctx.USE_FONT_GLYPH_CACHING = false;
    //var before = process.hrtime();
    //for(var i=0; i<count; i++) {
    //    var str = "ABCDE";
    //    ctx.fillText(str,30,30);
    //}
    //var diff = process.hrtime(before);
    //console.log('without caching', diff);


    PImage.encodePNGToStream(img, fs.createWriteStream('build/text.png')).then(()=>{
        // console.log("wrote out the png file to build/text.png");
    });
}

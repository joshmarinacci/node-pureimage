var fs = require('fs');
var PImage = require('../src/pureimage');



PImage.decodePNG(fs.createReadStream("tests/images/bird.png"),
function(bitmap) {
    console.log("the bitmap is ", bitmap);
    PImage.encodePNG(bitmap, fs.createWriteStream("out.png"), function() {
        console.log("done!");
    })
})

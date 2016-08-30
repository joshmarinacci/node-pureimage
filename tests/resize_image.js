var PImage = require('../src/pureimage');
var fs = require('fs');

var img1 = PImage.decodeJPEG(fs.readFileSync("tests/images/cat.jpg"));

var img2 = PImage.make(50,50);
var ctx = img2.getContext('2d');

ctx.drawImage(img1,
    //src
    0,0,100,100,
    //dst
    0,0,50,50);

//write out to a PNG file
PImage.encodePNG(img2, fs.createWriteStream('out.png'), (err) => {
    console.log("wrote to out.png. err = ",err);
});





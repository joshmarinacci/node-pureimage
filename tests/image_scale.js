var PImage = require('../src/pureimage');
var fs = require('fs');

var sc = 2;
var img1 = PImage.decodeJPEG(fs.readFileSync("tests/images/rock.jpg"));
var img2 = PImage.make(img1.width/sc,img1.height/sc);
var ctx = img2.getContext('2d');

ctx.drawImage(img1,
    //src
    0, 0, Math.floor(img1.width/sc), Math.floor(img1.height/sc),
    //dst
    0, 0, Math.floor(img1.width/sc), Math.floor(img1.height/sc)
);

//write out to a PNG file
PImage.encodePNG(img2, fs.createWriteStream('out.png'), (err) => {
    console.log("wrote to out.png. err = ",err);
});





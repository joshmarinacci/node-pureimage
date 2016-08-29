var PImage = require('../src/pureimage');
var fs = require('fs');

var img = PImage.decodeJPEG(fs.readFileSync("tests/images/cat.jpg"));
var ctx = img.getContext('2d');
var imageData = ctx.getImageData(0,0,100,100);


var data = imageData.data;
//invert each channel
for (var i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];     // red
    data[i + 1] = 255 - data[i + 1]; // green
    data[i + 2] = 255 - data[i + 2]; // blue
    //skip alpha
}
//put the data back
ctx.putImageData(imageData, 0, 0);

//write out to a PNG file
PImage.encodePNG(img, fs.createWriteStream('out.png'), (err) => {
    console.log("wrote to out.png. err = ",err);
});



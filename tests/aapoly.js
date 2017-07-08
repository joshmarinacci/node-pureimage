var fs = require('fs');

var PImage = require('../src/pureimage');

var img = PImage.make(40,40);
var ctx = img.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0,0,40,40);

ctx.fillStyle = '#ff0000';
ctx.beginPath();
ctx.moveTo(2.2,2);
ctx.lineTo(30,15);
ctx.lineTo(23,36);
ctx.closePath();
ctx.fill();

for(var j=0; j<img.height; j++) {
    var line = "";
    for(var i=0; i<img.width; i++) {
        var px = (ctx.getPixeli32(i,j)>>24&0xFF);
        var str = px.toString(16);
        if(str == '0') {
            str = '00';
        }
        line += str+' ';
    }
    console.log(line);
}

PImage.encodePNG(img, fs.createWriteStream('aapoly.png'), function(err) {
    console.log("wrote out the png file to aapoly.png");
});

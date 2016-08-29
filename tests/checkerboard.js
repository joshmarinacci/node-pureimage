/**
 * Created by josh on 8/29/16.
 */

var PImage = require('../src/pureimage');
var fs = require('fs');


var img = PImage.make(100,100);
var c = img.getContext('2d');
//draw red /blue checkerboard
for(var i=0; i<10; i+=1) {
    for(var j=0; j<10; j+=1) {
        if((i+j) %2 == 0) c.fillStyle = 'red';
        else c.fillStyle = 'blue';
        c.fillRect(i*10,j*10,10,10);
    }
}


PImage.encodePNG(img, fs.createWriteStream('out.png'), (err) => {
    console.log("done! err = ",err);
});

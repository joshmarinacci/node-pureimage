var fs = require('fs');
var PImage = require('../src/pureimage');


function rand(min,max) {
    return min + Math.random()*(max-min);
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r * 255, g * 255, b * 255];
}

function pick(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

console.log("allocating");
var canvas = PImage.make(16000,8000);
console.log("allocated");


var ctx = canvas.getContext('2d');
var w = canvas.width;
var h = canvas.height;
var gw = Math.floor(w/800);
var gh = Math.floor(h/800);
ctx.fillStyle = 'white';
ctx.fillRect(0,0,w,h);

//init the grid
var grid = [];
for(var j=0; j<gh; j++) {
    for(var i=0; i<gw; i++) {
        grid.push({x:40+i*40, y:40+j*40});
    }
}


//find a grid cell at x,y
function xy(x,y) {
    return grid[y*gw+x];
}

var colors = [];
for(var s=0.2; s<1; s+=0.1) {
    colors.push(hsvToRgb(1.0, 1.0, s));
}

var cells = [];
for(var i=0; i<gw-1; i++) {
    for(var j=0; j<gh-1; j++) {
        var pt1 = xy(i,j);
        var pt2 = xy(i+1,j);
        var pt3 = xy(i+1,j+1);
        var pt4 = xy(i,j+1);
        var color = colors[i%6];
        cells.push([pt1,pt2,pt3,pt4, color]);
    }
}

//randomly shift the grid
grid.forEach(function(pt,i){
    var dist = 19;
    pt.x = pt.x + rand(-dist,dist);
    pt.y = pt.y + rand(-dist,dist);
});

console.log("drawing");

//draw the dots
ctx.fillStyle = 'blue';
grid.forEach(function(pt){
    //ctx.fillRect(pt.x,pt.y, 4, 4)
});

//fill the polys
ctx.save();
//ctx.rotate(Math.PI/180.0*45);
ctx.scale(18.5,18.5);
cells.forEach(function(cell) {
    var c = cell[4];
    var color = 'rgb('+Math.floor(c[0])+','+Math.floor(c[1])+','+Math.floor(c[2])+')';
    ctx.fillStyle = color;
    //ctx.fillRect(cell[0].x, cell[0].y, 40, 40);
    ctx.beginPath();
    ctx.moveTo(cell[0].x, cell[0].y);
    ctx.lineTo(cell[1].x, cell[1].y);
    ctx.lineTo(cell[2].x, cell[2].y);
    ctx.lineTo(cell[3].x, cell[3].y);
    ctx.closePath();
    ctx.fill();
});


//draw the poly lines
cells.forEach(function(cell) {
    //ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(cell[0].x, cell[0].y);
    ctx.lineTo(cell[1].x, cell[1].y);
    ctx.lineTo(cell[2].x, cell[2].y);
    ctx.lineTo(cell[3].x, cell[3].y);
    ctx.closePath();
    ctx.stroke();
});
ctx.restore();

console.log("saving to PNG");

PImage.encodePNG(canvas, fs.createWriteStream('out.png'), (err) => {
    console.log("wrote to out.png. err = ",err);
});

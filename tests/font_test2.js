var PImage = require('../src/pureimage');
var fs = require('fs');

var fnt = PImage.registerFont('tests/fonts/SourceSansPro-Regular.ttf','Source Sans Pro');
fnt.load(function() {
    var img = PImage.make(800,400);
    var ctx = img.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0,0,800,400);
    ctx.fillStyle = '#000000';
    ctx.setFont('Source Sans Pro',100);
    //ctx.fillText("Greetings",50,150);
    //ctx.fillText("Earthling",50,360);
    ctx.fillText("iag&",0,300);
    ctx.strokeText("iag&",0,400);



    ctx.beginPath();
    ctx.moveTo(250,50);
    ctx.lineTo(300,50);
    ctx.lineTo(300,100);
    ctx.lineTo(250,100);
    ctx.lineTo(250,50);
    ctx.moveTo(360,160);
    ctx.lineTo(390,160);
    ctx.lineTo(390,190);
    ctx.lineTo(360,190);
    ctx.closePath();
    ctx.fill();



    //bottom right
    ctx.beginPath();
    ctx.arc(475, 75, 75, 0, Math.PI*2, true); //outer counter-clockwise
    ctx.arc(475, 75, 25, 0, Math.PI*2, false); //inner clockwise
    //ctx.closePath();
    ctx.fill();




    ctx.beginPath();
    ctx.moveTo(75,25);
    ctx.quadraticCurveTo(25,25,25,62.5);
    ctx.quadraticCurveTo(25,100,50,100);
    ctx.quadraticCurveTo(50,120,30,125);
    ctx.quadraticCurveTo(60,120,65,100);
    ctx.quadraticCurveTo(125,100,125,62.5);
    ctx.quadraticCurveTo(125,25,75,25);
    ctx.fill();


    /*
    var metrics = ctx.measureText("Greetings");


    function hline(y) {
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.moveTo(0,  y);
        ctx.lineTo(799,y);
        ctx.stroke();
    }
    function vline(x) {
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.moveTo(x,  0);
        ctx.lineTo(x, 399);
        ctx.stroke();
    }


    vline(50+0);
    vline(50+metrics.width);
    hline(150-metrics.emHeightAscent);
    hline(150-metrics.emHeightDescent);
    */

    PImage.encodePNG(img, fs.createWriteStream("out2.png"), function(){
        console.log("rendered out2.png");
    });
})

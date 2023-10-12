import * as pureimage from "../../src/index.js";
import fs from "fs";
import path from "path";
const DIR = "output";

let img = pureimage.make(512, 512);
let ctx = img.getContext("2d");

ctx.fillStyle = "white";
ctx.fillRect(0, 0, img.width, img.height);

let points = [
  {
    p: [
      246, 338, 246, 382, 246, 414, 300, 414, 366, 414, 366, 371, 366, 338, 327,
      338,
    ],
  },
];
// ctx.strokeColor = '#000';
ctx.strokeStyle = "#000000";
let i = 0;
ctx.beginPath();
console.log(points[i].p[14]);
ctx.moveTo(points[i].p[14], points[i].p[15]); //each bezierCurve strangely centers back to the start point moveTo!
ctx.bezierCurveTo(
  points[i].p[14],
  points[i].p[15],
  points[i].p[0],
  points[i].p[1],
  points[i].p[2],
  points[i].p[3],
);
ctx.bezierCurveTo(
  points[i].p[2],
  points[i].p[3],
  points[i].p[4],
  points[i].p[5],
  points[i].p[6],
  points[i].p[7],
);
// ctx.bezierCurveTo(points[i].p[6], points[i].p[7],points[i].p[8], points[i].p[9], points[i].p[10], points[i].p[11]);
// ctx.bezierCurveTo(points[i].p[10], points[i].p[11],points[i].p[12], points[i].p[13], points[i].p[14], points[i].p[15]);
ctx.stroke();

pureimage
  .encodePNGToStream(img, fs.createWriteStream(path.join(DIR, "bug_129.png")))
  .then(() => {
    console.log("rendred bug 129");
  });

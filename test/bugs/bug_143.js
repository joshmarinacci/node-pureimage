import * as PImage from '../../src/index.js'
import {Line} from "../../src/line.js"
import {Point} from "../../src/point.js"
// import {calcSortedIntersections} from "../../src/context.js"

import fs from 'fs'
import path from 'path'


const image = PImage.make(24, 24);
const ctx = image.getContext('2d');
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.moveTo(20, 20);
ctx.lineTo(2, 20);
ctx.lineTo(2, 19);
ctx.lineTo(1, 19);
ctx.lineTo(1, 1);
ctx.lineTo(21, 1);
ctx.lineTo(21, 19);
ctx.lineTo(20, 19);
ctx.closePath();
ctx.fill();

const DIR = "output"

let fname = path.join(DIR,'bug_143.png');
PImage.encodePNGToStream(image, fs.createWriteStream(fname)).then(() => {
    console.log(`wrote out ${fname}`)
})

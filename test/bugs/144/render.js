// const fs = require('node:fs');
import * as PImage from '../../../src/index.js'
import fs from "fs"
// PImage.registerFont('../node-pureimage/test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'Source Sans Pro').loadSync()

void (async function main() {
    await PImage.registerFont('test/bugs/144/Inter-Regular.otf', 'Inter').loadPromise()
    const canvas = PImage.make(100, 100);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 100, 100);

    ctx.font = '50px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText('B',50,50)
    // ctx.debug = true
    // ctx.strokeStyle = 'black'
    // ctx.strokeText('B', 50, 50);

    await PImage.encodePNGToStream(canvas, fs.createWriteStream('output/bug_144.png'));
})();

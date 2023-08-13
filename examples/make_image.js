import * as PImage from "../dist/index.ems.js"
import * as fs from 'fs'
const img1 = PImage.make(100, 100)
const ctx = img1.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(0,0,100,100);

PImage.encodePNGToStream(img1, fs.createWriteStream('out.png')).then(() => {
    console.log("wrote out the png file to out.png");
}).catch((e)=>{
    console.log("there was an error writing",e);
});

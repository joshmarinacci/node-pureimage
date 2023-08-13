/*
This examples streams an image from a URL to a PureImage buffer,
draws the current date in big black letters,
and writes the final image to disk

 */
import * as PImage from "../dist/index.ems.js"
import fs from 'fs'
import https from "https"

const https_get_P = (url) => new Promise(res => https.get(url,res))

async function doit() {
    let url = "https://vr.josh.earth/webxr-experiments/physics/jinglesmash.thumbnail.png"
    let filepath = "output_stream_async.png"
    //register font
    const font = PImage.registerFont('../test/unit/fixtures/fonts/SourceSansPro-Regular.ttf', 'MyFont');
    //load font
    await font.loadPromise()
    //get image
    let image_stream = await https_get_P(url)
    //decode image
    let img = await PImage.decodePNGFromStream(image_stream)
    //get context
    const ctx = img.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.font = "60pt MyFont";
    ctx.fillText(new Date().toDateString(), 50, 80);
    await PImage.encodePNGToStream(img, fs.createWriteStream(filepath))
    console.log("done writing to ", filepath)
}
doit().then(()=>console.log("done")).catch(e=>console.error(e))

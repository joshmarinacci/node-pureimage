import * as fs from "fs";
import * as pureimage from "../src/index.js";
import * as path from "path";
import {Bitmap} from "../src/index.js";
import {Canvas, createCanvas} from "canvas";
import {Size} from "josh_js_util";
import {fromBytesBigEndian} from "../src/uint32";
import pixelmatch from "pixelmatch";
import {PNG} from 'pngjs';

export const FIXTURES_DIR = "test/unit/fixtures/";

export const mkdir = async (pth) => {
  try {
    await fs.promises.mkdir(pth, { recursive: true });
  } catch (e) {}
};

export async function write_png(image, filename) {
  let pth = path.join("output", filename + ".png");
  console.log("writing to", pth);
  let stream = fs.createWriteStream(pth);
  await pureimage.encodePNGToStream(image, stream);
}

const DIR = "output";

export async function save(image, filename) {
  await mkdir(DIR);
  let filePath = path.join(DIR, filename + ".png");
  await mkdir(path.dirname(filePath));
  await pureimage.encodePNGToStream(image, fs.createWriteStream(filePath));
  console.log(`wrote out ${filePath}`);
}


export type RenderTest = (image:Bitmap) => void;

export function saveCairo(image3: Canvas, pth: string):Promise<void> {
  const prom = new Promise((res, rej)=>{
    const ws = fs.createWriteStream(`output/${pth}.png`)
    const ps = image3.createPNGStream()
    ps.pipe(ws)
    ps.on('end', ()=> res())
  })
  return prom
}

export async function compareRenderers(test: RenderTest, pth: string, size?:Size) {
  if(!size) size = new Size(10,10)


  const image1 = pureimage.make(size.w,size.h);
  test(image1)
  await save(image1, `${pth}-old`);
  const image2 = pureimage.makeV2(size.w,size.h);
  test(image2)
  await save(image2, `${pth}-new`);

  const image3:Canvas = createCanvas(size.w,size.h)
  // @ts-ignore
  image3.getPixelRGBA = (x, y) => {
    const data = image3.getContext('2d').getImageData(0,0,10,10)
    // console.log(data)
    // console.log(`fetching ${x},${y}`)
    const i = (x+y*10)*4
    return fromBytesBigEndian(
        data.data[i + 0],
        data.data[i + 1],
        data.data[i + 2],
        data.data[i + 3],
    );
  }

  test(image3 as unknown as Bitmap)
  await saveCairo(image3, `${pth}-cairo`);

  const img1 = PNG.sync.read(fs.readFileSync(`output/${pth}-old.png`));
  const img2 = PNG.sync.read(fs.readFileSync(`output/${pth}-new.png`));
  const {width, height} = img1;
  const diff = new PNG({width, height});
  const match = pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.0});
  fs.writeFileSync(`output/${pth}-diff.png`, PNG.sync.write(diff));
  // expect(match).toBe(0)
}


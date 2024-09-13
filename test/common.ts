import * as fs from "fs";
import * as pureimage from "../src/index.js";
import * as path from "path";

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

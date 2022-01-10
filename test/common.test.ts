import fs from 'fs'
import * as pureimage from '../src/index.js'
import path from 'path'

export const FIXTURES_DIR = "test/unit/fixtures/"


export const mkdir = (pth: string) => {
    return new Promise<void>((res,_rej)=>{
        fs.mkdir(pth,(_e)=>{
            // console.log("done with mkdir",e)
            res()
        })
    })
}

export function write_png (image: pureimage.Bitmap, filename: string) {
    return pureimage.encodePNGToStream(image, fs.createWriteStream(path.join('output',filename+".png")))
}

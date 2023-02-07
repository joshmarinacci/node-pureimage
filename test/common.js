import fs from 'fs'
import * as pureimage from '../src/index.js'
import path from 'path'

export const FIXTURES_DIR = "test/unit/fixtures/"


export const mkdir = (pth) => {
    return new Promise((res,rej)=>{
        fs.mkdir(pth,(e)=>{
            // console.log("done with mkdir",e)
            res()
        })
    })
}

export function write_png (image,filename) {
    let pth = path.join('output',filename+".png")
    console.log("writing to",pth)
    let stream = fs.createWriteStream(pth);
    return pureimage.encodePNGToStream(image, stream)
}

const DIR = "output"

export function save(image, filename, done) {
    mkdir(DIR).then(()=>{
        let pth = path.join(DIR, filename+".png")
        pureimage.encodePNGToStream(image, fs.createWriteStream(pth)).then(() => {
            console.log(`wrote out ${pth}`)
            done()
        })
    }).catch(e => console.error(e))
}

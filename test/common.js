import fs from 'fs'

export const FIXTURES_DIR = "test/unit/fixtures/"


export const mkdir = (pth) => {
    return new Promise((res,rej)=>{
        fs.mkdir(pth,(e)=>{
            // console.log("done with mkdir",e)
            res()
        })
    })
}


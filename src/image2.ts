import {Point} from "josh_js_util";

const INVALID:Color = {
    r:255,
    g:0,
    b:255,
    a:255,
}

export class BufferPixelSource {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number, data: Uint8ClampedArray) {
        this.width = width
        this.height = height
        this.data = data
    }

    sample(i: number, j: number):Color {
        if (i >= this.width) return INVALID
        if (j >= this.height) return INVALID
        let n = (i + j * this.width)*4
        let color:Color = {
            r:this.data[n+0],
            g:this.data[n+1],
            b:this.data[n+2],
            a:this.data[n+3],
        }
        return color
    }

    fillEach(cb: (pt: Point) => Color) {
        for(let i= 0; i<this.width; i++){
            for(let j= 0; j<this.height; j++) {
                let pt = new Point(i,j)
                let color = cb(pt)
                let n = (i + j*this.width)*4
                this.data[n+0] = color.r
                this.data[n+1] = color.g
                this.data[n+2] = color.b
                this.data[n+3] = color.a
            }
        }
    }

    setValue(p: Point, color: Color) {
        let i = p.x
        let j = p.y
        let n = (i + j*this.width)*4
        this.data[n+0] = color.r
        this.data[n+1] = color.g
        this.data[n+2] = color.b
        this.data[n+3] = color.a
    }
}

export type Color = {
    r:number
    g:number
    b:number
    a:number
}

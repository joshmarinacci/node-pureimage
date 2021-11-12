import chai, {expect} from "chai"

import * as pureimage from "../src/index.js"
import fs from 'fs'
import path from 'path'
import {write_png} from './common.js'

describe('color',() => {
    let image
    let context

    beforeEach(() => {
        image = pureimage.make(200, 200)
        context = image.getContext('2d')
    })

    it('canvas is empty and clear', (done) => {
        expect(image.getPixelRGBA(0, 0)).to.eq(0x00000000)
        done()
    })

    it('can fill with white and red', (done) => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, 200, 200);
        context.beginPath();
        context.arc(100,100, 50, 0, Math.PI*2,false)
        context.clip();
        context.fillStyle = 'red';
        context.fillRect(0, 0, 200, 200);
        write_png(image,'clipcolor').then(()=>{
            console.log("wrote out clipcolor.png")
            expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
            expect(image.getPixelRGBA(100,100)).to.eq(0xFF0000FF)
            done()
        })
    })


})

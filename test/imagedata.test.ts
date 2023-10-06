import {describe, expect, beforeEach, it} from "vitest"
import * as pureimage from "../src/index.js"

describe('drawImage',() => {
    let image;
    let context;
    const RED   = 0xFF0000FF
    const WHITE = 0xFFFFFFFF
    // const BLACK = 0x000000FF
    const GREEN = 0x00FF00FF

    beforeEach(() => {
        image = pureimage.make(200, 200)
        context = image.getContext('2d')
    })

    it('canvas has red and white', () => {
        context.fillStyle = 'white'
        context.fillRect(0,0,200,200)
        context.fillStyle = 'red'
        context.fillRect(0,0,100,100)
        expect(image.getPixelRGBA(5,5)).to.eq(RED)
        expect(image.getPixelRGBA(105,105)).to.eq(WHITE)
    })

    it('canvas can get image data', () => {
        let id = context.getImageData(0,0,10,10)
        expect(id.width).to.eq(10)
        expect(id.height).to.eq(10)
    })

    it('canvas can get offset image data', () => {
        context.fillStyle = 'white'
        context.fillRect(0,0,200,200)
        context.fillStyle = 'red'
        context.fillRect(0,0,100,100)
        expect(image.getPixelRGBA(99,99)).to.eq(RED)
        expect(image.getPixelRGBA(101,101)).to.eq(WHITE)

        let id = context.getImageData(95,95,10,10)
        console.log(id.getPixelRGBA_separate(0,0))
        console.log(id.getPixelRGBA_separate(1,0))
        console.log(id.getPixelRGBA_separate(2,0))

        expect(id.getPixelRGBA(3,3)).to.eq(RED)
        expect(id.getPixelRGBA(8,8)).to.eq(WHITE)
    })

    it('canvas can set image data', () => {
        context.fillStyle = 'white'
        context.fillRect(0,0,200,200)
        let id = context.getImageData(0,0,10,10)
        id.data[0] = 0
        id.data[1] = 255
        id.data[2] = 0
        id.data[3] = 255
        context.putImageData(id,0,0)
        expect(image.getPixelRGBA(0,0)).to.eq(GREEN)
    })

    it('canvas can set offset image data', () => {
        context.fillStyle = 'white'
        context.fillRect(0,0,200,200)
        let id = context.getImageData(0,0,10,10)
        id.setPixelRGBA(0,0,RED)
        id.setPixelRGBA(8,8,GREEN)
        context.putImageData(id,100,100)
        expect(image.getPixelRGBA(100,100)).to.eq(RED)
        expect(image.getPixelRGBA(108,108)).to.eq(GREEN)
    })

})

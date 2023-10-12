import {describe, expect, beforeEach, it} from "vitest"
import * as pureimage from "../src/index.js"
import {NAMED_COLORS} from "../src/named_colors";
import  {save} from './common';

describe('drawing gradients',() => {

    let image
    let c
    let w = 200
    let h = 200
    beforeEach(()=>{
        image = pureimage.make(w,h)
        c = image.getContext('2d')
        c.fillStyle = 'black'
        c.fillRect(0,0,w,h)
    })


    it('fillRect with linear gradient',async () => {
        const grad = c.createLinearGradient(0, 0, w,h)
        grad.addColorStop(0, 'white')
        grad.addColorStop(1, 'blue')
        c.fillStyle = grad
        c.fillRect(0, 0, w,h)
        expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
        // expect(image.getPixelRGBA(w-1, h-1)).to.eq(0x0000FFFF)
        await save(image, 'linear_gradient_fillrect')
    })

    it('fill with linear gradient',async () => {
        c.imageSmoothingEnabled = true
        const grad = c.createLinearGradient(0, 0, 20, 20)
        grad.addColorStop(0, '#ffffff')
        grad.addColorStop(1, 'blue')
        c.fillStyle = grad
        c.beginPath()
        c.rect(0, 0, 20, 20)
        c.fill()
        // expect(image.getPixelRGBA(0, 0)).to.eq(NAMED_COLORS.white)
        expect(image.getPixelRGBA(19, 19)).to.eq(0x0c0cFFFF)
        // console.log(image)
        // for(let i=0; i<20; i++) {
        //     console.log(i, image.getPixelRGBA_separate(i,19))
        // }
        await save(image, 'linear_gradient_fill.png')
    })

    it('linear gradient with multiple stops', async () => {
        const grad = c.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, '#ff0000')
        grad.addColorStop(0.5, '#00ff00')
        grad.addColorStop(1, '#0000ff')
        c.fillStyle = grad
        c.fillRect(0,0,w,h)
        await save(image, 'linear_gradient_rgb_stops.png')
    })

    // it('stroke with linear gradient',async () => {
    //     c.imageSmoothingEnabled = true
    //     const grad = c.createLinearGradient(0, 0, 20, 20)
    //     grad.addColorStop(0, 'white')
    //     grad.addColorStop(1, 'blue')
    //     // c.fillStyle = grad
    //     // c.fillStyle = 'red'
    //     c.strokeStyle = grad
    //     // c.strokeStyle = 'red'
    //     c.lineWidth = 3
    //     c.beginPath()
    //     c.rect(5, 5, 10, 10)
    //     c.stroke()
    //
    //     await save(image, 'linar_gradient_stroke.png')
    // })

    it('is making a radial gradient',async () => {
        const grad = c.createRadialGradient(10, 10, 5, 10, 10, 10)
        grad.addColorStop(0, 'white')
        grad.addColorStop(1, 'green')
        c.imageSmoothingEnabled = false
        c.fillStyle = grad
        c.fillRect(0, 0, 20, 20)

        // expect(image.getPixelRGBA(0, 0)).to.eq(NAMED_COLORS.green)
        // expect(image.getPixelRGBA(10, 10)).to.eq(NAMED_COLORS.white)
        await save(image, 'radial_gradient_fillrect.png',)
    })

    it('is drawing a conical gradient with smooth colors', async () => {
        const grad = c.createConicGradient(0, w/2, h/2)
        grad.addColorStop(0, 'white')
        grad.addColorStop(1, 'blue')
        c.fillStyle = grad
        c.fillRect(0, 0, w,h)
        await save(image, 'conic_gradient_smooth')
    })
    it('is drawing a conical gradient with a different angle', async () => {
        const grad = c.createConicGradient(Math.PI/3, w/2, h/2)
        grad.addColorStop(0, 'white')
        grad.addColorStop(1, 'blue')
        c.fillStyle = grad
        c.fillRect(0, 0, w,h)
        await save(image, 'conic_gradient_smooth_90')
    })
    it('is drawing a conical gradient with hard colors', async() => {

        const grad = c.createConicGradient(Math.PI/3, w/2, h/2)
        grad.addColorStop(0, "#f00");
        grad.addColorStop(0.2, "#00f");
        grad.addColorStop(0.4, "#0ff");
        grad.addColorStop(0.6, "#f0f");
        grad.addColorStop(0.8, "#ff0");
        grad.addColorStop(1, "#f00");
        // grad.addColorStop(0, "#f00");
        // grad.addColorStop(0.2, "#00f");
        // grad.addColorStop(0.4, "#0ff");
        // grad.addColorStop(0.6, "#f0f");
        // grad.addColorStop(0.8, "#ff0");
        // grad.addColorStop(1, "#f00");
        c.fillStyle = grad
        c.fillRect(0, 0, w,h)
        await save(image, 'conic_gradient_smooth_rainbow')
    })
    it('is drawing a conical gradient with one color', async () => {

    })
});

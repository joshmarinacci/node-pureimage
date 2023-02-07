import {expect} from "chai"
import * as pureimage from "../src/index.js"
import {NAMED_COLORS} from "../src/named_colors.js"
import {save} from './common.js'

describe('drawing gradients',() => {

    let image
    let c
    const WHITE = 0xFFFFFFFF
    const BLACK = 0x000000FF

    beforeEach(()=>{
        image = pureimage.make(20,20)
        c = image.getContext('2d')
        c.fillStyle = 'black'
        c.fillRect(0,0,200,200)
    })


    it('fillRect with linear gradient',(done)=>{
        const grad = c.createLinearGradient(0,0,20,20)
        grad.addColorStop(0,'white')
        grad.addColorStop(1,'blue')
        c.fillStyle = grad
        c.fillRect(0,0,20,20)

        expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(19, 19)).to.eq(0x0C0CFFFF)
        save(image, 'linear_gradient_fillrect.png',done)
    })

    it('fill with linear gradient',(done)=>{
        c.imageSmoothingEnabled = true
        const grad = c.createLinearGradient(0,0,20,20)
        grad.addColorStop(0,'#ffffff')
        grad.addColorStop(1,'blue')
        c.fillStyle = grad
        c.beginPath()
        c.rect(0,0,20,20)
        c.fill()
        // expect(image.getPixelRGBA(0, 0)).to.eq(NAMED_COLORS.white)
        expect(image.getPixelRGBA(19, 19)).to.eq(0x0c0cFFFF)
        // console.log(image)
        // for(let i=0; i<20; i++) {
        //     console.log(i, image.getPixelRGBA_separate(i,19))
        // }
        save(image, 'linear_gradient_fill.png',done)
    })

    it('stroke with linear gradient',(done)=>{
        c.imageSmoothingEnabled = true
        const grad = c.createLinearGradient(0,0,20,20)
        grad.addColorStop(0,'white')
        grad.addColorStop(1,'blue')
        // c.fillStyle = grad
        // c.fillStyle = 'red'
        c.strokeStyle = grad
        // c.strokeStyle = 'red'
        c.lineWidth = 3
        c.beginPath()
        c.rect(5,5,10,10)
        c.stroke()

        save(image, 'linar_gradient_stroke.png',done)
    })

    it('is making a radial gradient',(done)=>{
        const grad = c.createRadialGradient(10,10, 5, 10,10,10)
        grad.addColorStop(0,'white')
        grad.addColorStop(1,'green')
        c.imageSmoothingEnabled = false
        c.fillStyle = grad
        c.fillRect(0,0,20,20)

        expect(image.getPixelRGBA(0, 0)).to.eq(NAMED_COLORS.green)
        expect(image.getPixelRGBA(10, 10)).to.eq(NAMED_COLORS.white)
        save(image, 'radial_gradient_fillrect.png',done)
    })
});

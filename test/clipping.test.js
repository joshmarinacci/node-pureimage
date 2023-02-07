import chai, {expect} from "chai"

import * as pureimage from "../src/index.js"
import {OPAQUE_BLACK} from '../src/named_colors.js'
import {save} from './common.js'

describe('clipping tests',() => {
    let image
    let context

    beforeEach(() => {
        image = pureimage.make(200, 200)
        context = image.getContext('2d')
    })

    it('canvas is empty and clear', (done) => {
        expect(image.getPixelRGBA(0, 0)).to.eq(OPAQUE_BLACK)
        done()
    })

    it('can fill with white and red', (done) => {
        // fill whole canvas with white
        context.fillStyle = 'white';
        context.fillRect(0, 0, 200, 200);
        // create a circle
        context.beginPath();
        context.arc(100,100, 50, 0, Math.PI*2,false)
        // use circle as clip
        context.clip();
        // now fill with red
        context.fillStyle = 'red';
        context.fillRect(0, 0, 200, 200);
        expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(100,100)).to.eq(0xFF0000FF)
        save(image,'clipcolor',done)
    })

    it('can draw an image inside of a clip',(done)=>{
        context.fillStyle = 'red';
        context.fillRect(0, 0, 200, 200);
        context.beginPath();
        context.arc(100,100, 10, 0, Math.PI*2,false)
        context.clip();
        context.fillStyle = 'white';
        context.fillRect(0, 0, 200, 200);
        let src = pureimage.make(50,50)
        const c = src.getContext('2d')
        c.fillStyle = 'white'
        c.fillRect(0,0,50,50)
        c.fillStyle = 'black'
        c.fillRect(25,0,25,50)
        context.drawImage(src,75,75,50,50)
        expect(image.getPixelRGBA(0, 0)).to.eq(0xFF0000FF)
        expect(image.getPixelRGBA(99, 100)).to.eq(0xFFFFFFFF)
        expect(image.getPixelRGBA(80, 100)).to.eq(0xFF0000FF)
        save(image,'clipimage',done)
    })

    it('can save and restore clips',(done) => {
        expect(context._clip).to.eq(null)
        context.save();
        context.beginPath();
        context.rect(0,0,10,10)
        context.clip();
        expect(context._clip.length).to.eq(4)
        context.restore()
        expect(context._clip).to.eq(null)
        done()
    })


})

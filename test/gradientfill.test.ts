import {expect} from 'chai';
import * as pureimage from '../src/index.js';
import fs from 'fs';

describe('drawing gradients',() => {

    let image;
    let c;
    /* const WHITE = 0xFFFFFFFF;
    const BLACK = 0x000000FF; */

    beforeEach(()=>{
        image = pureimage.make(20,20);
        c = image.getContext('2d');
        c.fillStyle = 'black';
        c.fillRect(0,0,200,200);
    });


    it('is making a linear gradient',(done)=>{
        const grad = c.createLinearGradient(0,0,20,20);
        grad.addColorStop(0,'white');
        grad.addColorStop(1,'blue');
        c.fillStyle = grad;
        c.fillRect(0,0,20,20);

        pureimage.encodePNGToStream(image, fs.createWriteStream('output/lgrad.png')).then(() => {
            console.log('wrote out lgrad.png');
            expect(image.getPixelRGBA(0, 0)).to.eq(0xFFFFFFFF);
            expect(image.getPixelRGBA(19, 19)).to.eq(0x0C0CFFFF);
            done();
        });
    });

    it('is making a radial gradient',(done)=>{
        const grad = c.createRadialGradient(10,10, 5, 10,10,10);
        grad.addColorStop(0,'white');
        grad.addColorStop(1,'green');
        c.fillStyle = grad;
        c.fillRect(0,0,20,20);

        pureimage.encodePNGToStream(image, fs.createWriteStream('output/rgrad.png')).then(() => {
            console.log('wrote out rgrad.png');
            expect(image.getPixelRGBA(0, 0)).to.eq(0x00FF00FF);
            expect(image.getPixelRGBA(10, 10)).to.eq(0xFFFFFFFF);
            done();
        }).catch(e => {
            console.error(e);
            done();
        });
    });
});

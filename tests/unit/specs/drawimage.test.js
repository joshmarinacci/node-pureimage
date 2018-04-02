const pureimage = require('pureimage')
describe('drawImage',() => {
    let image;
    let context;
    let src;

    beforeEach(() => {
        image = pureimage.make(200,200)
        context = image.getContext('2d')

        src = pureimage.make(50,50)
        const c = src.getContext('2d')
        c.fillStyle = 'white'
        c.fillRect(0,0,50,50)
        c.fillStyle = 'black'
        c.fillRect(25,0,25,50)
    })

    it('canvas is empty and clear', (done) => {
        expect(image.getPixelRGBA(0,0)).toBe(0x00000000)
        done()
    })

    it('can draw a full image', (done) => {
        context.drawImage(src,0,0,50,50,0,0,50,50)
        expect(image.getPixelRGBA(0, 0)).toBe(0xFFFFFFFF)
        expect(image.getPixelRGBA(25,0)).toBe(0x000000FF)
        done()
    })

    it('can stretch a full image', (done) => {
        context.drawImage(src,0,0,50,50,0,0,200,200)
        expect(image.getPixelRGBA(0, 0)).toBe(0xFFFFFFFF)
        expect(image.getPixelRGBA(25,0)).toBe(0xFFFFFFFF)
        expect(image.getPixelRGBA(100,0)).toBe(0x000000FF)
        expect(image.getPixelRGBA(199,0)).toBe(0x000000FF)
        done()
    })

    it('can draw a plain image',(done) => {
        context.drawImage(src,0,0)
        expect(image.getPixelRGBA(0, 0)).toBe(0xFFFFFFFF)
        expect(image.getPixelRGBA(25,0)).toBe(0x000000FF)
        done()
    })

    it('can draw a scaled image',(done) => {
        context.drawImage(src,0,0,200,200)
        expect(image.getPixelRGBA(0, 0)).toBe(0xFFFFFFFF)
        expect(image.getPixelRGBA(100,0)).toBe(0x000000FF)
        done()
    })
})
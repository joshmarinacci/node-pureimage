import * as pureimage from "../src/index.js"
import chai, {expect} from "chai"


describe("simple transforms",() => {
    let image
    let ctx

    beforeEach(() => {
        image = pureimage.make(20,20)
        ctx = image.getContext('2d')
    })


    function drawLine() {
        ctx.beginPath();
        ctx.moveTo(5, 5);
        ctx.lineTo(10, 10);
        ctx.lineTo(5, 10);
        ctx.closePath();
    }

    it("draws a single line",()=>{
        drawLine();
        expect(ctx.path[0][0]).to.eq('m')
        expect(ctx.path[0][1].x).to.eq(5)
    })

    it("draws a translated line",()=>{
        ctx.save();
        ctx.translate(5, 0);
        drawLine();
        ctx.restore();
        expect(ctx.path[0][0]).to.eq('m')
        expect(ctx.path[0][1].x).to.eq(10)
    })

    it("rotates a line", ()=>{
        ctx.save();
        ctx.rotate(Math.PI / 180.0 * 90);
        drawLine();
        ctx.restore();
        expect(ctx.path[0][0]).to.eq( 'm')
        expect(ctx.path[0][1].x).to.eq( -5)
        expect(ctx.path[0][1].y).to.eq( 5)
    })

    it('scales a line',()=>{
        ctx.save();
        ctx.scale(2, 2);
        drawLine();
        ctx.restore();

        expect(ctx.path[0][0]).to.eq( 'm')
        expect(ctx.path[0][1].x).to.eq( 10)
        expect(ctx.path[0][1].y).to.eq( 10)

        expect(ctx.path[1][0]).to.eq( 'l')
        expect(ctx.path[1][1].x).to.eq( 20)
        expect(ctx.path[1][1].y).to.eq( 20)

        expect(ctx.path[2][0]).to.eq( 'l')
        expect(ctx.path[2][1].x).to.eq( 10)
        expect(ctx.path[2][1].y).to.eq( 20)

        expect(ctx.path[3][0]).to.eq( 'l')
        expect(ctx.path[3][1].x).to.eq( 10)
        expect(ctx.path[3][1].y).to.eq( 10)

    })

})


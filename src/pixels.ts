import {ArrayGrid, Point} from "josh_js_util";
import {Triangle} from "./geom.js";
import {BufferPixelSource, Color} from "./image2.js";
import {drawDot} from "./debug.js";

export function colorToRGBA(color: Color) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

export function calcSinglePixelCoverage(ptx:Point, path: Triangle[], clip: Triangle[]):number {

    // do subpixels
    const super_sampling = 4
    let geom_factor = 0
    let clip_factor = 0
    for(let j=0; j<super_sampling; j++) {
        for(let i=0; i<super_sampling; i++) {
            let pt = new Point(
                (ptx.x-0.5)+i*1/super_sampling,
                (ptx.y-0.5)+j*1/super_sampling
            )
            path.forEach(tri => {
                if(tri.containsPoint(pt)) {
                    geom_factor += 1
                }
            })
            clip.forEach(tri => {
                if (tri.containsPoint(pt)) {
                    clip_factor += 1
                }
            })
        }
    }

    // shade square based on antialiasing
    let geom_coverage = geom_factor/(super_sampling*super_sampling)
    let clip_coverage = 1.0
    if(clip.length >= 1) {
        clip_coverage = clip_factor/(super_sampling*super_sampling)
    }
    return geom_coverage * clip_coverage
}

export function hexstringToColor(fill: string):Color {
    fill = fill.substring(1)
    let r = parseInt(fill.substring(0,2),16)
    let g = parseInt(fill.substring(2,4),16)
    let b = parseInt(fill.substring(4,6),16)
    return {
        r:r,g:g,b:b, a:255
    }
}

export function calculatePixelCoverage(canvas: HTMLCanvasElement, path: Triangle[], scale:number, clip:Triangle[]):ArrayGrid<number> {
    let grid = new ArrayGrid<number>(Math.floor(canvas.width / scale), Math.floor(canvas.height / scale))
    const off = new Point(0.5,0.5)
    grid.fill((n)=> calcSinglePixelCoverage(n.add(off), path, clip))
    return grid
}

export function drawCoverageValues(ctx: CanvasRenderingContext2D, cov: ArrayGrid<number>, scale: number) {
    let off = new Point(0.5,0.5)
    cov.forEach((fract,n) => {
        drawDot(ctx,n.add(off),scale,'green',fract*scale/2)
    })
}

export function drawPixels(ctx: CanvasRenderingContext2D, cov: ArrayGrid<number>, fill: string | BufferPixelSource, scale: number) {
    ctx.save()
    cov.forEach((fract, n) => {
        let pixelFill:Color = {
            r:255,
            g:0,
            b:255,
            a:255,
        }
        if(fill instanceof BufferPixelSource) {
            pixelFill = (fill as BufferPixelSource).sample(n.x,n.y)
        }
        if(typeof fill === 'string') {
            pixelFill = hexstringToColor(fill)
        }
        ctx.fillStyle = colorToRGBA(pixelFill)
        ctx.globalAlpha = fract
        ctx.fillRect(n.x*scale,n.y*scale,scale,scale)
    })
    ctx.restore()
}

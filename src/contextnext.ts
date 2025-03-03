import {Context} from "./context";
import {Bitmap} from "./bitmap";
import {ArrayGrid, Point} from "josh_js_util";
import {calcQuadraticAtT, Line} from "./geom.js";
import {lerpPoint, rotateVector} from "./util.js";
import {pathToTriangles} from "./triangulate";
import {calculatePixelCoverage, colorToRGBA, drawPixels, hexstringToColor} from "./pixels";
import {BufferPixelSource, Color} from "./image2";
import {fromBytesBigEndian} from "./uint32";

export class ContextNext extends Context {
    private pathnext: JPath2D;
    constructor(bitmap:Bitmap) {
        super(bitmap);
    }
    fillRect(x: number, y: number, w: number, h: number) {
        const scale = 1
        this.pathnext = new JPath2D()
        console.log("fillstyle is",this.fillStyle)
        this.pathnext.rect(x, y, w, h);
        let subPaths: JPath2D[] = pathToSubpaths(this.pathnext)
        for (let path of subPaths) {
            let [pathPoints, pathLines] = pathToPoints(path)
            let [clipPoints, clipLines] = pathToPoints(undefined)
            let pathTris = pathToTriangles(pathPoints)
            let clipTris = pathToTriangles(clipPoints)
            pathTris.forEach(tri => {
                console.log("tri",tri.toString())
            })
            let cov = calculatePixelCoverage(this._bitmap, pathTris, scale, clipTris)
            console.log("converage",cov)
            this.drawPixels(cov,this.fillStyle,scale)
        }
    }

    private drawPixels(cov: ArrayGrid<number>, fill: string | BufferPixelSource, scale: number) {
        this.save()
        cov.forEach((fract, n) => {
            if(fract <= 0) return
            // console.log("yo")
            let pixelFill:Color = {
                r:244,
                g:0,
                b:244,
                a:244,
            }
            if(fill instanceof BufferPixelSource) {
                pixelFill = (fill as BufferPixelSource).sample(n.x,n.y)
            }
            if(typeof fill === 'string') {
                pixelFill = hexstringToColor(fill)
            }
            // this.fillStyle = colorToRGBA(pixelFill)
            this.globalAlpha = fract
            // console.log("filling at",n.x,n.y,pixelFill,fract)
            const _fillColor = fromBytesBigEndian(pixelFill.r, pixelFill.g, pixelFill.b, pixelFill.a)
            this._bitmap.setPixelRGBA(n.x,n.y, _fillColor);
        })
        this.restore()
    }
}




type ClosePath = {
    type: 'close-path'
}
type MoveToCmd = {
    type: 'move-to',
    x: number,
    y: number,
}
type LineTo = {
    type: 'line-to',
    x: number,
    y: number,
}
type BezierTo = {
    type: 'bezier-to',
    cp1x: number,
    cp1y: number,
    cp2x: number
    cp2y: number
    x: number
    y: number
}
type QuadraticTo = {
    type: 'quadratic-to'
    cpx: number
    cpy: number
    x: number
    y: number
}
type Arc = {
    type: 'arc',
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
}
type ArcTo = {
    type: 'arc-to'
    x1: number
    y1: number
    x2: number
    y2: number
    radius: number
}
type Ellipse = {
    type: 'ellipse'
    x: number
    y: number
    radiusX: number
    radiusY: number
    rotation: number
    startAngle: number
    endAngle: number
}
type Rect = {
    type: 'rect',
    x: number,
    y: number,
    w: number,
    h: number,
}
type RoundRect = {
    type: 'roundrect',
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number[]
}
type Cmd = ClosePath | MoveToCmd | LineTo | BezierTo | QuadraticTo | Arc | ArcTo | Ellipse | Rect | RoundRect

export class JPath2D {
    public cmds: Cmd[];

    constructor() {
        this.cmds = []
    }

    closePath() {
        this.cmds.push({type: 'close-path'})
    }

    moveTo(x: number, y: number): void {
        this.closePath()
        this.cmds.push({type: 'move-to', x, y})
    }

    lineTo(x: number, y: number): void {
        this.cmds.push({type: 'line-to', x, y})
    }

    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
        this.cmds.push({type: 'bezier-to', cp1x, cp1y, cp2x, cp2y, x, y})
    }

    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
        this.cmds.push({type: 'quadratic-to', cpx, cpy, x, y})
    }

    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
        this.cmds.push({type: 'arc', x, y, radius, startAngle, endAngle})
    }

    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
        if (radius < 0) throw new Error("arcTo() radius must be be positive")
        this.cmds.push({type: 'arc-to', x1, y1, x2, y2, radius})
    }

    rect(x: number, y: number, w: number, h: number) {
        this.cmds.push({type: 'rect', x, y, w, h})
    }

    roundRect(x: number, y: number, w: number, h: number, radii: number[]) {
        this.cmds.push({type: 'roundrect', x, y, w, h, radii})
    }

    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void {
        this.cmds.push({type: 'ellipse', x, y, radiusX, radiusY, rotation, startAngle, endAngle})
    }

    isEmpty() {
        return this.cmds.length < 1
    }
}

function pathToPoints(path?: JPath2D): [Point[], Line[]] {
    let pts: Point[] = []
    let lines: Line[] = []
    if(path) {
        path.cmds.forEach(cmd => {
            if (cmd.type === 'move-to') {
                pts.push(new Point(cmd.x, cmd.y))
            }
            if (cmd.type === 'line-to') {
                pts.push(new Point(cmd.x, cmd.y))
            }
            if (cmd.type === 'bezier-to') {
                let steps = 40
                let prev = pts[pts.length - 1]
                for (let i = 0; i < steps; i++) {
                    let t = 1 / steps * i
                    let p0 = prev
                    let p1 = new Point(cmd.cp1x, cmd.cp1y)
                    let p2 = new Point(cmd.cp2x, cmd.cp2y)
                    let p3 = new Point(cmd.x, cmd.y)
                    let a = lerpPoint(p0, p1, t)
                    let b = lerpPoint(p1, p2, t)
                    let c = lerpPoint(p2, p3, t)
                    let d = lerpPoint(a, b, t)
                    let e = lerpPoint(b, c, t)
                    let pt = lerpPoint(d, e, t)
                    pts.push(pt)
                    prev = pt
                }
            }
            if (cmd.type === 'quadratic-to') {
                let steps = 10
                let prev = pts[pts.length - 1]
                let cp = new Point(cmd.cpx, cmd.cpy)
                let tgt = new Point(cmd.x, cmd.y)
                for (let i = 0; i < steps + 1; i++) {
                    let t = 1 / steps * i
                    let pt = calcQuadraticAtT([prev, cp, tgt], t)
                    pts.push(pt)
                }
            }
            if (cmd.type === 'arc') {
                let steps = 30
                for (let i = 0; i < steps + 1; i++) {
                    let theta = (cmd.endAngle - cmd.startAngle) / steps * i
                    let xx = cmd.x + Math.cos(theta) * cmd.radius
                    let yy = cmd.y + Math.sin(theta) * cmd.radius
                    pts.push(new Point(xx, yy))
                }
            }
            if (cmd.type === 'arc-to') {
                let prev = pts[pts.length - 1]
                let A = prev
                let B = new Point(cmd.x1, cmd.y1)
                let C = new Point(cmd.x2, cmd.y2)

                const AB = B.subtract(A);
                const rAB = rotateVector(AB.unit(), Math.PI / 2);
                const X = A.add(rAB.scale(cmd.radius));
                const Y = B.add(rAB.scale(cmd.radius));
                const XY = new Line(X, Y, 'XY');


                // turn into making XY directly from AB by adding the offset vector
                // same for CB
                // then calc intersect and project points to get ABI and CBI

                const CB = B.subtract(C)
                const rCB = rotateVector(CB.unit(), -(Math.PI / 2))
                const Z = rCB.scale(cmd.radius).add(C)
                const T = B.add(rCB.scale(cmd.radius))
                let ZT = new Line(Z, T)
                let I = XY.intersectLine(ZT)

                // loop over angle to create ABI to CBI
                for (let i = 0; i < 5; i++) {

                }
                // let ABI = I.subtract(X).add(A)
                let ABI = A.add(I).subtract(X)
                pts.push(ABI)
                let CBI = I.subtract(Z).add(C)
                pts.push(CBI)

                pts.push(C)

                lines.push(new Line(A, B, "AB"))
                lines.push(XY)
                lines.push(new Line(B, C, "BC"))
                lines.push(ZT)
            }
            if (cmd.type === 'rect') {
                pts.push(new Point(cmd.x, cmd.y))
                pts.push(new Point(cmd.x + cmd.w, cmd.y))
                pts.push(new Point(cmd.x + cmd.w, cmd.y + cmd.h))
                pts.push(new Point(cmd.x, cmd.y + cmd.h))
            }
            if (cmd.type === 'roundrect') {
                let tl = cmd.radii[0]
                let tr = cmd.radii[1]
                let br = cmd.radii[2]
                let bl = cmd.radii[3]
                let x = cmd.x
                let y = cmd.y
                let w = cmd.w
                let h = cmd.h
                pts.push(new Point(x, y + tr))
                pts.push(new Point(x + tl, y))
                pts.push(new Point(x + w - tr, y))
                pts.push(new Point(x + w, y + tr))
                pts.push(new Point(x + w, y + h - br))
                pts.push(new Point(x + w - br, y + h))
                pts.push(new Point(x + bl, y + h))
                pts.push(new Point(x, y + h - bl))
            }
            if (cmd.type === 'ellipse') {
                let steps = 20
                for (let i = 0; i < steps + 1; i++) {
                    let theta = (cmd.endAngle - cmd.startAngle) / steps * i
                    let xx = cmd.x + Math.cos(theta) * cmd.radiusX
                    let yy = cmd.y + Math.sin(theta) * cmd.radiusY
                    pts.push(new Point(xx, yy))
                }
            }
        })
    }
    return [pts, lines]
}

function pathToSubpaths(fullPath: JPath2D):JPath2D[] {
    let paths:JPath2D[] = []
    let curr:JPath2D|undefined
    for(let cmd of fullPath.cmds) {
        if(!curr) {
            curr = new JPath2D()
        }
        if(cmd.type == 'close-path') {
            paths.push(curr)
            curr = new JPath2D()
            continue
        }
        curr.cmds.push(cmd)
    }
    if(curr) paths.push(curr)
    paths = paths.filter(path => !path.isEmpty())
    return paths
}

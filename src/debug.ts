import {dotProduct, isConcave, Line, Path, toDeg, Triangle} from "./geom.js";
import {Point} from "josh_js_util";
import {lerpPoint, wrappingArrayGet} from "./util.js";
import {JPath2D} from "./contextnext";

export function drawDot(ctx: CanvasRenderingContext2D, pt: Point, scale: number, color: string, radius?:number) {
    ctx.fillStyle = color
    ctx.beginPath()
    let rad = typeof radius == 'number' ? radius : 5
    ctx.arc(pt.x * scale, pt.y * scale, rad, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
}

export function drawLine(ctx: CanvasRenderingContext2D, line: Line, scale: number, color: string) {
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(line.A.x * scale, line.A.y * scale)
    ctx.lineTo(line.B.x * scale, line.B.y * scale)
    ctx.stroke()
}

export function fillBG(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, white: string) {
    ctx.fillStyle = white
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function fillCoordsBG(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale: number, color: string) {
    ctx.save()
    ctx.translate(0.5, 0.5)
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < canvas.width / scale; i++) {
        ctx.moveTo(i * scale, 0 * scale)
        ctx.lineTo(i * scale, canvas.height)
    }
    for (let j = 0; j < canvas.width / scale; j++) {
        ctx.moveTo(0 * scale, j * scale)
        ctx.lineTo(canvas.width, j * scale)
    }
    ctx.stroke()
    ctx.restore()
}

export function drawVector(ctx: CanvasRenderingContext2D, start: Point, vector: Point, scale: number, color: string) {
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(start.x * scale, start.y * scale)
    let ApB = start.add(vector)
    ctx.lineTo(ApB.x * scale, ApB.y * scale)
    ctx.closePath()
    ctx.stroke()
    let ang = Math.atan2(vector.y, vector.x)
    ctx.save()
    ctx.fillStyle = color
    ctx.translate(ApB.x * scale, ApB.y * scale)
    ctx.rotate(ang + Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(5, 20)
    ctx.lineTo(-5, 20)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
}

export function fillTriangles(ctx: CanvasRenderingContext2D, tris: Triangle[], scale: number, color:string) {
    ctx.fillStyle = color
    tris.forEach(tri => {
        ctx.beginPath()
        let A = tri.lines[0].A
        ctx.moveTo(A.x * scale, A.y * scale)
        let B = tri.lines[1].A
        ctx.lineTo(B.x * scale, B.y * scale)
        let C = tri.lines[2].A
        ctx.lineTo(C.x * scale, C.y * scale)
        ctx.moveTo(A.x * scale, A.y * scale)
        ctx.fill()
    })
}

function drawTriangle(ctx: CanvasRenderingContext2D, tri: Triangle, scale: number, color: string) {
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = color
    ctx.beginPath()
    tri.lines.forEach(line => {
        ctx.moveTo(line.A.x * scale, line.A.y * scale)
        ctx.lineTo(line.B.x * scale, line.B.y * scale)
    })
    ctx.stroke()
    ctx.restore()
}

export function drawAngle(ctx: CanvasRenderingContext2D, B: Point, BA: Point, BC: Point, scale: number, color: string) {
    // console.log("drawAngle",B,BA,BC)
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.translate(B.x * scale, B.y * scale)
    ctx.beginPath()
    let angABC = Math.acos(dotProduct(BA, BC))
    let angAB = Math.atan2(BA.y, BA.x)
    let angBC = Math.atan2(BC.y, BC.x)
    ctx.arc(0, 0, 20, angAB, angBC, true)
    ctx.stroke()
    ctx.fillStyle = 'black'
    ctx.font = '12px sans-serif'
    ctx.fillText(`dot ${dotProduct(BC, BA).toFixed(2)} angle ${toDeg(angABC).toFixed(2)} concave=${isConcave(BA, BC)}`, 10, -15)
    ctx.restore()
}

export function drawPointsAndAngles(ctx: CanvasRenderingContext2D, path: Path, scale: number) {
    for (let i = 0; i < path.length; i++) {
        let A = wrappingArrayGet(path, i)
        let B = wrappingArrayGet(path, i + 1)
        let C = wrappingArrayGet(path, i + 2)
        let BA = A.subtract(B)
        let BC = C.subtract(B)

        let self_intersects = false
        let trit = Triangle.fromPoints(A, B, C)
        for (let i = 0; i < path.length; i++) {
            let pt = path[i]
            // console.log("inside ",i,pt,trit.containsPoint(pt))
            if (trit.containsPoint(pt)) {
                self_intersects = true
            }
        }

        drawDot(ctx, A, scale, 'red')
        ctx.fillStyle = 'purple'
        ctx.font = '15px sans-serif'
        let dot = dotProduct(BA, BC)
        let angle = Math.acos(dot)
        let z = BA.x * BC.y - BC.x * BA.y;
        ctx.fillText(`${i}: dot ${dot.toFixed(2)} angle ${
            toDeg(angle).toFixed(2)}º z=${
            z.toFixed(2)} concave=${
            isConcave(BA, BC)} self_inter=${
            self_intersects
        }`, B.x * scale + 15, B.y * scale)
    }
    // drawAngle(ctx, B, BA, BC, scale, 'green')
    // drawVector(ctx, B, BA, scale, 'green')
    // drawVector(ctx, B, BC, scale, 'green')
    // points.forEach((pt,i) => {
    // })

}


export function drawTriangleList(ctx:CanvasRenderingContext2D, triangles: Triangle[], scale:number) {
    ctx.beginPath()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#14fff8'
    triangles.forEach(tri => {
        tri.lines.forEach((line) => {
            ctx.moveTo(line.A.x * scale, line.A.y * scale)
            ctx.lineTo(line.B.x * scale, line.B.y * scale)
        })
    })
    ctx.stroke()
}

export function drawLinePathOverlay(ctx: CanvasRenderingContext2D, points: Point[], lines:Line[], scale: number) {
    ctx.beginPath()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'magenta'
    points.forEach((pt,i) => {
        if(i === 0) {
            ctx.moveTo(pt.x * scale, pt.y * scale)
        } else {
            ctx.lineTo(pt.x * scale, pt.y * scale)
        }
    })
    ctx.stroke()

    points.forEach(pt => drawDot(ctx,pt,scale,'#0000ff'))

    lines.forEach(line => {
        // console.log("line",line)
        ctx.beginPath()
        ctx.lineWidth = 8
        ctx.strokeStyle = 'cyan'
        ctx.moveTo(line.A.x*scale, line.A.y*scale)
        ctx.lineTo(line.B.x * scale, line.B.y * scale)
        ctx.stroke()

        drawDot(ctx,line.A,scale,'#0000ff')
        drawDot(ctx,line.B,scale,'#0000ff')
        ctx.beginPath()
        let center = lerpPoint(line.A,line.B,0.5)
        if(line.name) {
            ctx.fillStyle = 'white'
            ctx.fillRect(center.x * scale + 10, center.y *scale , 20,10)
            ctx.fillStyle = 'black'
            ctx.fillText(line.name, center.x * scale + 10, center.y * scale + 10)
        }
    })
}

export function drawCurvedPathOverlay(ctx: CanvasRenderingContext2D, path:JPath2D, color:string, scale: number) {
    ctx.beginPath()
    ctx.lineWidth = 3
    ctx.strokeStyle = color
    path.cmds.forEach((cmd) => {
        if(cmd.type === "move-to") {
            ctx.moveTo(cmd.x * scale, cmd.y * scale)
            return
        }
        if(cmd.type === "line-to") {
            ctx.lineTo(cmd.x * scale, cmd.y * scale)
            return
        }
        if(cmd.type === 'bezier-to') {
            ctx.bezierCurveTo(cmd.cp1x*scale, cmd.cp1y*scale,
                cmd.cp2x*scale, cmd.cp2y*scale,
                cmd.x*scale, cmd.y*scale)
            return
        }
        if(cmd.type === 'quadratic-to') {
            ctx.quadraticCurveTo(cmd.cpx*scale, cmd.cpy*scale,
                cmd.x*scale, cmd.y*scale)
            return
        }
        if(cmd.type === 'arc') {
            ctx.arc(cmd.x*scale,cmd.y*scale,cmd.radius*scale, cmd.startAngle, cmd.endAngle)
            return
        }
        if(cmd.type === 'arc-to') {
            ctx.arcTo(cmd.x1*scale, cmd.y1*scale, cmd.x2*scale, cmd.y2*scale, cmd.radius*scale)
            return
        }
        if(cmd.type === 'roundrect') {
            ctx.roundRect(cmd.x * scale, cmd.y * scale, cmd.w * scale, cmd.h * scale, cmd.radii.map(r => r*scale))
            return
        }
        if(cmd.type === 'rect') {
            ctx.rect(cmd.x*scale,cmd.y*scale,cmd.w*scale,cmd.h*scale)
            return
        }
        if(cmd.type === 'ellipse') {
            ctx.ellipse(cmd.x*scale, cmd.y*scale, cmd.radiusX*scale, cmd.radiusY*scale, cmd.rotation, cmd.startAngle, cmd.endAngle)
            return
        }
        console.warn('missed',cmd)
    })
    ctx.stroke()
}

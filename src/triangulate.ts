import {dotProduct, isConcave, Line, Path, Triangle} from "./geom.js";
import {drawAngle, drawDot, drawLine, drawPointsAndAngles, drawVector, fillBG, fillCoordsBG, fillTriangles} from "./debug.js";
import {Point} from "josh_js_util";

function getPoint(points:Point[],i: number) {
    return points[(i + points.length) % points.length]
}

export function pathToTriangles(path:Path):Triangle[] {
    if(path.length < 1) return []
    let points = path.slice()
    let current = 0
    let count = 0
    let tris: Triangle[] = []
    while (true) {
        count++
        // if (count > step) break;
        if(count > 100) break;
        let A = getPoint(points,current)
        let B = getPoint(points,current + 1)
        let C = getPoint(points,current + 2)
        let BA = A.subtract(B)
        let BC = C.subtract(B)
        let dot = dotProduct(BA, BC)

        let trit = Triangle.fromPoints(A, B, C)
        let self_intersects = false
        for (let i = 0; i < path.length; i++) {
            let pt = path[i]
            // console.log("inside ",i,pt,trit.containsPoint(pt))
            if (trit.containsPoint(pt)) {
                self_intersects = true
            }
        }
        // console.log(`${count}: triangle contains part of path?`, self_intersects)
        // console.log(`TRI ${count} is`, trit.toString())

        if (isConcave(BA, BC) && !self_intersects) {
            tris.push(Triangle.fromPoints(A, B, C))
            // remove middle point from the list
            points.splice(current + 1, 1)
        } else {
            // console.log(`skipping convex or self inter: ${count} `, A, B, C, self_intersects)
            current += 1
        }
        // if (count == step) {
        //     drawAngle(ctx, B, BA, BC, scale, 'green')
        //     drawVector(ctx, B, BA, scale, 'green')
        //     drawVector(ctx, B, BC, scale, 'green')
        // }
        if (points.length <= 2) {
            // console.log("completely done")
            break
        }
    }
    return tris
}

export function renderPathToTriangles(canvas: HTMLCanvasElement, path: Path, step: number) {
    let scale = 30
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    fillBG(ctx, canvas, 'white')
    fillCoordsBG(ctx, canvas, scale, '#ccc')
    path.forEach(pt => drawDot(ctx, pt, scale, '#ccc'))
    for (let i = 0; i < path.length; i++) {
        let i_next = (i + 1) % path.length
        let line = new Line(path[i], path[i_next])
        drawLine(ctx, line, scale, 'cyan')
    }


    //for each set of three angles


    const tris = pathToTriangles(path)

    fillTriangles(ctx, tris, scale,'green')
    drawPointsAndAngles(ctx, path, scale)

}

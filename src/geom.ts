import {Point} from "josh_js_util";

export class Line {
    A: Point;
    B: Point;
    name: string | undefined

    constructor(A: Point, B: Point, name?: string) {
        this.A = A
        this.B = B
        this.name = name
    }

    edge(P: Point) {
        return (P.x - this.A.x) * (this.B.y - this.A.y) - (P.y - this.A.y) * (this.B.x - this.A.x)
    }
    toString() {
        return `Line ${this.A} -> ${this.B}`
    }

    intersectLine(L: Line):Point {
        if(this.length() == 0) throw new Error("zero length line")
        if(L.length() == 0) throw new Error("zero length line")
        const denominator = ((L.B.y - L.A.y) * (this.B.x-this.A.x) - (L.B.x-L.A.x)*(this.B.y-this.A.y))
        if(denominator === 0) {
            throw new Error("lines are parallel")
        }
        let ua = ((L.B.x - L.A.x) * (this.A.y - L.A.y) - (L.B.y - L.A.y)*(this.A.x - L.A.x)) / denominator
        let ub = ((this.B.x - this.A.x) * (this.A.y - L.A.y) - (this.B.y - this.A.y) * (this.A.x - L.A.x)) / denominator

        let x = this.A.x + ua * (this.B.x - this.A.x)
        let y = this.A.y + ub * (this.B.y - this.A.y)
        return new Point(x,y)
    }

    private length() {
        return this.B.subtract(this.A).magnitude()
    }
}

export class Triangle {
    lines: Line[];

    constructor(line: Line, line2: Line, line3: Line) {
        this.lines = [line, line2, line3]
    }

    containsPoint(point: Point): boolean {
        let edges = this.lines.map(line => line.edge(point))
        if (edges[0] < 0 && edges[1] < 0 && edges[2] < 0) {
            return true
        } else {
            return false
        }
    }

    toString(): string {
        return `Triangle(${this.lines.map(l => l.A).map(p => `${p.x},${p.y}`).join(", ")})`
    }

    static fromPoints(A: Point, B: Point, C: Point) {
        return new Triangle(
            new Line(A, B),
            new Line(B, C),
            new Line(C, A)
        )
    }
}

export function toDeg(angle: number) {
    return angle * 180 / Math.PI
}

export function dotProduct(v1: Point, v2: Point) {
    v1 = v1.unit()
    v2 = v2.unit()
    let dot = (v1.x * v2.x) + (v1.y * v2.y)
    // console.log("dot of",v1,v2, 'is',dot)
    return dot
}

export function isConcave(BA: Point, BC: Point) {
    let dot = dotProduct(BA, BC)
    let angle = Math.acos(dot)
    let z = BA.x * BC.y - BC.x * BA.y;
    return (z < 0)
}

export type Path = Point[]


export function calcQuadraticAtT(p: Point[], t: number) {
    const x =
        (1 - t) * (1 - t) * p[0].x + 2 * (1 - t) * t * p[1].x + t * t * p[2].x;
    const y =
        (1 - t) * (1 - t) * p[0].y + 2 * (1 - t) * t * p[1].y + t * t * p[2].y;
    return new Point(x, y);
}

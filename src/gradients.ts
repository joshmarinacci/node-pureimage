import {Point} from './point.js';
import {fromBytesBigEndian, getBytesBigEndian} from './uint32.js';
import {clamp, colorStringToUint32, lerp} from './util.js';

export class CanvasGradient {
    public stops: { color: number; t: number }[];
    constructor() {
        this.stops = [];
    }
    addColorStop(
        t: number,
        colorstring: number,
    ) {
        const color = colorStringToUint32('' + colorstring);
        this.stops.push({t:t,color:color});
    }
    protected _lerpStops(
        t: number
    ) {
        const first = getBytesBigEndian(this.stops[0].color).map(b=>b/255);
        const second = getBytesBigEndian(this.stops[1].color).map(b=>b/255);
        const fc = first.map((f,i) => lerp(f,second[i],t)).map(c=>c*255);
        return fromBytesBigEndian(fc[0],fc[1],fc[2],0xFF);
    }
}

export class LinearGradient extends CanvasGradient {
    public start: Point;
    public end: Point;
    constructor(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
    ) {
        super();
        this.start = new Point(x0,y0);
        this.end = new Point(x1,y1);
    }

    colorAt(
        x: number,
        y: number,
    ) {
        const pc = new Point(x,y); //convert to a point
        //calculate V
        let V = this.end.subtract(this.start); // subtract
        const d = V.magnitude(); // get magnitude
        V = V.divide(d); // normalize

        //calculate V0
        const V0 = pc.subtract(this.start);
        //project V0 onto V
        let t = V0.dotProduct(V);
        //convert to t value and clamp
        t = clamp(t/d,0,1);
        return this._lerpStops(t);
    }
}


export class RadialGradient extends CanvasGradient {
    public start: Point;
    constructor(
        x0: number,
        y0: number,
        _x1?: undefined,
        _y1?: undefined,
    ) {
        super();
        this.start = new Point(x0,y0);
    }

    colorAt(
        x: number,
        y: number,
    ) {
        const pc = new Point(x, y); //convert to a point
        const dist =  pc.distance(this.start);
        const t = clamp(dist/10,0,1);
        return this._lerpStops(t);
    }
}

function remap(val: number, smin: number, smax: number, omin: number, omax: number) {
    // map into range of 0 to 1
    let t= (val-smin)/(smax-smin)
    // map into new range
    return (t * (omax - omin)) + omin
}

export class ConicalGradient extends CanvasGradient {
    private angle: number;
    private start: Point;
    constructor(angle:number, x0:number, y0:number) {
        super();
        this.angle = angle
        this.start = new Point(x0,y0)
    }
    colorAt(
        x: number,
        y: number,
    ) {
        const pt = this.start.subtract(new Point(x, y))
        let ang = Math.atan2(pt.y,pt.x) - this.angle
        //ang is -1 to 1. remap into the range of 0 to 1
        //ang i -PI to Pi
        const t = remap(ang, -Math.PI, Math.PI, 0, 1)
        // if(y == 25)  console.log(x,y,ang, toDeg(ang), remap(ang, -Math.PI, Math.PI, 0, 1))
        return this._lerpStops(t);
    }
}

export type ColorGradient = RadialGradient | LinearGradient | ConicalGradient;

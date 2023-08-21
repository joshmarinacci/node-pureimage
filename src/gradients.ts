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
        if(t < 0) t += 1.0
        if(t > 1) t -= 1.0
        // find the stops that T is inbetween
        let start = this.stops.slice().reverse().find(stop => stop.t <= t)
        let end = this.stops.find(stop => stop.t > t)
        if(!end) end = this.stops.at(-1)

        // calculate relative T between those stops
        let rt = remap(t, start.t, end.t, 0, 1)

        // convert colors to components, 0->1
        const intToRGBA = (int:number) => {
            return getBytesBigEndian(int).map(b => b/255)
        }
        const rgba_start = intToRGBA(start.color)
        const rgba_end = intToRGBA(end.color)

        //lerp the final color
        const final_color = rgba_start.map((c,i) => lerp(c,rgba_end[i],rt));

        // console.log(`t = ${t.toFixed(3)} tt = ${rt.toFixed(3)} color ${rgba_start}, ${rgba_end} -> ${final_color.map(v => v.toFixed(2))}`)

        // convert back to bytes, force alpha to 100%
        const RGBAToInt = (rgba:number[]) => {
            const fc = rgba.map(c => c*255)
            return fromBytesBigEndian(fc[0],fc[1],fc[2],0xff)
        }
        return RGBAToInt(final_color)
        // const fc = final_color.map(c => c*255)
        // return fromBytesBigEndian(fc[0],fc[1],fc[2],0xff)
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
        const t = remap(ang, -Math.PI, Math.PI, 0, 1)
        return this._lerpStops(t);
    }
}

export type ColorGradient = RadialGradient | LinearGradient | ConicalGradient;

import Point from './Point';
export declare class CanvasGradient {
    stops: {
        t: number;
        color: number;
    }[];
    constructor();
    addColorStop(t: number, colorstring: string): void;
    _lerpStops(t: number): number;
}
export declare class LinearGradient extends CanvasGradient {
    start: Point;
    end: Point;
    constructor(x0: number, y0: number, x1: number, y1: number);
    colorAt(x: number, y: number): number;
}
export declare class RadialGradient extends CanvasGradient {
    start: Point;
    constructor(x0: number, y0: number);
    colorAt(x: number, y: number): number;
}

import { Point } from './point.js';

export class CanvasGradient {
    stops: { color: number; t: number }[];
    constructor();

    addColorStop(t: number, colorstring: string): void;

    private _lerpStops(t: number): number;
}

export class LinearGradient extends CanvasGradient {
    start: Point;
    end: Point;

    constructor(x0: number, y0: number, x1: number, y1: number);

    colorAt(x: number, y: number): number;
}

export class RadialGradient extends CanvasGradient {
    start: Point;
    constructor(x0: number, y0: number, x1: any, y1: any);

    colorAt(x: number, y: number): number;
}

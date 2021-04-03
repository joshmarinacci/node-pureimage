//transform code from https://github.com/kcmoot/transform-tracker/blob/master/transform-tracker.js

/*
 * Transform tracker
 *
 * @author Kevin Moot <kevin.moot@gmail.com>
 * Based on a class created by Simon Sarris - www.simonsarris.com - sarris@acm.org
 */

import { Context } from './context.js';
import { Point } from './point.js';
type Matrix = number[];
/**
 * @ignore
 */
export class Transform {
    context: Context;
    matrix: Matrix;
    stack: Matrix[];
    private m: Matrix;
    constructor(context: Context);
    //==========================================
    // Constructor, getter/setter
    //==========================================
    setContext(context: Context): void;

    getMatrix(): Matrix;

    setMatrix(m: Matrix): void;

    cloneMatrix(m: Matrix): Matrix;

    cloneTransform(): Transform;

    //==========================================
    // Stack
    //==========================================
    save(): void;

    restore(): void;

    //==========================================
    // Matrix
    //==========================================
    setTransform(): void;

    translate(x: number, y: number): void;

    rotate(rad: number): void;

    scale(sx: number, sy: number): void;

    //==========================================
    // Matrix extensions
    //==========================================
    rotateDegrees(deg: number): void;

    rotateAbout(rad: number, x: number, y: number): void;

    rotateDegreesAbout(deg: number, x: number, y: number): void;

    identity(): void;

    multiply(matrix: Matrix): void;

    invert(): void;
    //==========================================
    // Helpers
    //==========================================
    transformPoint(pt: Point): Point;
}

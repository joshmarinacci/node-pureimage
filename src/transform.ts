//transform code from https://github.com/kcmoot/transform-tracker/blob/master/transform-tracker.js

/*
 * Transform tracker
 *
 * @author Kevin Moot <kevin.moot@gmail.com>
 * Based on a class created by Simon Sarris - www.simonsarris.com - sarris@acm.org
 */

import {Point} from './point.js'

export type Matrix = [number,number,number,number,number,number];
const IDENTITY_MATRIX:Matrix = [1,0,0,1,0,0];

export class Transform {
    private matrix: Matrix
    private stack: Matrix[];
    private context:Transform|undefined
    constructor(context?:Transform) {
        this.context = context;
        this.matrix = [1,0,0,1,0,0]; //initialize with the identity matrix
        this.stack = [];
    }

    getMatrix():Matrix {
        return this.matrix
    }
    setMatrix(m:Matrix) {
        this.matrix = [m[0],m[1],m[2],m[3],m[4],m[5]];
        this.setTransform();
    }
    cloneMatrix(m:Matrix):Matrix {
        return [m[0],m[1],m[2],m[3],m[4],m[5]];
    }
    cloneTransform() {
        let trans = new Transform()
        trans.setMatrix(this.getMatrix())
        return trans
    }

    identity() {
        this.matrix = IDENTITY_MATRIX
        this.setTransform();
    };
    isIdentity() {
        for(let i=0; i<this.matrix.length; i++) {
            if(this.matrix[i] !== IDENTITY_MATRIX[i]) return false
        }
        return true
    }

    fromDomMatrix(dom):Matrix {
        return [dom.a,dom.b,dom.c,dom.d,dom.e,dom.f]
    }
    asDomMatrix() {
        return {
            is2D:true,
            isIdentity:false,
            a:this.matrix[0],
            b:this.matrix[1],
            c:this.matrix[2],
            d:this.matrix[3],
            e:this.matrix[4],
        }
    }
    multiply(matrix:Matrix) {
        const m11 = this.matrix[0] * matrix[0] + this.matrix[2] * matrix[1]
        const m12 = this.matrix[1] * matrix[0] + this.matrix[3] * matrix[1]

        const m21 = this.matrix[0] * matrix[2] + this.matrix[2] * matrix[3]
        const m22 = this.matrix[1] * matrix[2] + this.matrix[3] * matrix[3]

        const dx = this.matrix[0] * matrix[4] + this.matrix[2] * matrix[5] + this.matrix[4]
        const dy = this.matrix[1] * matrix[4] + this.matrix[3] * matrix[5] + this.matrix[5]

        this.matrix[0] = m11;
        this.matrix[1] = m12;
        this.matrix[2] = m21;
        this.matrix[3] = m22;
        this.matrix[4] = dx;
        this.matrix[5] = dy;
        this.setTransform();
    };
    invert() {
        const d = 1 / (this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2])
        const m0 = this.matrix[3] * d
        const m1 = -this.matrix[1] * d
        const m2 = -this.matrix[2] * d
        const m3 = this.matrix[0] * d
        const m4 = d * (this.matrix[2] * this.matrix[5] - this.matrix[3] * this.matrix[4])
        const m5 = d * (this.matrix[1] * this.matrix[4] - this.matrix[0] * this.matrix[5])
        this.matrix[0] = m0;
        this.matrix[1] = m1;
        this.matrix[2] = m2;
        this.matrix[3] = m3;
        this.matrix[4] = m4;
        this.matrix[5] = m5;
        this.setTransform();
    };

    save() {
        let matrix = this.cloneMatrix(this.getMatrix());
        this.stack.push(matrix);
        if (this.context) this.context.save();
    }
    restore() {
        if (this.stack.length > 0) {
            let matrix = this.stack.pop();
            this.setMatrix(matrix);
        }

        if (this.context) this.context.restore();
    };

    setTransform() {
        if (this.context) {
            // this.context.setTransform(
            //     this.matrix[0],
            //     this.matrix[1],
            //     this.matrix[2],
            //     this.matrix[3],
            //     this.matrix[4],
            //     this.matrix[5]
            // );
        }
    };


    translate(x:number,y:number) {
        this.matrix[4] += this.matrix[0] * x + this.matrix[2] * y;
        this.matrix[5] += this.matrix[1] * x + this.matrix[3] * y;
        this.setTransform();
    }
    rotate(rad:number) {
        const c = Math.cos(rad)
        const s = Math.sin(rad)
        const m11 = this.matrix[0] * c + this.matrix[2] * s
        const m12 = this.matrix[1] * c + this.matrix[3] * s
        const m21 = this.matrix[0] * -s + this.matrix[2] * c
        const m22 = this.matrix[1] * -s + this.matrix[3] * c
        this.matrix[0] = m11;
        this.matrix[1] = m12;
        this.matrix[2] = m21;
        this.matrix[3] = m22;

        this.setTransform();
    };
    scale(sx:number, sy:number) {
        this.matrix[0] *= sx;
        this.matrix[1] *= sx;
        this.matrix[2] *= sy;
        this.matrix[3] *= sy;
        this.setTransform();
    };


    // HELPERS
    transformPoint(pt:Point) {
        const x = pt.x
        const y = pt.y
        return new Point(
            x * this.matrix[0] + y * this.matrix[2] + this.matrix[4],
            x * this.matrix[1] + y * this.matrix[3] + this.matrix[5],
        )
    }

}

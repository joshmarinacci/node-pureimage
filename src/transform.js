//transform code from https://github.com/kcmoot/transform-tracker/blob/master/transform-tracker.js


/*
 * Transform tracker
 *
 * @author Kevin Moot <kevin.moot@gmail.com>
 * Based on a class created by Simon Sarris - www.simonsarris.com - sarris@acm.org
 */

"use strict";
import {Point} from './point.js'

/**
 * @ignore
 */
export function Transform(context) {
    this.context = context;
    this.matrix = [1,0,0,1,0,0]; //initialize with the identity matrix
    this.stack = [];

    //==========================================
    // Constructor, getter/setter
    //==========================================

    this.setContext = function(context) {
        this.context = context;
    };

    this.getMatrix = function() {
        return this.matrix;
    };

    this.setMatrix = function(m) {
        this.matrix = [m[0],m[1],m[2],m[3],m[4],m[5]];
        this.setTransform();
    };

    this.cloneMatrix = function(m) {
        return [m[0],m[1],m[2],m[3],m[4],m[5]];
    };

    this.cloneTransform = function() {
        let trans = new Transform()
        trans.setMatrix(this.getMatrix())
        return trans
    }

    this.asDomMatrix = function() {
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
    this.fromDomMatrix = function(dom) {
        return [dom.a,dom.b,dom.c,dom.d,dom.e,dom.f]
    }


    //==========================================
    // Stack
    //==========================================

    this.save = function() {
        let matrix = this.cloneMatrix(this.getMatrix());
        this.stack.push(matrix);

        if (this.context) this.context.save();
    };

    this.restore = function() {
        if (this.stack.length > 0) {
            let matrix = this.stack.pop();
            this.setMatrix(matrix);
        }

        if (this.context) this.context.restore();
    };

    //==========================================
    // Matrix
    //==========================================

    this.setTransform = function() {
        if (this.context) {
            this.context.setTransform(
                this.matrix[0],
                this.matrix[1],
                this.matrix[2],
                this.matrix[3],
                this.matrix[4],
                this.matrix[5]
            );
        }
    };

    this.translate = function(x, y) {
        this.matrix[4] += this.matrix[0] * x + this.matrix[2] * y;
        this.matrix[5] += this.matrix[1] * x + this.matrix[3] * y;

        this.setTransform();
    };

    this.rotate = function(rad) {
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

    this.scale = function(sx, sy) {
        this.matrix[0] *= sx;
        this.matrix[1] *= sx;
        this.matrix[2] *= sy;
        this.matrix[3] *= sy;

        this.setTransform();
    };

    //==========================================
    // Matrix extensions
    //==========================================

    this.rotateDegrees = function(deg) {
        const rad = deg * Math.PI / 180
        this.rotate(rad);
    };

    this.rotateAbout = function(rad, x, y) {
        this.translate(x, y);
        this.rotate(rad);
        this.translate(-x, -y);
        this.setTransform();
    }

    this.rotateDegreesAbout = function(deg, x, y) {
        this.translate(x, y);
        this.rotateDegrees(deg);
        this.translate(-x, -y);
        this.setTransform();
    }

    this.identity = function() {
        this.m = [1,0,0,1,0,0];
        this.setTransform();
    };

    this.multiply = function(matrix) {
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

    this.invert = function() {
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

     //==========================================
    // Helpers
    //==========================================

    this.transformPoint = function(pt) {
        const x = pt.x
        const y = pt.y
        return new Point(
            x * this.matrix[0] + y * this.matrix[2] + this.matrix[4],
            x * this.matrix[1] + y * this.matrix[3] + this.matrix[5],
        )
    };
}


//transform code from https://github.com/kcmoot/transform-tracker/blob/master/transform-tracker.js

/*
 * Transform tracker
 *
 * @author Kevin Moot <kevin.moot@gmail.com>
 * Based on a class created by Simon Sarris - www.simonsarris.com - sarris@acm.org
 */

"use strict";

import Context from './context';

type IMatrix = [number, number, number, number, number, number]

export class Transform
{
	context: Transform;
	matrix: IMatrix = [1, 0, 0, 1, 0, 0];
	m?: IMatrix;
	stack: IMatrix[] = [];

	constructor(context?: Transform)
	{
		this.context = context;
	}

	//==========================================
	// Constructor, getter/setter
	//==========================================

	setContext(context: Transform)
	{
		this.context = context;
	};

	getMatrix(): IMatrix
	{
		return this.matrix as IMatrix;
	};

	setMatrix(m: IMatrix)
	{
		this.matrix = [m[0], m[1], m[2], m[3], m[4], m[5]];
		this.setTransform();
	};

	cloneMatrix(m: IMatrix): IMatrix
	{
		return [m[0], m[1], m[2], m[3], m[4], m[5]];
	};

	//==========================================
	// Stack
	//==========================================

	save()
	{
		let matrix = this.cloneMatrix(this.getMatrix());
		this.stack.push(matrix);

		if (this.context) this.context.save();
	};

	restore()
	{
		if (this.stack.length > 0)
		{
			let matrix = this.stack.pop();
			this.setMatrix(matrix);
		}

		if (this.context) this.context.restore();
	};

	//==========================================
	// Matrix
	//==========================================

	setTransform()
	{
		if (this.context)
		{
			this.context.setTransform(
				this.matrix[0],
				this.matrix[1],
				this.matrix[2],
				this.matrix[3],
				this.matrix[4],
				this.matrix[5],
			);
		}
	};

	translate(x: number, y: number)
	{
		this.matrix[4] += this.matrix[0] * x + this.matrix[2] * y;
		this.matrix[5] += this.matrix[1] * x + this.matrix[3] * y;

		this.setTransform();
	};

	rotate(rad: number)
	{
		let c = Math.cos(rad);
		let s = Math.sin(rad);
		let m11 = this.matrix[0] * c + this.matrix[2] * s;
		let m12 = this.matrix[1] * c + this.matrix[3] * s;
		let m21 = this.matrix[0] * -s + this.matrix[2] * c;
		let m22 = this.matrix[1] * -s + this.matrix[3] * c;
		this.matrix[0] = m11;
		this.matrix[1] = m12;
		this.matrix[2] = m21;
		this.matrix[3] = m22;

		this.setTransform();
	};

	scale(sx: number, sy: number)
	{
		this.matrix[0] *= sx;
		this.matrix[1] *= sx;
		this.matrix[2] *= sy;
		this.matrix[3] *= sy;

		this.setTransform();
	};

	//==========================================
	// Matrix extensions
	//==========================================

	rotateDegrees(deg: number)
	{
		let rad = deg * Math.PI / 180;
		this.rotate(rad);
	};

	rotateAbout(rad: number, x: number, y: number)
	{
		this.translate(x, y);
		this.rotate(rad);
		this.translate(-x, -y);
		this.setTransform();
	}

	rotateDegreesAbout(deg: number, x: number, y: number)
	{
		this.translate(x, y);
		this.rotateDegrees(deg);
		this.translate(-x, -y);
		this.setTransform();
	}

	identity()
	{
		this.m = [1, 0, 0, 1, 0, 0];
		this.setTransform();
	};

	multiply(matrix: {
		m: IMatrix
	})
	{
		let m11 = this.matrix[0] * matrix.m[0] + this.matrix[2] * matrix.m[1];
		let m12 = this.matrix[1] * matrix.m[0] + this.matrix[3] * matrix.m[1];

		let m21 = this.matrix[0] * matrix.m[2] + this.matrix[2] * matrix.m[3];
		let m22 = this.matrix[1] * matrix.m[2] + this.matrix[3] * matrix.m[3];

		let dx = this.matrix[0] * matrix.m[4] + this.matrix[2] * matrix.m[5] + this.matrix[4];
		let dy = this.matrix[1] * matrix.m[4] + this.matrix[3] * matrix.m[5] + this.matrix[5];

		this.matrix[0] = m11;
		this.matrix[1] = m12;
		this.matrix[2] = m21;
		this.matrix[3] = m22;
		this.matrix[4] = dx;
		this.matrix[5] = dy;
		this.setTransform();
	};

	invert()
	{
		let d = 1 / (this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2]);
		let m0 = this.matrix[3] * d;
		let m1 = -this.matrix[1] * d;
		let m2 = -this.matrix[2] * d;
		let m3 = this.matrix[0] * d;
		let m4 = d * (this.matrix[2] * this.matrix[5] - this.matrix[3] * this.matrix[4]);
		let m5 = d * (this.matrix[1] * this.matrix[4] - this.matrix[0] * this.matrix[5]);
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

	transformPoint(pt: {
		x: number,
		y: number,
	})
	{
		const { x, y } = pt;
		return {
			x: x * this.matrix[0] + y * this.matrix[2] + this.matrix[4],
			y: x * this.matrix[1] + y * this.matrix[3] + this.matrix[5],
		};
	}
}

/**
 * Represents a set of co-ordinates on a 2D plane
 *
 * @class Point
 */
export class Point implements IPoint
{

	x: number;
	y: number;

	/**
	 * Creates an instance of Point.
	 * @param {number} x X position
	 * @param {number} y Y position
	 *
	 * @memberof Point
	 */
	constructor(x: number, y: number)
	{
		/**
		 * @type {number}
		 */
		this.x = x;

		/**
		 * @type {number}
		 */
		this.y = y;
	}

	distance(pt: IPoint)
	{
		return Math.sqrt(
			Math.pow(pt.x - this.x, 2) +
			Math.pow(pt.y - this.y, 2),
		)
	}

	subtract(pt: IPoint)
	{
		return new Point(this.x - pt.x, this.y - pt.y)
	}

	magnitude()
	{
		return Math.sqrt(this.dotProduct(this))
	}

	dotProduct(v: IPoint)
	{
		return this.x * v.x + this.y * v.y
	}

	divide(scalar: number)
	{
		return new Point(this.x / scalar, this.y / scalar)
	}
}

export interface IPoint
{
	x: number;
	y: number;
}

export default Point;

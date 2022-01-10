export class Point {
    /**
     * Creates an instance of Point.
     * @param {number} x X position
     * @param {number} y Y position
     *
     * @memberof Point
     */
    constructor (x, y) {
        /**
         * @type {number}
         */
        this.x = x;

        /**
         * @type {number}
         */
        this.y = y;
    }

    distance(pt) {
        return Math.sqrt(
            Math.pow(pt.x-this.x,2)+
            Math.pow(pt.y-this.y,2)
        )
    }

    unit(pt) {
        return this.divide(this.magnitude())
    }

    subtract(pt) {
        return new Point(this.x-pt.x, this.y-pt.y)
    }
    add(pt) {
        return new Point(this.x+pt.x, this.y+pt.y)
    }

    magnitude() {
        return Math.sqrt(this.dotProduct(this))
    }

    dotProduct(v) {
        return this.x*v.x + this.y*v.y
    }

    divide(scalar) {
        return new Point(this.x/scalar, this.y/scalar)
    }

    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y))
    }
    round() {
        return new Point(Math.round(this.x), Math.round(this.y))
    }

    rotate(theta) {
        return new Point(
            Math.cos(theta)*this.x - Math.sin(theta)*this.y,
            Math.sin(theta)*this.x + Math.cos(theta)*this.y
        )
    }
    scale(scalar) {
        return new Point(
            this.x*scalar,
            this.y*scalar
        )
    }
}

const l = (...args) => console.log(...args)
const toRad = (deg) => Math.PI/180*deg

let AB = new Point(10,10)
l('ab',AB)
let ORIGIN = new Point(0,0)
l('origin',ORIGIN)
let uAB = ORIGIN.subtract(AB).unit()
l("uAB",uAB)
let uBC = uAB.rotate(toRad(90))
l("uBC",uBC)
let uBCs = uBC.scale(5)
l("scaled",uBCs)
let fuBCS = uBCs.add(AB)
l("final",fuBCS)

let fuBDS = uAB.rotate(toRad(-90)).scale(5).add(AB)
l('other final',fuBDS)


function project(A,B,scale) {
    let delta_unit = A.subtract(B).unit()
    let C_unit = delta_unit.rotate(toRad(90))
    let D_unit = delta_unit.rotate(toRad(-90))
    return [
        C_unit.scale(scale).add(B),
        D_unit.scale(scale).add(B)
    ]
}

l("test two",project(new Point(0,0),new Point(10,10),5))
l("test two",project(new Point(10,10),new Point(20,20),5))
l('test two',project(new Point(20,20),new Point(30,20),5))

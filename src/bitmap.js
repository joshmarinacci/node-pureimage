const uint32 = require('./uint32');
const Context = require('./context');

/**
 * Bitmap
 * 
 * @class Bitmap
 */
class Bitmap {

    /**
     * Creates an instance of Bitmap.
     * @param {number} w Width
     * @param {number} h Height
     * @param {any} options Currently unused
     * @memberof Bitmap
     */
    constructor(w,h, options) {
        
        /**
         * @type {number}
         */
        this.width = Math.floor(w);
        
        /**
         * @type {number}
         */
        this.height = Math.floor(h);
        
        /**
         * @type {ArrayBuffer}
         */
        this.data = Buffer.alloc(w*h*4);

        var fillval = 0x000000FF;
        for(var j=0; j<h; j++) {
            for (var i = 0; i < w; i++) {
                this.setPixelRGBA(i, j, fillval);
            }
        }

    }

    /**
     * Calculate Index
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {number}
     * 
     * @memberof Bitmap
     */
    calculateIndex (x,y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x<0 || y<0 || x >= this.width || y >= this.height) return 0;
        return (this.width*y+x)*4;
    }

    /**
     * Set Pixel RGBA
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} rgba The source to be extracted
     * 
     * @returns {void}
     * 
     * @memberof Bitmap
     */
    setPixelRGBA(x,y,rgba) {
        let i = this.calculateIndex(x, y);
        const bytes = uint32.getBytesBigEndian(rgba);
        this.data[i+0] = bytes[0];
        this.data[i+1] = bytes[1];
        this.data[i+2] = bytes[2];
        this.data[i+3] = bytes[3];
    }

    /**
     * Set Pixel RGBA_i
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} r Red level
     * @param {number} g Green level
     * @param {number} b Blue level
     * @param {number} a Alpha level
     * 
     * @returns {void}
     * 
     * @memberof Bitmap
     */
    setPixelRGBA_i(x,y,r,g,b,a) {
        let i = this.calculateIndex(x, y);
        this.data[i+0] = r;
        this.data[i+1] = g;
        this.data[i+2] = b;
        this.data[i+3] = a;
    }

    /**
     * Get Pixel RGBA
     * 
     * @param {number} x X potiion
     * @param {number} y Y position
     * 
     * @returns {number}
     * 
     * @memberof Bitmap
     */
    getPixelRGBA(x,y) {
        let i = this.calculateIndex(x, y);
        return uint32.fromBytesBigEndian(
            this.data[i+0],
            this.data[i+1],
            this.data[i+2],
            this.data[i+3]);
    }

    /**
     * Get Pixel RGBA Seperate
     * 
     * @param {number} x X position
     * @param {number} y Y position
     * 
     * @returns {void}
     * 
     * @memberof Bitmap
     */
    getPixelRGBA_separate(x,y) {
        var i = this.calculateIndex(x,y);
        return this.data.slice(i,i+4);
    }

    /**
     * Get Context
     * Get a new {Context} object for the current bitmap object
     * 
     * @returns {Context}
     * 
     * @memberof Bitmap
     */
    getContext() {
        return new Context(this);
    }
}
module.exports = Bitmap;

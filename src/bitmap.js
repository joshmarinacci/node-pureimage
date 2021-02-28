const Context      = require('./context');
const NAMED_COLORS = require('./named_colors');
const uint32       = require('./uint32');

/**
 * The Bitmap class is used for direct pixel manipulation(for example setting a pixel colour,
 * transparency etc). It also provides a factory method for creating new instances of
 * {@link Context}
 *
 * @class Bitmap
 */
class Bitmap {

    /**
     * Creates an instance of Bitmap.
     * @param {number} w      Width
     * @param {number} h      Height
     * @param {any}   options Currently unused
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

        const fillval = NAMED_COLORS.transparent
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
     * Set the RGBA(Red, Green, Blue, Alpha) values on an individual pixel level
     *
     * @param {number} x    X axis position
     * @param {number} y    Y axis position
     * @param {number} rgba A hex representation of the RGBA value of the pixel. See {@link NAMED_COLORS} for examples
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
     * Set the individual red, green, blue and alpha levels of an individual pixel
     *
     * @param {number} x X axis position
     * @param {number} y Y axis position
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
     * Get the RGBA value of an individual pixel as a hexadecimal number(See {@link NAMED_COLORS} for examples)
     *
     * @param {number} x X axis potiion
     * @param {number} y Y axis position
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
     * Get the bilinear interpolated RGBA value at a given pixel position and returns it as a hexadecimal number(See {@link NAMED_COLORS} for examples)
     *
     * @param {number} x fractional X axis potiion
     * @param {number} y fractional Y axis position
     *
     * @returns {number}
     *
     * @memberof Bitmap
     */
    getPixelRGBA_bilinear(x,y) {
        let floorx = Math.floor(x), 
            floory = Math.floor(y),
            fractx = x-floorx, 
            fracty = y-floory,

            i00 = this.calculateIndex(floorx, floory),
            i01 = this.calculateIndex(floorx, Math.min(this.height-1,floory+1)),
            i10 = this.calculateIndex(Math.min(this.width-1,floorx+1), floory),
            i11 = this.calculateIndex(Math.min(this.width-1,floorx+1), Math.min(this.height-1,floory+1)),
            
            r00 = this.data[i00],   r01 = this.data[i01],   r10 = this.data[i10],   r11 = this.data[i11],
            g00 = this.data[i00+1], g01 = this.data[i01+1], g10 = this.data[i10+1], g11 = this.data[i11+1],
            b00 = this.data[i00+2], b01 = this.data[i01+2], b10 = this.data[i10+2], b11 = this.data[i11+2],
            a00 = this.data[i00+3], a01 = this.data[i01+3], a10 = this.data[i10+3], a11 = this.data[i11+3];

            r00 += (r01-r00)*fracty; r10 += (r11-r10)*fracty; r00 += (r10-r00)*fractx;
            g00 += (g01-g00)*fracty; g10 += (g11-g10)*fracty; g00 += (g10-g00)*fractx;
            b00 += (b01-b00)*fracty; b10 += (b11-b10)*fracty; b00 += (b10-b00)*fractx;
            a00 += (a01-a00)*fracty; a10 += (a11-a10)*fracty; a00 += (a10-a00)*fractx;

        return uint32.fromBytesBigEndian(r00,g00,b00,a00);
    }

    /**
     * Get Pixel RGBA Seperate
     *
     * @param {number} x X axis position
     * @param {number} y Y axis position
     *
     * @ignore
     *
     * @returns {Array}
     *
     * @memberof Bitmap
     */
    getPixelRGBA_separate(x,y) {
        var i = this.calculateIndex(x,y);
        return this.data.slice(i,i+4);
    }

    /**
     * {@link Context} factory. Creates a new {@link Context} instance object for the current bitmap object
     *
     * @returns {Context}
     *
     * @memberof Bitmap
     */
    getContext() {
        return new Context(this);
    }

    _copySubBitmap(x,y,w,h) {
        let dst = new Bitmap(w,h)
        for(let i=0; i<w; i++) {
            for(let j=0; j<h; j++) {
                let indexA = this.calculateIndex(x+i,y+j)
                let indexB = dst.calculateIndex(i,j)
                for(let k=0; k<4; k++) {
                    dst.data[indexB+k] = this.data[indexA+k]
                }
            }
        }
        return dst
    }

    _pasteSubBitmap(src,x,y) {
        for(let i=0; i<src.width; i++) {
            for(let j=0; j<src.height; j++) {
                let indexA = this.calculateIndex(x+i,y+j)
                let indexB = src.calculateIndex(i,j)
                for(let k=0; k<4; k++) {
                    this.data[indexA+k] = src.data[indexB+k]
                }
            }
        }
    }

}
module.exports = Bitmap;

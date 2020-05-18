const Bitmap = require('./bitmap');
const fs     = require('fs');
const JPEG   = require('jpeg-js');
const PNG_LIB    = require('pngjs')
const PNG = PNG_LIB.PNG;
const text   = require('./text');
const uint32 = require('./uint32');

/**
 * Create a new bitmap image
 *
 * @param {number} w       Image width
 * @param {number} h       Image height
 * @param {object} options Options to be passed to {@link Bitmap}
 *
 * @returns {Bitmap}
 */
exports.make = function(w,h,options) {
    return new Bitmap(w,h,options);
};

/**
 * Encode the PNG image to output stream
 *
 * @param {Bitmap} bitmap    An instance of {@link Bitmap} to be encoded to PNG, `bitmap.data` must be a buffer of raw PNG data
 * @param {Stream} outstream The stream to write the PNG file to
 *
 * @returns {Promise<void>}
 */
exports.encodePNGToStream = function(bitmap, outstream) {
    return new Promise((res,rej)=>{
        if(!bitmap.hasOwnProperty('data') || !bitmap.hasOwnProperty('width') || !bitmap.hasOwnProperty('height')) {
            rej(new TypeError('Invalid bitmap image provided'));
        }
        var png = new PNG({
            width:bitmap.width,
            height:bitmap.height
        });

        for(var i=0; i<bitmap.width; i++) {
            for(var j=0; j<bitmap.height; j++) {
                var rgba = bitmap.getPixelRGBA(i,j);
                var n = (j*bitmap.width+i)*4;
                var bytes = uint32.getBytesBigEndian(rgba);
                for(var k=0; k<4; k++) {
                    png.data[n+k] = bytes[k];
                }
            }
        }

        png
            .on('error', (err) => { rej(err); })
            .pack()
            .pipe(outstream)
            .on('finish', () => { res(); })
            .on('error', (err) => { rej(err); });
    });
}

/**
 * Encode JPEG To Stream
 *
 * Encode the JPEG image to output stream
 *
 * @param {Bitmap} img       An instance of {@link Bitmap} to be encoded to JPEG, `img.data` must be a buffer of raw JPEG data
 * @param {Stream} outstream The stream to write the raw JPEG buffer to
 * @param {Int} Number between 0 and 100 setting the JPEG quality
 * @returns {Promise<void>}
 */
exports.encodeJPEGToStream = function(img, outstream, quality) {
    quality = quality || 90;
    return new Promise((res,rej)=> {
        if(!img.hasOwnProperty('data') || !img.hasOwnProperty('width') || !img.hasOwnProperty('height')) {
            rej(new TypeError('Invalid bitmap image provided'));
        }
        var data = {
            data: img.data,
            width: img.width,
            height: img.height
        };
        outstream.on('error', (err) => rej(err));
        outstream.write(JPEG.encode(data, quality).data, () => {
            outstream.end();
            res();
        });
    });
};

/**
 * Decode JPEG From Stream
 *
 * Decode a JPEG image from an incoming stream of data
 *
 * @param {Stream} data A readable stream to decode JPEG data from
 *
 * @returns {Promise<Bitmap>}
 */
exports.decodeJPEGFromStream = function(data) {
    return new Promise((res,rej)=>{
        try {
            var chunks = [];
            data.on('data', chunk => chunks.push(chunk));
            data.on('end',() => {
                var buf = Buffer.concat(chunks);
                var rawImageData = JPEG.decode(buf);
                var bitmap = new Bitmap(rawImageData.width, rawImageData.height);
                for (var x_axis = 0; x_axis < rawImageData.width; x_axis++) {
                    for (var y_axis = 0; y_axis < rawImageData.height; y_axis++) {
                        var n = (y_axis * rawImageData.width + x_axis) * 4;
                        bitmap.setPixelRGBA_i(x_axis, y_axis,
                            rawImageData.data[n + 0],
                            rawImageData.data[n + 1],
                            rawImageData.data[n + 2],
                            rawImageData.data[n + 3]
                        );
                    }
                }
                res(bitmap);
            });
            data.on("error", (err) => {
                rej(err);
            });
        } catch (e) {
            console.log(e);
            rej(e);
        }
    });
};

/**
 * Decode PNG From Stream
 *
 * Decode a PNG file from an incoming readable stream
 *
 * @param {Stream} instream A readable stream containing raw PNG data
 *
 * @returns {Promise<Bitmap>}
 */
exports.decodePNGFromStream = function(instream) {
    return new Promise((res,rej)=>{
        instream.pipe(new PNG())
            .on("parsed", function() {
                var bitmap =  new Bitmap(this.width,this.height);
                for(var i=0; i<bitmap.data.length; i++) {
                    bitmap.data[i] = this.data[i];
                };
                res(bitmap);
            }).on("error", function(err) {
                rej(err);
            });
    })
};

/**@ignore */
exports.registerFont = text.registerFont;

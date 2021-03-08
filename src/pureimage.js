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
                try {
                    var rawImageData = JPEG.decode(buf);
                } catch(err) {
                    rej(err);
                    return
                }
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

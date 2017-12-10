const Bitmap = require('./bitmap');
const fs     = require('fs');
const JPEG   = require('jpeg-js');
const PNG    = require('pngjs').PNG;
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
 * @param {Bitmap} bitmap    An instance of {@link Bitmap} to be encoded to PNG
 * @param {Stream} outstream The stream to write the PNG file to
 *
 * @returns {Promise<void>}
 */
exports.encodePNGToStream = function(bitmap, outstream) {
    return new Promise((res,rej)=>{
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

        png.pack()
            .pipe(outstream)
            .on('finish', ()=>{  res(); })
            .on('error', (err) => { rej(err); })
    });
}

/**
 * Encode JPEG To Stream
 *
 * Encode the JPEG image to output stream
 *
 * @param {{width: 20, height: 40, data: null}} img       Image data to pass to `JPEG.encode`. Note that `img.data` should be a buffer of raw Jpeg data
 * @param {Stream}                              outstream The stream to write the raw JPEG buffer to
 * @returns {Promise<void>}
 */
exports.encodeJPEGToStream = function(img, outstream) {
    return new Promise((res,rej)=> {
        var data = {
            data: img.data,
            width: img.width,
            height: img.height
        };
        outstream.on('error', (err) => rej(err));
        outstream.write(JPEG.encode(data, 50).data, () => {
            outstream.end();
            res()
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
            data.on('data',(chunk)=>{
                chunks.push(chunk);
            });
            data.on('end',()=>{
                var buf = Buffer.concat(chunks);
                var rawImageData = JPEG.decode(buf);
                var bitmap = new Bitmap(rawImageData.width, rawImageData.height);
                for (var i = 0; i < rawImageData.width; i++) {
                    for (var j = 0; j < rawImageData.height; j++) {
                        var n = (j * rawImageData.width + i) * 4;
                        bitmap.setPixelRGBA_i(i, j,
                            rawImageData.data[n + 0],
                            rawImageData.data[n + 1],
                            rawImageData.data[n + 2],
                            rawImageData.data[n + 3]
                        );
                    }
                }
                res(bitmap);
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
            });
    })
};

/**@ignore */
exports.registerFont = text.registerFont;

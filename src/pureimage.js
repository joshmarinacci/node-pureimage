// Pure Image uses existing libraries for font parsing, jpeg/png encode/decode
// and borrowed code for transform management and unsigned integer manipulation

//2014-11-14  line count: 418, 411, 407, 376, 379, 367
//2014-11-15  line count: 401, 399, 386, 369, 349,


/** @ignore */
var fs = require('fs');
/** @ignore */
var PNG = require('pngjs').PNG;
/** @ignore */
var JPEG = require('jpeg-js');
/** @ignore */
var uint32 = require('./uint32');
/** @ignore */
var Bitmap = require('./bitmap');
/** @ignore */
var text = require('./text');

/**
 * Make
 * 
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
 * @returns {Promise}
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
 * @param {string} img       An object containing a raw buffer of the image data (`img.buffer`) along with the width(`img.width`) and height (`img.height`) of the image
 * @param {Stream} outstream The stream to write the JPEG file to
 * @returns {Promise<object>}
 */
exports.encodeJPEGToStream = function(img, outstream) {
    return new Promise((res,rej)=> {
        var data = {
            data: img.data,
            width: img.width,
            height: img.height
        };
        outstream.on('error', (err) => rej(err));
        outstream.write(JPEG.encode(data, 50).data, () => res());
    });
};

/**
 * Encode JPEG To Stream
 * 
 * Encode the JPEG image to output stream with quality factor
 *  
 * @param {string} img       An object containing a raw buffer of the image data (`img.buffer`) along with the width(`img.width`) and height (`img.height`) of the image
 * @param {Stream} outstream The stream to write the JPEG file to
 * @param {number} q the wanted quality factor
 * @returns {Promise<object>}
 */
exports.encodeJPEGToStream = function(img, outstream, quality_factor) {
    return new Promise((res,rej)=> {
        var data = {
            data: img.data,
            width: img.width,
            height: img.height
        };
        outstream.on('error', (err) => rej(err));
        outstream.write(JPEG.encode(data, quality_factor).data, () => res());
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

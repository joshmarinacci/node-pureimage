// Pure Image uses existing libraries for font parsing, jpeg/png encode/decode
// and borrowed code for transform management and unsigned integer manipulation

//2014-11-14  line count: 418, 411, 407, 376, 379, 367
//2014-11-15  line count: 401, 399, 386, 369, 349,


var opentype = require('opentype.js');
var fs = require('fs');
var PNG = require('pngjs').PNG;
var JPEG = require('jpeg-js');
var uint32 = require('./uint32');
var NAMED_COLORS = require('./named_colors');
var Bitmap = require('./bitmap');

exports.make = function(w,h,options) {
    return new Bitmap(w,h,options);
};

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


var _fonts = { };

exports.registerFont = function(binary, family, weight, style, variant) {
    _fonts[family] = {
        binary: binary,
        family: family,
        weight: weight,
        style: style,
        variant: variant,
        loaded: false,
        font: null,
        load: function(cb) {
            console.log("PureImage loading", family,weight,style,variant);
            if(this.loaded) {
                if(cb)cb();
                return;
            }
            var self = this;
            opentype.load(binary, function (err, font) {
                if (err) throw new Error('Could not load font: ' + err);
                self.loaded = true;
                self.font = font;
                if(cb)cb();
            });
        }
    };
    return _fonts[family];
};
exports.debug_list_of_fonts = _fonts;

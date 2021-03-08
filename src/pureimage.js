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





/**@ignore */
exports.registerFont = text.registerFont;

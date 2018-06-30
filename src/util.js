/**
 * Clamping is the process of limiting a position to an area
 *
 * @see https://en.wikipedia.org/wiki/Clamping_(graphics)
 *
 * @param {number} value The value to apply the clamp restriction to
 * @param {number} min   Lower limit
 * @param {number} max   Upper limit
 *
 * @returns {number}
 */
module.exports.clamp = function (value,min,max) {
    if(value < min) return min;
    if(value > max) return max;
    return value;
}

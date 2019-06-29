//from https://github.com/fxa/uint32.js

/* jshint bitwise: false */

/**
 * @license (c) Franz X Antesberger 2013
 */

'use strict';

const POW_2_32 = 0x0100000000;
const POW_2_52 = 0x10000000000000;

//
//  Creating and Extracting
//

/**
 *  Creates an uint32 from the given bytes in big endian order.
 *  @param {Number} highByte the high byte
 *  @param {Number} secondHighByte the 2nd high byte
 *  @param {Number} thirdHighByte the 3rd high byte
 *  @param {Number} lowByte the low byte
 *  @returns highByte concat secondHighByte concat thirdHighByte concat lowByte
 */
export function fromBytesBigEndian(highByte: number, secondHighByte: number, thirdHighByte: number, lowByte: number)
{
	return ((highByte << 24) | (secondHighByte << 16) | (thirdHighByte << 8) | lowByte) >>> 0;
};

/**
 *  Returns the byte.
 *  e.g. when byteNo is 0, the high byte is returned, when byteNo = 3 the low byte is returned.
 *  @param {Number} uint32value the source to be extracted
 *  @param {Number} byteNo 0-3 the byte number, 0 is the high byte, 3 the low byte
 *  @returns {Number} the 0-255 byte according byteNo
 */
export function getByteBigEndian(uint32value: number, byteNo: number)
{
	return (uint32value >>> (8 * (3 - byteNo))) & 0xff;
};

/**
 *  Returns the bytes as array.
 *  @param {Number} uint32value the source to be extracted
 *  @returns {Array} the array [highByte, 2ndHighByte, 3rdHighByte, lowByte]
 */
export function getBytesBigEndian(uint32value: number)
{
	return [
		getByteBigEndian(uint32value, 0),
		getByteBigEndian(uint32value, 1),
		getByteBigEndian(uint32value, 2),
		getByteBigEndian(uint32value, 3),
	];
};

/**
 *  Converts a given uin32 to a hex string including leading zeros.
 *  @param {Number} uint32value the uint32 to be stringified
 *  @param {Number} optionalMinLength the optional (default 8)
 */
export function toHex(uint32value: number, optionalMinLength: number)
{
	optionalMinLength = optionalMinLength || 8;
	let result = uint32value.toString(16);
	if (result.length < optionalMinLength)
	{
		result = new Array(optionalMinLength - result.length + 1).join('0') + result;
	}
	return result;
};

/**
 *  Converts a number to an uint32.
 *  @param {Number} number the number to be converted.
 *  @return {Number} an uint32 value
 */
export function toUint32(number: number)
{
	// the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
	return number >>> 0;
};

/**
 *  Returns the part above the uint32 border.
 *  Depending to the javascript engine, that are the 54-32 = 22 high bits
 *  @param {Number} number the number to extract the high part
 *  @return {Number} the high part of the number
 */
export function highPart(number: number)
{
	return toUint32(number / POW_2_32);
};

//
//  Bitwise Logical Operators
//

/**
 *  Returns a bitwise OR operation on two or more values.
 *  @param {Number} uint32val0 first uint32 value
 *  @param {Number} argv one or more uint32 values
 *  @return {Number} the bitwise OR uint32 value
 */
export function or(uint32val0: number, ...argv: number[])
{
	let result = uint32val0;
	for (let v of argv)
	{
		result = (result | v);
	}
	return result >>> 0;
};

/**
 *  Returns a bitwise AND operation on two or more values.
 *  @param {Number} uint32val0 first uint32 value
 *  @param {Number} argv one or more uint32 values
 *  @return {Number} the bitwise AND uint32 value
 */
export function and(uint32val0: number, ...argv: number[])
{
	let result = uint32val0;
	for (let v of argv)
	{
		result = (result & v);
	}
	return result >>> 0;
}

/**
 *  Returns a bitwise XOR operation on two or more values.
 *  @param {Number} uint32val0 first uint32 value
 *  @param {Number} argv one or more uint32 values
 *  @return {Number} the bitwise XOR uint32 value
 */
export function xor(uint32val0: number, ...argv: number[])
{
	let result = uint32val0;
	for (let v of argv)
	{
		result = (result ^ v);
	}
	return result >>> 0;
}

export function not(uint32val: number)
{
	return (~uint32val) >>> 0;
};

//
// Shifting and Rotating
//

/**
 *  Returns the uint32 representation of a << operation.
 *  @param {Number} uint32val the word to be shifted
 *  @param {Number} numBits the number of bits to be shifted (0-31)
 *  @returns {Number} the uint32 value of the shifted word
 */
export function shiftLeft(uint32val: number, numBits: number)
{
	return (uint32val << numBits) >>> 0;
};

/**
 *  Returns the uint32 representation of a >>> operation.
 *  @param {Number} uint32val the word to be shifted
 *  @param {Number} numBits the number of bits to be shifted (0-31)
 *  @returns {Number} the uint32 value of the shifted word
 */
export function shiftRight(uint32val: number, numBits: number)
{
	return uint32val >>> numBits;
};

export function rotateLeft(uint32val: number, numBits: number)
{
	return (((uint32val << numBits) >>> 0) | (uint32val >>> (32 - numBits))) >>> 0;
};

export function rotateRight(uint32val: number, numBits: number)
{
	return (((uint32val) >>> (numBits)) | ((uint32val) << (32 - numBits)) >>> 0) >>> 0;
};

//
// Logical Gates
//

/**
 *  Bitwise choose bits from y or z, as a bitwise x ? y : z
 */
export function choose(x: number, y: number, z: number)
{
	return ((x & (y ^ z)) ^ z) >>> 0;
};

/**
 * Majority gate for three parameters. Takes bitwise the majority of x, y and z,
 * @see https://en.wikipedia.org/wiki/Majority_function
 */
export function majority(x: number, y: number, z: number)
{
	return ((x & (y | z)) | (y & z)) >>> 0;
}

//
//  Arithmetic
//

/**
 *  Adds the given values modulus 2^32.
 *  @returns the sum of the given values modulus 2^32
 */
export function addMod32(uint32val0: number, ...optionalValues: number[])
{
	let result = uint32val0;
	for (let v of optionalValues)
	{
		result += v;
	}
	return result >>> 0;
}

/**
 *  Returns the log base 2 of the given value. That is the number of the highest set bit.
 *  @param {Number} uint32val the value, the log2 is calculated of
 *  @return {Number} the logarithm base 2, an integer between 0 and 31
 */
export function log2(uint32val: number)
{
	return Math.floor(Math.log(uint32val) / Math.LN2);
}

/*
    // this implementation does the same, looks much funnier, but takes 2 times longer (according to jsperf) ...
    let log2_u = new Uint32Array(2);
    let log2_d = new Float64Array(log2_u.buffer);

    export function log2 (uint32val) {
        // Ported from http://graphics.stanford.edu/~seander/bithacks.html#IntegerLogIEEE64Float to javascript
        // (public domain)
        if (uint32val === 0) {
            return -Infinity;
        }
        // fill in the low part
        log2_u[0] = uint32val;
        // set the mantissa to 2^52
        log2_u[1] = 0x43300000;
        // subtract 2^52
        log2_d[0] -= 0x10000000000000;
        return (log2_u[1] >>> 20) - 0x3FF;
    };
*/

/**
 *  Returns the the low and the high uint32 of the multiplication.
 *  @param {Number} factor1 an uint32
 *  @param {Number} factor2 an uint32
 *  @param {Uint32Array[2]} resultUint32Array2 the Array, where the result will be written to
 *  @returns undefined
 */
export function mult(factor1: number, factor2: number, resultUint32Array2: number[])
{
	let high16 = ((factor1 & 0xffff0000) >>> 0) * factor2;
	let low16 = (factor1 & 0x0000ffff) * factor2;
	// the addition is dangerous, because the result will be rounded, so the result depends on the lowest bits, which will be cut away!
	let carry = ((toUint32(high16) + toUint32(low16)) >= POW_2_32) ? 1 : 0;
	resultUint32Array2[0] = (highPart(high16) + highPart(low16) + carry) >>> 0;
	resultUint32Array2[1] = ((high16 >>> 0) + (low16 >>> 0));// >>> 0;
}



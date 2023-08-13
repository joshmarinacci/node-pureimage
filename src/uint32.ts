//from https://github.com/fxa/uint32.js
'use strict';

const POW_2_32 = 0x0100000000;
// const POW_2_52 = 0x10000000000000;

//  Creating and Extracting
//

/**
 *  Creates an uint32 from the given bytes in big endian order.
 *  @returns highByte concat secondHighByte concat thirdHighByte concat lowByte
 */
export const fromBytesBigEndian = function(
    /** the high byte */
    highByte: number,
    /** the 2nd high byte */
    secondHighByte: number,
    /** the 3rd high byte */
    thirdHighByte: number,
    /** the low byte */
    lowByte: number,
) {
    return ((highByte << 24) | (secondHighByte << 16) | (thirdHighByte << 8) | lowByte) >>> 0;
};


/**
 *  Returns the byte.
 *  e.g. when byteNo is 0, the high byte is returned, when byteNo = 3 the low byte is returned.
 *  @returns the 0-255 byte according byteNo
 */
export const getByteBigEndian = function(
    /** the source to be extracted */
    uint32value: number,
    /** 0-3 the byte number, 0 is the high byte, 3 the low byte */
    byteNo: 0 | 1 | 2 | 3
) {
    return (uint32value >>> (8 * (3 - byteNo))) & 0xff;
};

/**
 *  Returns the bytes as array.
 *  @returns the array [highByte, 2ndHighByte, 3rdHighByte, lowByte]
 */
export const getBytesBigEndian = function(
    /** the source to be extracted */
    uint32value: number
) {
    return [
        getByteBigEndian(uint32value, 0),
        getByteBigEndian(uint32value, 1),
        getByteBigEndian(uint32value, 2),
        getByteBigEndian(uint32value, 3)
    ] as [number,number,number,number];
};

/**
 *  Converts a given uin32 to a hex string including leading zeros.
 */
export const toHex = function(
    /** the uint32 to be stringified */
    uint32value: number,
    /** the optional (default 8) */
    optionalMinLength = 8
): string {
    let result = uint32value.toString(16);
    if (result.length < optionalMinLength) {
        result = new Array(optionalMinLength - result.length + 1).join('0') + result;
    }
    return result;
};

/**
 *  Converts a number to an uint32.
 *  @return an uint32 value
 */
export const toUint32 = function(
    /** the number to be converted. */
    number: number
) {
    // the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
    return number >>> 0;
};

/**
 *  Returns the part above the uint32 border.
 *  Depending to the javascript engine, that are the 54-32 = 22 high bits
 *  @return the high part of the number
 */
export const highPart = function(
    /** the number to extract the high part */
    number: number
) {
    return toUint32(number / POW_2_32);
};

//
//  Bitwise Logical Operators
//

/**
 *  Returns a bitwise OR operation on two or more values.
 *  @return the bitwise OR uint32 value
 */
export const or = function(
    /** first uint32 value */
    uint32val0: number,
    /** one or more uint32 values */
    ...argv: number[]
) {
    let result = uint32val0;
    for (let index = 0; index < argv.length; index += 1) {
        result = (result | argv[index]);
    }
    return result >>> 0;
};

/**
 *  Returns a bitwise AND operation on two or more values.
 *  @return the bitwise AND uint32 value
 */
export const and = function(
    /** first uint32 value */
    uint32val0: number,
    /** one or more uint32 values */
    ...argv: number[]
) {
    let result = uint32val0;
    for (let index = 0; index < argv.length; index += 1) {
        result = (result & argv[index]);
    }
    return result >>> 0;
};

/**
 *  Returns a bitwise XOR operation on two or more values.
 *  @return the bitwise XOR uint32 value
 */
export const xor = function(
    /** first uint32 value */
    uint32val0: number,
    /** one or more uint32 values */
    ...argv: number[]
) {
    let result = uint32val0;
    for (let index = 0; index < argv.length; index += 1) {
        result = (result ^ argv[index]);
    }
    return result >>> 0;
};

/**
 * Logical Not
 */
export const not = function(
    uint32val: number
) {
    return (~uint32val) >>> 0;
};

//
// Shifting and Rotating
//

/**
 *  Returns the uint32 representation of a << operation.
 *  @returns the uint32 value of the shifted word
 */
export const shiftLeft = function(
    /** the word to be shifted */
    uint32val: number,
    /** the number of bits to be shifted (0-31) */
    numBits: number,
) {
    return (uint32val << numBits) >>> 0;
};

/**
 *  Returns the uint32 representation of a >>> operation.
 *  @returns the uint32 value of the shifted word
 */
export const shiftRight = function(
    /** the word to be shifted */
    uint32val: number,
    /** the number of bits to be shifted (0-31) */
    numBits: number,
) {
    return uint32val >>> numBits;
};

export const rotateLeft = function(
    uint32val: number,
    numBits: number,
) {
    return (((uint32val << numBits) >>> 0) | (uint32val >>> (32 - numBits))) >>> 0;
};

export const rotateRight = function(
    uint32val: number,
    numBits: number,
) {
    return (((uint32val) >>> (numBits)) | ((uint32val) << (32 - numBits)) >>> 0) >>> 0;
};

//
// Logical Gates
//

/**
 *  Bitwise choose bits from y or z, as a bitwise x ? y : z
 */
export const choose = function(
    x: number,
    y: number,
    z: number,
) {
    return ((x & (y ^ z)) ^ z) >>> 0;
};

/**
 * Majority gate for three parameters. Takes bitwise the majority of x, y and z,
 * @see https://en.wikipedia.org/wiki/Majority_function
 */
export const majority = function(
    x: number,
    y: number,
    z: number,
) {
    return ((x & (y | z)) | (y & z)) >>> 0;
};

//
//  Arithmetic
//

/**
 *  Adds the given values modulus 2^32.
 *  @returns the sum of the given values modulus 2^32
 */
export const addMod32 = function(
    uint32val: number,
    ...argv: number[]
) {
    let result = uint32val;
    for (let index = 0; index < argv.length; index += 1) {
        result += argv[index];
    }
    return result >>> 0;
};

/**
 *  Returns the log base 2 of the given value. That is the number of the highest set bit.
 *  @return the logarithm base 2, an integer between 0 and 31
 */
export const log2 = function(
    /** the value, the log2 is calculated of */
    uint32val: number
) {
    return Math.floor(Math.log(uint32val) / Math.LN2);
};

/**
 *  Returns the the low and the high uint32 of the multiplication.
 *  @returns undefined
 */
export const mult = function(
    /** an uint32 */
    factor1: number,
    /** an uint32 */
    factor2: number,
    /** the Array, where the result will be written to */
    resultUint32Array2: Uint32Array & [number,number],
) {
    const high16 = ((factor1 & 0xffff0000) >>> 0) * factor2;
    const low16 = (factor1 & 0x0000ffff) * factor2;
    // the addition is dangerous, because the result will be rounded, so the result depends on the lowest bits, which will be cut away!
    const carry = ((toUint32(high16) + toUint32(low16)) >= POW_2_32) ? 1 : 0;
    resultUint32Array2[0] = (highPart(high16) + highPart(low16) + carry) >>> 0;
    resultUint32Array2[1] = ((high16 >>> 0) + (low16 >>> 0));// >>> 0;
};

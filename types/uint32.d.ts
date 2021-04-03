//from https://github.com/fxa/uint32.js

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
export function fromBytesBigEndian(
    highByte: number,
    secondHighByte: number,
    thirdHighByte: number,
    lowByte: number
): number;

/**
 *  Returns the byte.
 *  e.g. when byteNo is 0, the high byte is returned, when byteNo = 3 the low byte is returned.
 *  @param {Number} uint32value the source to be extracted
 *  @param {Number} byteNo 0-3 the byte number, 0 is the high byte, 3 the low byte
 *  @returns {Number} the 0-255 byte according byteNo
 */
export function getByteBigEndian(uint32value: number, byteNo: number): number;
/**
 *  Returns the bytes as array.
 *  @param {Number} uint32value the source to be extracted
 *  @returns {Array} the array [highByte, 2ndHighByte, 3rdHighByte, lowByte]
 */
export function getBytesBigEndian(uint32value: number): number[];

/**
 *  Converts a given uin32 to a hex string including leading zeros.
 *  @param {Number} uint32value the uint32 to be stringified
 *  @param {Number} optionalMinLength the optional (default 8)
 */
export function toHex(uint32value: number, optionalMinLength: number): string;

/**
 *  Converts a number to an uint32.
 *  @param {Number} number the number to be converted.
 *  @return {Number} an uint32 value
 */
export function toUint32(number: number): number;

/**
 *  Returns the part above the uint32 border.
 *  Depending to the javascript engine, that are the 54-32 = 22 high bits
 *  @param {Number} number the number to extract the high part
 *  @return {Number} the high part of the number
 */
export function highPart(number: number): number;

//
//  Bitwise Logical Operators
//

/**
 *  Returns a bitwise OR operation on two or more values.
 *  @param {Number} uint32val0 first uint32 value
 *  @param {Number} argv one or more uint32 values
 *  @return {Number} the bitwise OR uint32 value
 */
export function or(uint32val0: number, argv: number): number;

/**
 *  Returns a bitwise AND operation on two or more values.
 *  @param {Number} uint32val0 first uint32 value
 *  @param {Number} argv one or more uint32 values
 *  @return {Number} the bitwise AND uint32 value
 */
export function and(uint32val0: number, argv: number): number;

/**
 *  Returns a bitwise XOR operation on two or more values.
 *  @param {Number} uint32val0 first uint32 value
 *  @param {Number} argv one or more uint32 values
 *  @return {Number} the bitwise XOR uint32 value
 */
export function xor(uint32val0: number, argv: number): number;

export function not(uint32val: number): number;

//
// Shifting and Rotating
//

/**
 *  Returns the uint32 representation of a << operation.
 *  @param {Number} uint32val the word to be shifted
 *  @param {Number} numBits the number of bits to be shifted (0-31)
 *  @returns {Number} the uint32 value of the shifted word
 */
export function shiftLeft(uint32val: number, numBits: number): number;

/**
 *  Returns the uint32 representation of a >>> operation.
 *  @param {Number} uint32val the word to be shifted
 *  @param {Number} numBits the number of bits to be shifted (0-31)
 *  @returns {Number} the uint32 value of the shifted word
 */
export function shiftRight(uint32val: number, numBits: number): number;

export function rotateLeft(uint32val: number, numBits: number): number;

export function rotateRight(uint32val: number, numBits: number): number;

//
// Logical Gates
//

/**
 *  Bitwise choose bits from y or z, as a bitwise x ? y : z
 */
export function choose(x: number, y: number, z: number): number;

/**
 * Majority gate for three parameters. Takes bitwise the majority of x, y and z,
 * @see https://en.wikipedia.org/wiki/Majority_function
 */
export function majority(x: number, y: number, z: number): number;
//
//  Arithmetic
//

/**
 *  Adds the given values modulus 2^32.
 *  @returns the sum of the given values modulus 2^32
 */
export function addMod32(uint32val0: number /*, optionalValues*/): number;

/**
 *  Returns the log base 2 of the given value. That is the number of the highest set bit.
 *  @param {Number} uint32val the value, the log2 is calculated of
 *  @return {Number} the logarithm base 2, an integer between 0 and 31
 */
export function log2(uint32val: number): number;

/**
 *  Returns the the low and the high uint32 of the multiplication.
 *  @param {Number} factor1 an uint32
 *  @param {Number} factor2 an uint32
 *  @param {Uint32Array[2]} resultUint32Array2 the Array, where the result will be written to
 *  @returns undefined
 */
export function mult(
    factor1: number,
    factor2: number,
    resultUint32Array2: Uint32Array[2]
): void;

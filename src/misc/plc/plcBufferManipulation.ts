//Service for Dematic Dashboard Screwfix trentham to manipulate buffers
//Created by: JWL
//Date: 2023/02/02 02:51:41
//Last modified: 2023/02/02 21:36:11
//Version: 0.0.1

/**
 * Read a single bit from a byte received from a Siemens S7 PLC.
 *
 * @param {Buffer} buffer - The buffer containing the byte to be read.
 * @param {Number} bitNumber - The number of the bit to be read, with 0 being the least significant bit.
 *
 * @return {Number} - The value of the specified bit, either 0 or 1.
 */
function readBitFromByte(buffer: Buffer, bitNumber: number): number {
  // Read the first byte from the buffer
  const byte = buffer.readUInt8(0);

  // Shift the byte to the right by the specified number of bits
  const shiftedByte = byte >> bitNumber;

  // And the shifted byte with 1 to extract the value of the specified bit
  return shiftedByte & 1;
}

/**
 * Convert a buffer received from a Siemens S7 PLC into an 8-bit integer.
 *
 * @param {Buffer} buffer - The buffer to be converted.
 *
 * @return {Number} - The 8-bit integer representation of the buffer.
 */
function bufferToInt8(buffer: Buffer): number {
  return buffer.readUInt8(0);
}

/**
 * Convert a buffer received from a Siemens S7 PLC into a 16-bit integer.
 *
 * @param {Buffer} buffer - The buffer to be converted.
 *
 * @return {Number} - The 16-bit integer representation of the buffer.
 */
function bufferToInt16(buffer: Buffer): number {
  return buffer.readUInt16LE(0);
}

/**
 * Convert a buffer received from a Siemens S7 PLC into a 32-bit integer.
 *
 * @param {Buffer} buffer - The buffer to be converted.
 *
 * @return {Number} - The 32-bit integer representation of the buffer.
 */
function bufferToInt32(buffer: Buffer): number {
  return buffer.readUInt32LE(0);
}

// Export the functions
export default { readBitFromByte, bufferToInt8, bufferToInt16, bufferToInt32 };

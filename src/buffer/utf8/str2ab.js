/**
 * source:
 * https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
 */

// @ts-check

/**
 * Converts a JS string to a UTF-8 "byte" array.
 * @param {string} str 16-bit unicode string.
 * @return {!Array<number>} UTF-8 byte array.
 */
export const utf8encode = (str, stream = null, offset = 0) => {
  const { length } = str,
    out = stream ? stream : new Array(length);
  let p = stream ? offset : 0;
  for (let i = 0; i < length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      out[p++] = c;
    } else if (c < 2048) {
      out[p++] = (c >> 6) | 192;
      out[p++] = (c & 63) | 128;
    } else if (
      (c & 0xfc00) === 0xd800 &&
      i + 1 < length &&
      (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00
    ) {
      // Surrogate Pair
      c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
      out[p++] = (c >> 18) | 240;
      out[p++] = ((c >> 12) & 63) | 128;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    } else {
      out[p++] = (c >> 12) | 224;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    }
  }
  return !stream ? out : p - offset;
};

/**
 * String -> ArrayBuffer
 */
export const str2ab = value => {
  if (!(value && typeof value === "string")) {
    throw new Error(`str2ab: value is not a string`);
  }
  return new Uint8Array(utf8encode(value)).buffer;
};

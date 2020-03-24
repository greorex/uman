/**
 * source:
 * https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
 */

// @ts-check

/**
 * Converts a UTF-8 byte array to JavaScript's 16-bit Unicode.
 * @param {Uint8Array|Array<number>} bytes UTF-8 byte array.
 * @return {string} 16-bit Unicode string.
 */
export const utf8decode = (bytes, offset = 0, length = 0) => {
  if (!length) {
    length = bytes.length;
  }
  // faster way +=
  // https://jsperf.com/join-concat/158
  let out = "";
  for (let pos = offset, l = pos + length; pos < l; ) {
    const c1 = bytes[pos++];
    if (c1 < 128) {
      out += String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      const c2 = bytes[pos++];
      out += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
    } else if (c1 > 239 && c1 < 365) {
      // Surrogate Pair
      const c2 = bytes[pos++],
        c3 = bytes[pos++],
        c4 = bytes[pos++],
        u =
          (((c1 & 7) << 18) |
            ((c2 & 63) << 12) |
            ((c3 & 63) << 6) |
            (c4 & 63)) -
          0x10000;
      out += String.fromCharCode(0xd800 + (u >> 10));
      out += String.fromCharCode(0xdc00 + (u & 1023));
    } else {
      const c2 = bytes[pos++],
        c3 = bytes[pos++];
      out += String.fromCharCode(
        ((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)
      );
    }
  }

  return out;
};

/**
 * Array Buffer -> String
 */
export const ab2str = buf => {
  if (!(buf && buf instanceof ArrayBuffer)) {
    throw new Error(`ab2str: value is not an ArrayBuffer`);
  }
  return utf8decode(new Uint8Array(buf));
};

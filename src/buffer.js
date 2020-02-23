// @ts-check

/**
 * String -> ArrayBuffer
 */
export function str2ab(str) {
  let i = str.length,
    buf = new ArrayBuffer(i * 2);
  for (let view = new Uint16Array(buf); i--; ) {
    view[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Array Buffer -> String
 */
export function ab2str(buf) {
  let str = "";
  for (let c of new Uint16Array(buf)) {
    str += String.fromCharCode(c);
  }
  return str;
}

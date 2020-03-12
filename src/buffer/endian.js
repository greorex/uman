// @ts-check

// DataView uses endian flag:
// false or undefined - as big, by default
// true as little
// This constant is platform's
export default (() => {
  const buffer = new ArrayBuffer(2);
  // with littleEndian
  new DataView(buffer).setInt16(0, 256, true);
  // Int16Array uses the platform's one.
  return new Int16Array(buffer)[0] === 256;
})();

/**
 * ArrayBuffer writer and reader, with auto offset
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

import { utf8decode as TD } from "./utf8/ab2str";
import { ValueDecoder } from "./value/decoder";

// decoders
const NATIVE = false,
  _utf8 = NATIVE ? buf => new TextDecoder().decode(buf) : TD;

// to speed up?
const uint8 = new Uint8Array(8),
  view = new DataView(uint8.buffer);

/**
 * streamed
 */
class Reader {
  constructor(littleEndian = true) {
    this.littleEndian = littleEndian;
  }

  read() {
    return 0; // byte
  }

  bytes(length = 0) {
    return []; // array like
  }

  rewind(bytes) {
    // offset =+ bytes
  }

  utf8(length) {
    return _utf8(this.bytes(length));
  }

  // private
  __read(bytes = 8) {
    for (let i = 0; i < bytes; i++) {
      uint8[i] = this.read();
    }
  }

  // public
  int8() {
    return (this.read() << 24) >> 24;
  }

  uint16() {
    this.__read(2);
    return view.getUint16(0, this.littleEndian);
  }

  int16() {
    this.__read(2);
    return view.getInt16(0, this.littleEndian);
  }
  uint32() {
    this.__read(4);
    return view.getUint32(0, this.littleEndian);
  }

  int32() {
    this.__read(4);
    return view.getInt32(0, this.littleEndian);
  }
  float32() {
    this.__read(4);
    return view.getFloat32(0, this.littleEndian);
  }
  float64() {
    this.__read(8);
    return view.getFloat64(0, this.littleEndian);
  }
  bigUint() {
    this.__read(8);
    return view.getBigUint64(0, this.littleEndian);
  }
  bigInt() {
    this.__read(8);
    return view.getBigInt64(0, this.littleEndian);
  }

  // any json value
  value(reviver = null) {
    return new ValueDecoder(this).decode(reviver);
  }
}

/**
 * to read from ArrayBuffer
 */
export class BufferReader extends Reader {
  constructor(buffer, littleEndian = true) {
    super(littleEndian);

    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error(`BufferReader: buffer is not an ArrayBuffer`);
    }
    this._data = new Uint8Array(buffer);
    // public
    this.offset = 0;
    this.size = this._data.byteLength;
  }

  isEndOfBuffer() {
    return this.offset >= this.size;
  }

  read() {
    return this._data[this.offset++];
  }

  // @ts-ignore
  bytes(length = 0) {
    const { _data, offset } = this;
    this.offset += length;
    return _data.subarray(offset, this.offset);
  }

  rewind(bytes) {
    this.offset += bytes;
  }

  utf8(length) {
    const v = _utf8(this._data, this.offset, length);
    this.offset += length;
    return v;
  }

  // private
  __read(bytes = 8) {
    for (let i = 0; i < bytes; i++) {
      uint8[i] = this._data[this.offset++];
    }
  }
}

/**
 * Array Buffer -> JSON like object
 */
export const ab2json = (buf, reviver = null, littleEndian = true) => {
  if (!(buf && buf instanceof ArrayBuffer)) {
    throw new Error(`ab2json: value is not an ArrayBuffer`);
  }
  return new BufferReader(buf, littleEndian).value(reviver);
};

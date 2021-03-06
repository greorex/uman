/**
 * ArrayBuffer writer and reader, with auto offset
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

import { ValueEncoder } from "./value/encoder";

// min max extra
const MAX_CHUNK = 8192,
  MIN_CHUNK = 128;

// to speed up?
const uint8 = new Uint8Array(8),
  view = new DataView(uint8.buffer);

/**
 * streamed interface
 */
class Writer {
  constructor(littleEndian = true) {
    this.le = littleEndian;
    this._ve = new ValueEncoder(this);
  }

  // to override

  byte(byte) {
    return this;
  }

  bytes(data, length = 0) {
    return this;
  }

  // public

  int8(v) {
    return this.byte(v < 0 ? v + 256 : v);
  }
  uint16(v) {
    view.setUint16(0, v, this.le);
    return this.bytes(uint8, 2);
  }
  int16(v) {
    view.setInt16(0, v, this.le);
    return this.bytes(uint8, 2);
  }
  uint32(v) {
    view.setUint32(0, v, this.le);
    return this.bytes(uint8, 4);
  }
  int32(v) {
    view.setInt32(0, v, this.le);
    return this.bytes(uint8, 4);
  }
  float32(v) {
    view.setFloat32(0, v, this.le);
    return this.bytes(uint8, 4);
  }
  float64(v) {
    view.setFloat64(0, v, this.le);
    return this.bytes(uint8, 8);
  }
  bigUint(v) {
    view.setBigUint64(0, v, this.le);
    return this.bytes(uint8, 8);
  }
  bigInt(v) {
    view.setBigInt64(0, v, this.le);
    return this.bytes(uint8, 8);
  }

  // any json value
  value(value, replacer = null) {
    return this._ve.encode(value, replacer);
  }
}

/**
 * to write into ArrayBuffer
 */
export class BufferWriter extends Writer {
  constructor(littleEndian = true, extra = MAX_CHUNK) {
    super(littleEndian);

    this.offset = 0;
    this.size = 0;
    this.extra = extra;
  }

  // getter
  get buffer() {
    // trancate?
    this._realloc(this.offset);
    // as is
    return this.data.buffer;
  }

  // override

  byte(byte) {
    this.resize(1);
    this.data[this.offset++] = byte;
    return this;
  }

  bytes(data, length = 0) {
    const l = length ? length : data.length;
    this.resize(l);
    // faster than .set
    for (let i = 0; i < l; i++) {
      this.data[this.offset++] = data[i];
    }
    return this;
  }

  // public

  empty() {
    this.offset = 0;
    this.size = this.data ? this.data.byteLength : 0;
    return this;
  }

  copy(offset = 0, size = 0) {
    if (offset < 0 || this.offset < offset) {
      throw new Error(
        `BufferWriter.copy: wrong offset [0 ${offset} ${this.offset}]`
      );
    }
    if (size < 0) {
      throw new Error(`BufferWriter.copy: wrong size ${size}`);
    }
    // check size
    if (!size) {
      size = this.offset - offset;
    }
    // zero filled
    const data = new Uint8Array(size);
    if (this.offset) {
      // copy up to offset
      // faster than .set
      for (let i = this.offset - offset; i--; ) {
        data[i] = this.data[offset + i];
      }
    }
    // done
    return data;
  }

  concat(buffer) {
    return this.bytes(new Uint8Array(buffer));
  }

  resize(extra) {
    if (extra < 0) {
      throw new Error(`BufferWriter.resize: wrong extra ${extra}`);
    }

    if (this.offset + extra > this.size) {
      // smart sized
      if (extra < this.extra) {
        extra = 2 * (this.size ? this.size : extra);
        if (this.extra && extra > this.extra) {
          extra = this.extra;
        }
        if (extra < MIN_CHUNK) {
          extra = MIN_CHUNK;
        }
      }
      // new buffer
      this._realloc(this.size + extra);
    }
  }

  // private

  _realloc(size = 0) {
    if (size !== this.size || !size) {
      // set it up
      this.data = this.data ? this.copy(0, size) : new Uint8Array(size);
      this.size = this.data.byteLength;
    }
  }
}

/**
 * JSON like object -> ArrayBuffer
 */
export const json2ab = (value, replacer = null, littleEndian = true) => {
  // encode
  return new BufferWriter(littleEndian).value(value, replacer).buffer;
};

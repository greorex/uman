/**
 * ArrayBuffer writer and reader, with auto offset
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

import { utf8encode as TE } from "../utf8/str2ab";
import VT from "./type";

// min max numbers
const _isFinite = Number.isFinite,
  MAX_UINT8 = 0xff,
  MAX_UINT16 = 0xffff,
  MAX_UINT32 = 0xffffffff,
  MAX_FLOAT32 = 3.40282347e38,
  MIN_FLOAT32 = -MAX_FLOAT32;

// to speed up?
const cache = [];

// encoders
const NATIVE = false,
  _utf8 = NATIVE ? str => new TextEncoder().encode(str) : TE;

/**
 * to encode any json value
 */
export class ValueEncoder {
  constructor(writer) {
    // private
    const out = writer,
      _number = v => {
        // as type
        if (v === 0) {
          return out.write(VT.ZERO);
        }
        // as integer 8|16|32
        if (!(v < -MAX_UINT32 || v > MAX_UINT32) && v === (v ^ 0)) {
          // sign in type
          const negative = v < 0 ? ((v = -v), true) : false;
          // 32
          if (v > MAX_UINT16) {
            return out.write(negative ? -VT.UINT32 : VT.UINT32).uint32(v);
          }
          // 16
          if (v > MAX_UINT8) {
            return out.write(negative ? -VT.UINT16 : VT.UINT16).uint16(v);
          }
          // 8
          return out.write(negative ? -VT.UINT8 : VT.UINT8).write(v);
        }
        // as float
        if (_isFinite(v)) {
          // 64
          if (v < MIN_FLOAT32 || v > MAX_FLOAT32) {
            return out.write(VT.FLOAT64).float64(v);
          }
          // 32
          return out.write(VT.FLOAT32).float32(v);
        }
        // as type
        return out.write(
          v === Infinity ? VT.INFINITY : v === -Infinity ? -VT.INFINITY : VT.NAN
        );
      },
      _string = v => {
        if (!v.length) {
          return out.write(VT.EMPTY);
        }
        // smart sized
        const bytes = _utf8(v),
          { length } = bytes;
        if (length > MAX_UINT16) {
          out.write(VT.STRING32).uint32(length);
        } else if (length > MAX_UINT8) {
          out.write(VT.STRING16).uint16(length);
        } else {
          out.write(VT.STRING8).write(length);
        }
        return out.bytes(bytes, length);
      },
      _value = (value, _entry) => {
        switch (typeof value) {
          case "object":
            if (value === null) {
              return out.write(VT.NULL);
            } else if (Array.isArray(value)) {
              out.write(VT.ARRAY);
              for (let i = 0, l = value.length; i < l; i++) {
                _entry(i, value[i]);
              }
            } else {
              out.write(VT.OBJECT);
              for (let i in value) {
                _entry(i, value[i]);
              }
            }
            return out.write(VT.END);
          case "string":
            return _string(value);
          case "number":
            return _number(value);
          case "boolean":
            return out.write(value ? VT.TRUE : VT.FALSE);
          case "bigint":
            return out.write(VT.BIGINT).bigInt(value);
          case "undefined":
            return out.write(VT.UNDEFINED);
        }
      };

    // public
    this.encode = (value, replacer = null) => {
      if (replacer) {
        value = replacer("", value);
      }

      const _entry = (k, v) => {
        if (replacer) {
          v = replacer(k, v);
        }
        // means object
        if (typeof k === "string") {
          // skip undefined
          if (v === undefined) {
            return;
          }
          // key
          if (k.length < 64) {
            let c = cache[k];
            if (!c) {
              c = _utf8(k);
              c.unshift(VT.STRING8, c.length);
              cache[k] = c;
            }
            out.bytes(c, c.length);
          } else {
            _string(k);
          }
        }

        // recursively
        _value(v, _entry);
      };

      // run
      return _value(value, _entry);
    };
  }
}

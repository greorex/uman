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
const keysCache = [];

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
          return out.byte(VT.ZERO);
        }
        // as integer 8|16|32
        if (!(v < -MAX_UINT32 || v > MAX_UINT32) && v === (v ^ 0)) {
          const negative = v < 0 ? ((v = -v), true) : false;
          // sign in type
          return v > MAX_UINT16
            ? out.byte(negative ? VT.N_UINT32 : VT.UINT32).uint32(v)
            : v > MAX_UINT8
            ? out.byte(negative ? VT.N_UINT16 : VT.UINT16).uint16(v)
            : out.byte(negative ? VT.N_UINT8 : VT.UINT8).byte(v);
        }
        // as float
        if (_isFinite(v)) {
          return v < MIN_FLOAT32 || v > MAX_FLOAT32
            ? out.byte(VT.FLOAT64).float64(v)
            : out.byte(VT.FLOAT32).float32(v);
        }
        // as type
        return out.byte(
          v === Infinity ? VT.INFINITY : v === -Infinity ? -VT.INFINITY : VT.NAN
        );
      },
      _string = v => {
        if (!v.length) {
          return out.byte(VT.EMPTY);
        }
        // smart sized
        const bytes = _utf8(v),
          { length } = bytes;
        length > MAX_UINT16
          ? out.byte(VT.STRING32).uint32(length)
          : length > MAX_UINT8
          ? out.byte(VT.STRING16).uint16(length)
          : out.byte(VT.STRING8).byte(length);
        // chars
        return out.bytes(bytes, length);
      },
      _value = (v, replacer) => {
        switch (typeof v) {
          case "object":
            if (v === null) {
              return out.byte(VT.NULL);
            } else if (Array.isArray(v)) {
              out.byte(VT.ARRAY);
              for (let i = 0, l = v.length; i < l; i++) {
                _entry(i, v[i], replacer);
              }
            } else {
              out.byte(VT.OBJECT);
              for (let i in v) {
                _entry(i, v[i], replacer, true);
              }
            }
            return out.byte(VT.END);
          case "string":
            return _string(v);
          case "number":
            return _number(v);
          case "boolean":
            return out.byte(v ? VT.TRUE : VT.FALSE);
          case "bigint":
            return out.byte(VT.BIGINT).bigInt(v);
          case "undefined":
            return out.byte(VT.UNDEFINED);
        }
      },
      _entry = (k, v, replacer, property = false) => {
        if (replacer) {
          v = replacer(k, v);
        }
        if (property) {
          // skip undefined
          if (v === undefined) {
            return;
          }
          // key
          if (k.length < 64) {
            let c = keysCache[k];
            if (!c) {
              c = _utf8(k);
              c.unshift(VT.STRING8, c.length);
              keysCache[k] = c;
            }
            out.bytes(c, c.length);
          } else {
            _string(k);
          }
        }
        return _value(v, replacer);
      };

    // public
    this.encode = (value, replacer = null) => _entry("", value, replacer);
  }
}

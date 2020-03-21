/**
 * uman
 * Units Manager javascript library to orchestrate web workers
 *
 * Copyright (c) 2019 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

import { BufferWriter } from "./buffer/writer";
import { BufferReader } from "./buffer/reader";

/**
 * packager methods enum
 */
export const PackagerMethod = {
  OBJECT: 0, // default
  STRING: 1,
  BUFFER: 2,
  PURE: 255
};

// locals
const PM = PackagerMethod;

/**
 * json value data packacger
 */
export class Packager {
  constructor(signature = null, key = true) {
    // protected
    const _entry = (o, k, replacer) => {
        const v = o[k],
          _v = _value(k, v, replacer);
        if (_v !== v) {
          o[k] = _v;
        }
      },
      _value = (k, v, replacer) => {
        // only objects and functions
        switch (v && typeof v) {
          case "object":
          case "function":
            if (replacer) {
              v = replacer(k, v);
            }
            if (Array.isArray(v)) {
              for (let i = 0, l = v.length; i < l; i++) {
                _entry(v, i, replacer);
              }
            } else {
              for (let i in v) {
                _entry(v, i, replacer);
              }
            }
        }
        return v;
      };

    // public

    this.pack = (method, data, replacer = null) => {
      // sign
      if (signature) {
        data[signature] = key;
      }

      switch (method) {
        case PM.BUFFER:
          return new BufferWriter().value(data, replacer).buffer;
        case PM.STRING:
          return JSON.stringify(data, replacer);
        case PM.PURE:
          return data;
      }

      return _value("", data, replacer);
    };

    this.unpack = (data, reviver = null) => {
      const unpacked =
        data instanceof ArrayBuffer
          ? new BufferReader(data).value(reviver)
          : typeof data === "string"
          ? JSON.parse(data, reviver)
          : _value("", data, reviver);

      // unsign
      if (unpacked && (!signature || unpacked[signature] === key)) {
        return unpacked;
      }
    };
  }
}

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

import { json2ab } from "./buffer/writer";
import { ab2json } from "./buffer/reader";

/**
 * packager methods enum
 */
export const PackagerMethod = {
  OBJECT: 0, // default
  STRING: 1,
  BUFFER: 2,
  NOOP: 255
};

// locals
const PM = PackagerMethod;

/**
 * json value data packacger
 */
export class Packager {
  constructor(signature = null, key = true) {
    // protected
    const _value = (k, v, replacer) => {
      if (replacer) {
        v = replacer(k, v);
      }
      // only objects
      if (typeof v === "object" && v) {
        const _entry = i => {
          const item = v[i],
            _item = _value(i, item, replacer);
          if (_item !== item) v[i] = _item;
        };

        if (Array.isArray(v)) {
          for (let i = 0, l = v.length; i < l; i++) {
            _entry(i);
          }
        } else {
          for (let i in v) {
            _entry(i);
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
        case PM.NOOP:
          return data;
        case PM.STRING:
          return JSON.stringify(data, replacer);
        case PM.BUFFER:
          return json2ab(data, replacer);
      }

      return _value("", data, replacer);
    };

    this.unpack = (data, reviver = null) => {
      const unpacked =
        data instanceof ArrayBuffer
          ? ab2json(data, reviver)
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

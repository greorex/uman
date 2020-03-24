/**
 * ArrayBuffer writer and reader, with auto offset
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

import VT from "./type";

/**
 * to decode any json value
 */
export class ValueDecoder {
  constructor(reader) {
    // private
    const src = reader,
      _value = (k, reviver) => {
        let v;

        switch (src.byte()) {
          case VT.OBJECT:
            v = {};
            while (src.byte() !== VT.END) {
              src.rewind(-1);
              const i = _value();
              v[i] = _value(i, reviver);
            }
            break;

          case VT.ARRAY:
            v = [];
            for (let i = 0; src.byte() !== VT.END; i++) {
              src.rewind(-1);
              v[i] = _value(i, reviver);
            }
            break;

          case VT.STRING8:
            v = src.utf8(src.byte());
            break;
          case VT.STRING16:
            v = src.utf8(src.uint16());
            break;
          case VT.STRING32:
            v = src.utf8(src.uint32());
            break;

          case VT.UINT8:
            v = src.byte();
            break;
          case VT.N_UINT8:
            v = -src.byte();
            break;
          case VT.UINT16:
            v = src.uint16();
            break;
          case VT.N_UINT16:
            v = -src.uint16();
            break;
          case VT.UINT32:
            v = src.uint32();
            break;
          case VT.N_UINT32:
            v = -src.uint32();
            break;
          case VT.FLOAT32:
            v = src.float32();
            break;
          case VT.FLOAT64:
            v = src.float64();
            break;

          case VT.BIGINT:
            v = src.bigInt();
            break;

          case VT.TRUE:
            v = true;
            break;
          case VT.FALSE:
            v = false;
            break;

          case VT.EMPTY:
            v = "";
            break;
          case VT.ZERO:
            v = 0;
            break;
          case VT.NULL:
            v = null;
            break;

          case VT.NAN:
            v = NaN;
            break;
          case VT.INFINITY:
            v = Infinity;
            break;
          case -VT.INFINITY:
            v = -Infinity;
            break;

          default:
          case VT.UNDEFINED:
            break;
        }

        return reviver ? reviver(k, v) : v;
      };

    // any json value
    this.decode = (reviver = null) => _value("", reviver);
  }
}

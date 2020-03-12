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
      _value = reviver => {
        let value;

        switch (src.int8()) {
          case VT.OBJECT:
            value = {};
            while (src.read() !== VT.END) {
              src.rewind(-1);
              const i = _value(),
                item = _value(reviver);
              value[i] = reviver ? reviver(i, item) : item;
            }
            return value;

          case VT.ARRAY:
            value = [];
            for (let i = 0; src.read() !== VT.END; i++) {
              src.rewind(-1);
              const item = _value(reviver);
              value[i] = reviver ? reviver(i, item) : item;
            }
            return value;

          case VT.STRING8:
            return src.utf8(src.read());
          case VT.STRING16:
            return src.utf8(src.uint16());
          case VT.STRING32:
            return src.utf8(src.uint32());

          case VT.UINT8:
            return src.read();
          case -VT.UINT8:
            return -src.read();
          case VT.UINT16:
            return src.uint16();
          case -VT.UINT16:
            return -src.uint16();
          case VT.UINT32:
            return src.uint32();
          case -VT.UINT32:
            return -src.uint32();
          case VT.FLOAT32:
            return src.float32();
          case VT.FLOAT64:
            return src.float64();

          case VT.BIGINT:
            return src.bigInt();

          case VT.TRUE:
            return true;
          case VT.FALSE:
            return false;

          case VT.EMPTY:
            return "";
          case VT.ZERO:
            return 0;
          case VT.NULL:
            return null;

          case VT.NAN:
            return NaN;
          case VT.INFINITY:
            return Infinity;
          case -VT.INFINITY:
            return -Infinity;

          default:
          case VT.UNDEFINED:
            break;
        }
      };

    // any json value
    this.decode = (reviver = null) => {
      const value = _value(reviver);
      return reviver ? reviver("", value) : value;
    };
  }
}

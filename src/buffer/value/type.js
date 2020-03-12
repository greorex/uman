/**
 * ArrayBuffer writer and reader, with auto offset
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

/**
 * for serialization, value types enum
 * max 127
 */
export default {
  // system
  ENTRY: 1,
  END: 127,
  // base
  UNDEFINED: 2,
  NULL: 3,
  OBJECT: 4,
  ARRAY: 5,
  // boolean
  FALSE: 11,
  TRUE: 12,
  // string
  EMPTY: 20,
  STRING8: 21, // up to UNIT8
  STRING16: 22, // up to UINT16
  STRING32: 23, // up to UINT32
  // number
  NAN: 30,
  ZERO: 31,
  INFINITY: 32,
  // integer
  UINT8: 41, // 215
  UINT16: 42, // 214
  UINT32: 43, // 213
  // < 0 = -1*t
  // or as uint
  N_UINT8: 215,
  N_UINT16: 214,
  N_UINT32: 213,
  // big
  BIGINT: 51,
  // float
  FLOAT32: 61,
  FLOAT64: 62
};

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

/**
 * default unit's options
 */
export default {
  timeout: 5 * 1000, // unit alive?
  packager: 0 // default || PackagerMethod
};

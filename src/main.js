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

import { UnitsManager } from "./manager";

/**
 * main unit with built in manager
 */
export class UnitMain extends UnitsManager {
  constructor(name = "main") {
    super();

    // atach
    this.name = name;
    this._units = {
      [this.name]: this
    };
  }
}

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

import Base from "./base";
import { UnitsManager } from "./manager";

/**
 * main unit with built in manager
 */
export class UnitMain extends Base {
  constructor(name = "main") {
    super(new UnitsManager());

    // attach
    // @ts-ignore
    this.add({
      [name]: this
    });
  }
}

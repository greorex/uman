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
import Manager from "./manager";

/**
 * main unit with built in manager
 */
export class UnitMain extends Base {
  constructor(name = "main") {
    super(new Manager());
    // attach
    this.add({
      [name]: this
    });
  }
  add(units) {
    return this._handler.add(units);
  }
  select(filter = "all") {
    return this._handler.select(filter);
  }
  // start(name = null) {
  //   return this._handler.start(name);
  // }
  // terminate(name = null) {
  //   return this._handler.terminate(name);
  // }
}

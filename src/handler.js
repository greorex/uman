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

import { MessageType as MT } from "./enums";
import ProxyUnits from "./proxy";
import Calls from "./calls";
import Options from "./options";

/**
 * unit calls engine
 */
export default class Handler {
  constructor() {
    this.options = { ...Options };
    this.calls = new Calls(this);
    this.units = new ProxyUnits(this);
    // to be set
    this._unit = null;
    this.name = "";
  }

  dispatch(data) {
    switch (data.type) {
      case MT.REQUEST:
        return this.calls.oncall(data, this);

      case MT.EVENT:
        this.onevent(data);
    }
  }

  redispatch(data) {
    return this.dispatch(data);
  }

  // handler's

  onevent(data) {
    const { method, args, sender } = data;
    if (!sender) {
      // sibscribers of unit
      this._unit.fire(method, ...args);
    } else {
      const p = this.units[sender];
      // sibscribers of sender?
      if (p) {
        p.fire(method, ...args);
      }
      // sibscribers of units
      this.units.fire(method, sender, ...args);
    }
  }

  oncall(data) {
    const { method, args } = data;
    // exists?
    if (!(method in this._unit)) {
      throw new Error(`Method ${method} has to be declared in ${data.target}`);
    }
    // may be async as well
    return this._unit[method](...args);
  }

  // to override

  async start() {}

  async terminate() {}
}

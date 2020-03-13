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
import options from "./options";
import Calls from "./calls";
import Emitter from "./emitter";
import { UnitsProxy } from "./proxy";

/**
 * unit base call engine
 */
export class UnitBase extends Emitter {
  constructor() {
    super();

    this.options = { ...options };

    // manager engine
    this.name = "";
    this.units = new UnitsProxy(this);
    this._calls = new Calls(this);

    // no then function
    // if promise check
    this.then = undefined;

    // proxy engine
    return new Proxy(this, {
      get: (t, prop) =>
        prop in t
          ? t[prop]
          : (...args) =>
              t._dispatch({
                type: MT.REQUEST,
                target: t.name,
                method: prop,
                args
              })
    });
  }

  async start() {}

  async terminate() {}

  _onevent(data) {
    const { method, args, sender } = data;
    // new routine
    if (!sender) {
      // sibscribers of this
      this.fire(method, ...args);
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

  _oncall(data) {
    const { method, args } = data;
    if (!(method in this)) {
      throw new Error(`Method ${method} has to be declared in ${data.target}`);
    }
    // may be async as well
    return this[method](...args);
  }

  _dispatch(data) {
    switch (data.type) {
      case MT.REQUEST:
        return this._calls._oncall(data, this);

      case MT.EVENT:
        this._onevent(data);
    }
  }

  _redispatch(data) {
    return this._dispatch(data);
  }
}

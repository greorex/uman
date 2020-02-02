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

import { MessageType } from "./enums";
import { UnitOptionsDefault } from "./options";
import { UnitsProxy } from "./proxy";
import { UnitCallsEngine } from "./calls";
import { UnitEventEmitter } from "./emitter";

// locals
const EVENT = MessageType.EVENT;
const REQUEST = MessageType.REQUEST;

/**
 * unit base call engine
 */
export class UnitBase extends UnitEventEmitter {
  constructor() {
    super();

    this.options = { ...UnitOptionsDefault };

    // manager engine
    this.name = "";
    this.units = new UnitsProxy(this);
    this._redispatch = data => this._dispatch(data);

    // call engine
    this._calls = new UnitCallsEngine(this);

    // proxy engine
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // own asked
        if (prop in t) return Reflect.get(t, prop, receiver);
        // method asked
        return (...args) =>
          receiver._dispatch({
            type: REQUEST,
            target: receiver.name,
            method: prop,
            args
          });
      }
    });
  }

  async init() {}

  terminate() {}

  _onevent(data) {
    const { method, args, sender } = data;
    // new routine
    if (!sender)
      // sibscribers of this
      this.fire(method, ...args);
    else {
      const p = this.units[sender];
      // sibscribers of sender
      if (p) p.fire(method, ...args);
      // sibscribers of units
      this.units.fire(method, sender, ...args);
    }
  }

  _oncall(data) {
    const { method, args } = data;
    if (!(method in this))
      throw new Error(`Method ${method} has to be declared in ${data.target}`);
    // may be async as well
    return this[method](...args);
  }

  _dispatch(data) {
    switch (data.type) {
      case REQUEST:
        return this._calls._oncall(data, this);

      case EVENT:
        this._onevent(data);
    }
  }
}

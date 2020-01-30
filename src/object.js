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
 * unit object base, event emitter
 */
export class UnitObject {
  constructor() {
    this._listeners = {};
  }

  on(event, f) {
    if (!(f instanceof Function))
      throw new Error(`Wrong type of listener for ${event}`);
    let el = this._listeners[event];
    if (!el) el = this._listeners[event] = [];
    el.push(f);
    return this;
  }

  off(event, f) {
    const el = this._listeners[event];
    if (el) this._listeners[event] = el.filter(i => i !== f);
    return this;
  }

  fire(event, ...args) {
    const el = this._listeners[event];
    if (el) el.every(f => f(...args));
    return this;
  }

  _oncall(data) {
    const { method, args } = data;
    if (!(method in this))
      throw new Error(`Method ${method} has to be declared in ${data.target}`);
    // may be async as well
    return this[method](...args);
  }
}

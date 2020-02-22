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
 * simple event emitter
 */
export class UnitEventEmitter {
  constructor() {
    // private
    const _listeners = {};

    // subscribes on event
    this.on = (event, f) => {
      if (typeof f !== "function")
        throw new Error(`Wrong type of listener for ${event}`);
      let el = _listeners[event];
      if (!el) {
        el = _listeners[event] = [];
      }
      el.push(f);
      // returns off function
      return () => {
        _listeners[event] = el.filter(i => i !== f);
      };
    };

    // emits event
    this.fire = (event, ...args) => {
      const el = _listeners[event];
      if (!el) return;
      for (let f of el) {
        f(...args);
      }
    };
  }
}

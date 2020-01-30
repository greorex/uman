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

import { MessageType, TargetType } from "./enums";

/**
 * Units proxy target engine
 */
class UnitsProxyTarget {
  constructor(unit, target) {
    // 2. other.post(method, ...args) -> to other
    this.post = (method, ...args) =>
      unit._redispatch({
        type: MessageType.EVENT,
        target,
        method,
        payload: args
      });
    // 3. async other.method(...args) -> call other's method
    // 4. set other.onevent(...args)
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // if own asked, 'onmethod'
        if (prop in t) return Reflect.get(t, prop, receiver);
        // request method
        return (...args) =>
          unit._redispatch({
            type: MessageType.REQUEST,
            target,
            method: prop,
            payload: args
          });
      }
    });
  }
}

/**
 * Units fast access to other units
 */
export class UnitsProxy {
  constructor(unit) {
    // 1. unit.units.post(method, ...args) -> to all units
    this.post = (method, ...args) =>
      unit._redispatch({
        type: MessageType.EVENT,
        target: TargetType.ALL,
        method,
        payload: args
      });

    // const other = unit.units.other;
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        let value = Reflect.get(t, prop, receiver);
        if (!value) {
          // asume "other" asked
          value = new UnitsProxyTarget(unit, prop);
          Reflect.set(t, prop, value, receiver);
        }
        return value;
      }
    });
  }
}

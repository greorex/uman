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

// locals
const EVENT = MessageType.EVENT;
const REQUEST = MessageType.REQUEST;
const ALL = TargetType.ALL;

/**
 * Units proxy target engine
 */
export class UnitsProxyTarget {
  constructor(unit, target) {
    this.target = target;

    // 2. other.post(method, ...args) -> to other
    this.post = (method, ...args) =>
      unit._redispatch({
        type: EVENT,
        target,
        method,
        args
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
            type: REQUEST,
            target,
            method: prop,
            args
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
        type: EVENT,
        target: ALL,
        method,
        args
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

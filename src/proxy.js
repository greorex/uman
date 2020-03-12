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

import { MessageType as MT, TargetType as TT } from "./enums";
import Emitter from "./emitter";

/**
 * Units proxy base
 */
class ProxyBase extends Emitter {
  constructor(handler, target) {
    super();

    // no then function
    // if promise check
    this.then = undefined;

    // no toJSON
    this.toJSON = undefined;

    // 1. unit.units.post(method, ...args) -> to all units
    // 2. other.post(method, ...args) -> to other
    this.post = (method, ...args) =>
      handler._redispatch({
        type: MT.EVENT,
        target: target,
        sender: handler.name,
        method,
        args
      });
  }
}

/**
 * Units proxy target engine
 */
export class UnitsProxyTarget extends ProxyBase {
  constructor(handler, target) {
    super(handler, target);

    this._target = target;

    // 3. async other.method(...args) -> call other's method
    // 4. set other.onevent(...args)
    return new Proxy(this, {
      get: (t, prop) =>
        prop in t
          ? // if own asked, 'onmethod'
            t[prop]
          : // request method
            (...args) =>
              handler._redispatch({
                type: MT.REQUEST,
                target,
                method: prop,
                args
              })
    });
  }
}

/**
 * Units fast access to other units
 */
export class UnitsProxy extends ProxyBase {
  constructor(handler) {
    super(handler, TT.ALL);

    // const other = unit.units.other;
    return new Proxy(this, {
      get: (t, prop) => {
        let value = t[prop];
        if (!value) {
          // asume "other" asked
          value = new UnitsProxyTarget(handler, prop);
          t[prop] = value;
        }
        return value;
      }
    });
  }
}

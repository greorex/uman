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
import { UnitObject } from "./object";
import { UnitsProxy } from "./proxy";
import { UnitCallsEngine } from "./calls";

// locals
const EVENT = MessageType.EVENT;
const REQUEST = MessageType.REQUEST;

/**
 * default unit's options
 */
export const UnitOptionsDefault = {
  timeout: 0 //5000
};

/**
 * unit base call engine
 */
export class UnitBase extends UnitObject {
  constructor() {
    super();

    this.options = { ...UnitOptionsDefault };

    // call engine
    this._calls = new UnitCallsEngine(this);

    // manager engine
    this.name = "";
    this.units = new UnitsProxy(this);
    this._redispatch = data => this._dispatch(data);

    // proxy engine
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // own asked
        if (prop in t) return Reflect.get(t, prop, receiver);
        // method asked
        return (...args) =>
          receiver._dispatch({
            type: REQUEST,
            method: prop,
            args
          });
      }
    });
  }

  _assign(name) {
    this.name = name;
  }

  terminate() {}

  _onevent(data) {
    const { method, args, sender } = data;
    // do if exists
    // trick to have short 'on...'
    if (sender) {
      // unit.units.sender.onmethod(...args)
      // priority #1
      const p = this.units[sender];
      if (p) {
        const m = `on${method}`;
        if (m in p && p[m](...args)) return;
      }

      // onsendermethod(...args)
      // priority #2
      const m = `on${sender}${method}`;
      if (m in this && this[m](...args)) return;
    }

    // raw call 'onmethod(eventobject)'
    // priority #3
    const m = `on${method}`;
    m in this && this[m](data);
  }

  _dispatch(data) {
    switch (data.type) {
      case REQUEST:
        return this._calls.execute(data, this);

      case EVENT:
        this._onevent(data);
    }
  }
}

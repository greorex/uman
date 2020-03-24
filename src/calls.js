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

import { ReferenceType as RT } from "./enums";

/**
 * engine to execute calls with built in cache
 */
export default class Calls extends Map {
  constructor(handler) {
    super();

    // key
    let _n = 0;
    this.store = value => {
      _n++;
      this.set(_n, value);
      return _n;
    };

    // redispatcher
    this._handler = handler;
  }

  oncall(data, handler) {
    const ref = data.handler;

    // default context
    if (!(ref && ref.owner === handler.name)) {
      return handler.oncall(data);
    }

    // by reference
    const { type, id, owner } = ref;

    switch (type) {
      case RT.OBJECT: {
        const { method, args } = data,
          o = this.get(id);
        if (!(typeof o === "object" && method in o)) {
          throw new Error(`Wrong object for ${method} in ${owner}`);
        }
        return o[method](...args);
      }

      case RT.FUNCTION: {
        const f = this.get(id);
        if (typeof f !== "function") {
          throw new Error(`Wrong function reference in ${owner}`);
        }
        return f(...data.args);
      }
    }
  }
}

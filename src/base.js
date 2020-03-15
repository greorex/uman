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
import Emitter from "./emitter";
import Handler from "./handler";

/**
 * Unit base for all units
 */
export default class Base extends Emitter {
  constructor(handler = null) {
    super();

    // no then function
    // if promise check
    this.then = undefined;

    if (!handler) {
      handler = new Handler();
    } else if (!(handler instanceof Handler)) {
      throw new Error(`Engine is not a Handler based`);
    }

    // attach
    this._handler = handler;

    // set proxy engine
    handler.unit = new Proxy(this, {
      get: (t, prop) => {
        if (prop in handler) {
          const v = handler[prop];
          return typeof v === "function"
            ? (...args) => v.apply(handler, args)
            : v;
        }
        return prop in t
          ? t[prop]
          : (...args) =>
              handler.dispatch({
                type: MT.REQUEST,
                target: handler.name,
                method: prop,
                args
              });
      }
    });

    // proxied
    return handler.unit;
  }

  // to override

  async start() {}

  async terminate() {}
}

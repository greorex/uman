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
  constructor(handler = new Handler()) {
    super();

    this._handler = handler;

    // no then function
    // if promise check
    this.then = undefined;

    // attach
    if (!(handler instanceof Handler)) {
      throw new Error(`Engine is not a Handler based`);
    }

    // set proxy engine
    handler.unit = new Proxy(this, {
      get: (t, prop) =>
        prop in t
          ? t[prop]
          : prop in handler
          ? handler[prop]
          : (...args) =>
              handler.dispatch({
                type: MT.REQUEST,
                target: handler.name,
                method: prop,
                args
              })
    });

    return handler.unit;
  }

  // to override

  async start() {}

  async terminate() {}
}

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
import WorkerHandler from "./worker";

/**
 * Unit base for all units
 */
export default class Base extends Emitter {
  constructor(handler) {
    super();

    // no then function
    // if promise check
    this.then = undefined;

    if (!handler) {
      handler = new Handler();
    } else if (!(handler instanceof Handler)) {
      throw new Error(`Handler is not a Handler based`);
    }

    // workers routines
    if (handler instanceof WorkerHandler) {
      this.postMessage = (...args) => handler.postMessage(...args);
      // @ts-ignore
      handler.onmessage = event => this.onmessage && this.onmessage(event);
      // to self and back
      this.post = (event, ...args) =>
        handler.dispatch({
          type: MT.EVENT,
          method: event,
          args
        });
    }

    // proxy routine
    handler._unit = new Proxy(this, {
      get: (t, prop) =>
        prop in t
          ? t[prop]
          : (...args) =>
              handler.dispatch({
                type: MT.REQUEST,
                target: handler.name,
                method: prop,
                args
              })
    });

    // attach
    this._handler = handler;
    this.units = handler.units;

    // as proxied
    return handler._unit;
  }

  async start(...args) {
    return this._handler.start(...args);
  }
  async terminate(...args) {
    return this._handler.terminate(...args);
  }
}

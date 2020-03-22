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
  constructor(handler, adapter = null) {
    super();

    // no then function
    // if promise check
    this.then = undefined;

    // check
    if (!(handler instanceof Handler)) {
      throw new Error(`${handler} is not a Handler based`);
    }

    // set it up
    this.name = handler.name;
    this.units = handler.units;
    this.options = handler.options;
    this.start = async (...args) => handler.start(...args);
    this.terminate = async (...args) => handler.terminate(...args);

    // attach
    this._handler = handler;

    // final
    let unit = this;

    // worker?
    if (handler instanceof WorkerHandler) {
      // standard
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

      // proxy routine
      unit = new Proxy(this, {
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
    }

    // adapter?
    if (adapter) {
      if (typeof adapter === "object") {
        // as {}
        if (Object.getPrototypeOf(adapter) !== Object.prototype) {
          throw new Error(`${adapter} is not a simple object`);
        }
        // just copy
        unit = Object.assign(unit, adapter);
      } else {
        // as class
        if (!(typeof adapter === "function" && adapter.constructor)) {
          throw new Error(`${adapter} is not a class`);
        }
        // set Base as a prototype
        let prototype = adapter.prototype;
        for (
          let p = Object.getPrototypeOf(prototype);
          p !== Object.prototype && p !== Function.prototype;
          p = Object.getPrototypeOf(p)
        ) {
          prototype = p;
        }
        Object.setPrototypeOf(prototype, unit);
        // create unit
        unit = new adapter();
      }
    }

    return (handler._unit = unit);
  }
}

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

import { TargetType as TT } from "./enums";
import CS from "./critical";
import Handler from "./handler";
import Base from "./base";
import Loader from "./loader";

/**
 * units orchestration engine
 */
export class UnitsManager extends Handler {
  constructor(units = {}) {
    super();

    // critical sections
    this.loader = new CS();
    // real list
    this.handlers = {};

    // copy entries
    this.add(units);
  }

  select(filter = "all") {
    const handler = this.handlers[filter],
      replacer = h => (h instanceof Handler ? h.unit : h);
    // unit?
    if (handler) {
      return replacer(handler);
    }
    // as array
    const all = Object.values(this.handlers).map(replacer);
    // by filter or all
    return filter === "loaded" ? all.filter(v => v instanceof Base) : all;
  }

  // override
  async redispatch(data) {
    const { target, sender } = data;
    switch (target) {
      case TT.ALL:
        // to all loaded except sender
        for (let [name, handler] of Object.entries(this.handlers)) {
          if (name !== sender && handler instanceof Handler) {
            handler.dispatch(data);
          }
        }
        return;

      default:
        // to target, load if doesn't
        const handler = await this.start(target);
        if (handler) {
          return handler.dispatch(data);
        }
    }

    // not a unit or wrong target
    throw new Error(`Wrong target unit: ${target}`);
  }

  attach(name, unit) {
    const { _handler } = unit;
    // set it up
    _handler.name = name;
    // common
    if (_handler !== this) {
      _handler.calls = this.calls;
      _handler.redispatch = data => this.redispatch(data);
    }
    // update list
    this.handlers[name] = _handler;
  }

  add(units) {
    for (let [name, loader] of Object.entries(units)) {
      // check duplication
      if (this.handlers[name]) {
        throw new Error(`Unit ${loader} already exists`);
      }
      // check name (simple)
      switch (name) {
        // !methods
        case "then":
        case "post":
        case "fire":
        case "on":
        case "all":
        case "loaded":
          throw new Error(`Wrong unit name: ${name}`);
      }
      // unit isn't lazy?
      if (loader instanceof Base) {
        this.attach(name, loader);
      } else {
        // as loader
        if (!loader) {
          throw new Error(`Wrong loader for unit: ${name}`);
        }

        if (loader.loader) {
          loader.name = name;
        } else {
          loader = { loader, name };
        }

        // update list
        this.handlers[name] = new Loader(loader);
      }
    }
  }

  async start(name) {
    if (!name) {
      return;
    }
    // get
    let handler = this.handlers[name];
    if (handler instanceof Handler) {
      return handler;
    }
    // load if doesn't
    if (handler instanceof Loader) {
      return this.loader.enter(async (leave, reject) => {
        try {
          let unit = await handler.instance();
          this.attach(name, unit);
          await unit.start();
          leave(unit._handler);
        } catch (error) {
          reject(error);
        }
      });
    }
  }

  async terminate(name) {
    if (name) {
      // by name
      const handler = this.handlers[name];
      // stop it if loaded
      if (handler instanceof Handler) {
        await handler.unit.terminate();
      }
      // drop it
      if (handler) {
        delete this.handlers[name];
      }
    } else {
      // all but this
      for (let [key, handler] of Object.entries(this.handlers)) {
        if (handler !== this) {
          await this.terminate(key);
        }
      }
    }
  }
}

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

import { TargetType } from "./enums";
import { UnitBase } from "./base";
import { UnitLoader } from "./loader";
import { Unit } from "./unit";
import CS from "./critical";

// locals
const ALL = TargetType.ALL;

/**
 * units orchestration engine
 */
export class UnitsManager extends Unit {
  constructor(units = {}) {
    super();
    // critical sections
    this._loader = new CS();
    // real list
    this._units = {};
    // copy entries
    this.add(units);
  }

  // override
  async _redispatch(data) {
    const { target, sender } = data;
    switch (target) {
      case ALL:
        // to all loaded except sender
        for (let [name, unit] of Object.entries(this._units)) {
          if (name !== sender && unit instanceof UnitBase) {
            unit._dispatch(data);
          }
        }
        return;

      default:
        // to target, load if doesn't
        const unit = await this.start(target);
        if (unit) {
          return unit._dispatch(data);
        }
    }

    // not a unit or wrong target
    throw new Error(`Wrong target unit: ${target}`);
  }

  _attach(name, unit) {
    unit.name = name;
    // common
    // @ts-ignore
    unit._calls = this._calls;
    unit._redispatch = data => this._redispatch(data);
    // update list
    this._units[name] = unit;
  }

  add(units) {
    for (let [name, loader] of Object.entries(units)) {
      // check duplication
      if (this._units[name]) {
        throw new Error(`Unit ${loader} already exists`);
      }
      // check name (simple)
      if (typeof name !== "string") {
        switch (name) {
          // !methods
          case "then":
          case "post":
          case "fire":
          case "on":
            throw new Error(`Wrong unit name: ${name}`);
        }
      }
      // unit isn't lazy?
      if (loader instanceof UnitBase) {
        this._attach(name, loader);
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
        this._units[name] = new UnitLoader(loader);
      }
    }
  }

  // override
  async start(name = null) {
    if (name) {
      // get
      let unit = this._units[name];
      if (unit instanceof UnitBase) {
        return unit;
      }
      // load if doesn't
      if (unit) {
        return this._loader.enter(async (leave, reject) => {
          try {
            unit = await unit.instance();
            this._attach(name, unit);
            await unit.start();
            leave(unit);
          } catch (error) {
            reject(error);
          }
        });
      }
    }
  }

  // override
  async terminate(name = null) {
    const _terminate = async key => {
      const unit = this._units[key];
      // stop it if loaded
      if (unit instanceof UnitBase) {
        await unit.terminate();
      }
      // drop it
      if (unit) {
        delete this._units[key];
      }
    };

    if (name) {
      return await _terminate(name);
    }

    // do not delete this
    for (let [key, unit] of Object.entries(this._units)) {
      if (unit !== this) {
        await _terminate(key);
      }
    }
  }
}

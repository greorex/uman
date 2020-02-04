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

// locals
const ALL = TargetType.ALL;

/**
 * units orchestration engine
 */
export class UnitsManager extends Unit {
  constructor(units = {}) {
    super();

    // critical section
    this._cs = Promise.resolve(undefined);

    // real list
    this._units = {};
    // copy entries
    this.add(units);

    // override redispatcher
    this._redispatch = async data => {
      const { target, sender } = data;
      switch (target) {
        case ALL:
          // to all loaded except sender
          for (let [name, unit] of Object.entries(this._units))
            if (name !== sender && unit instanceof UnitBase)
              unit._dispatch(data);
          return;

        default:
          // to target, load if doesn't
          const unit = await this.start(target);
          if (unit) return unit._dispatch(data);
      }

      // not a unit or wrong target
      throw new Error(`Wrong target unit: ${target}`);
    };
  }

  async start(name = null) {
    if (name) {
      // wait to enter
      await this._cs;
      // get
      let unit = this._units[name];
      // load if doesn't
      if (unit instanceof UnitLoader) {
        // enter
        this._cs = new Promise(async resolve => {
          unit = await unit.start();
          this._attach(name, unit);
          resolve(unit);
        });
        // leave
        unit = this._cs;
      }
      return unit;
    }
  }

  _attach(name, unit) {
    // attach
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
      if (this._units[name]) throw new Error(`Unit ${loader} already exists`);
      // check name (simple)
      if (typeof name !== "string" || "post" === name)
        throw new Error(`Wrong unit name: ${name}`);
      // unit isn't lazy?
      if (loader instanceof UnitBase) this._attach(name, loader);
      // update list
      else this._units[name] = new UnitLoader(loader, name);
    }
  }

  terminate(name = null) {
    const _terminate = key => {
      const unit = this._units[key];
      // stop it if loaded
      if (unit instanceof UnitBase) unit.terminate();
      // drop it
      if (unit) delete this._units[key];
    };

    if (name) _terminate(name);
    else {
      // do not delete this
      for (let [key, unit] of Object.entries(this._units))
        if (unit !== this) _terminate(key);
    }
  }
}

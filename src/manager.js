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
import { UnitWorker } from "./worker";
import { Unit } from "./unit";

// locals
const ALL = TargetType.ALL;

/**
 * lazy loader engine
 */
class UnitLazyLoader extends UnitBase {
  constructor(loader) {
    super();

    // resolve it later
    this._resolved = unit => unit;
    this._dispatch = async data => {
      let unit = loader;
      // case function
      if (unit instanceof Function) unit = unit();
      // case worker
      if (unit instanceof Worker) unit = new UnitWorker(unit);
      // case promise
      if (unit instanceof Promise) {
        const m = await unit.then();
        // may be as 'export default class'
        if (m.default instanceof Function) unit = new m.default();
      }
      // finaly unit has to be as
      if (!(unit instanceof UnitBase))
        throw new Error(`Wrong class of unit: ${this.name}`);
      // reatach
      this._resolved(unit);
      // initialize
      await unit.init();
      // call proper method
      return unit._dispatch(data);
    };
  }
}

/**
 * units orchestration engine
 */
export class UnitsManager extends Unit {
  constructor(units = {}) {
    super();

    // real list
    this._units = {};
    // copy entries
    this.add(units);

    // override redispatcher
    this._redispatch = data => {
      const { target, sender } = data;
      switch (target) {
        case ALL:
          // to all except sender
          for (let [name, unit] of Object.entries(this._units))
            if (name !== sender && !(unit instanceof UnitLazyLoader))
              unit._dispatch(data);
          return;

        default:
          // to target, load if doesn't
          const unit = this._units[target];
          if (unit) return unit._dispatch(data);
      }

      // not a unit or wrong target
      throw new Error(`Wrong target unit: ${target}`);
    };
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
      // every unit is lazy?
      if (!(loader instanceof UnitBase)) {
        loader = new UnitLazyLoader(loader);
        loader._resolved = u => this._attach(name, u);
      }
      // update list
      this._attach(name, loader);
    }
  }

  terminate(name = null) {
    const _terminate = key => {
      const unit = this._units[key];
      // stop it if loaded
      if (!(unit instanceof UnitLazyLoader)) unit.terminate();
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

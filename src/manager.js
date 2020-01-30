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

/**
 * lazy loader engine
 */
class UnitLazyLoader extends UnitBase {
  constructor(value) {
    super();

    this._loaded = unit => unit;
    // resolve it later
    this._dispatch = async data => {
      // case function
      if (value instanceof Function) value = value();
      // case worker
      if (value instanceof Worker) value = new UnitWorker(value);
      // case promise
      if (value instanceof Promise) {
        value = await value.then();
        // may be as 'export default class'
        if (value.default instanceof Function) value = new value.default();
      }
      // reatach
      value = this._loaded(value);
      // call proper method
      return value._dispatch(data);
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
        case TargetType.ALL:
          // to all except sender
          for (let [name, unit] of Object.entries(this._units))
            if (
              name !== sender &&
              !(unit instanceof UnitLazyLoader) &&
              unit instanceof UnitBase
            )
              unit._dispatch(data);
          return;

        default:
          const unit = this._units[target];
          if (unit instanceof UnitBase)
            // load if doesn't
            return unit._dispatch(data);
      }

      // not a unit or wrong target
      throw new Error(`Wrong target unit: ${target}`);
    };
  }

  _attachUnit(name, value) {
    let unit;
    // case lazy
    if (
      value instanceof Function ||
      value instanceof Worker ||
      value instanceof Promise
    ) {
      unit = new UnitLazyLoader(value);
      unit._loaded = u => this._attachUnit(unit.name, u);
    }

    // default
    if (!unit) unit = value;
    // finaly unit has to be as
    if (!(unit instanceof UnitBase))
      throw new Error(`Wrong class of unit: ${name}`);

    // attach
    unit.name = name;
    unit._redispatch = data => {
      // to know who
      data.sender = unit.name;
      return this._redispatch(data);
    };
    // common
    unit._listeners = this._listeners;
    unit._calls = this._calls;

    // update list
    this._units[name] = unit;
    return unit;
  }

  add(units) {
    for (let [name, unit] of Object.entries(units)) {
      // check duplication
      if (this._units[name]) throw new Error(`Unit ${unit} already exists`);
      // check name (simple)
      if (typeof name !== "string" || "post" === name)
        throw new Error(`Wrong unit name: ${name}`);
      // check unit
      this._attachUnit(name, unit);
    }
    return this;
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
      // stop it
      super.terminate();
      // drop it
      delete this._units[this.name];
      // delete all
      for (let key of Object.keys(this._units)) _terminate(key);
    }
  }
}

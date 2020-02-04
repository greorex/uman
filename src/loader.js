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

import { UnitBase } from "./base";
import { UnitWorker } from "./adapters/dedicated";
import { UnitSharedWorker } from "./adapters/shared";

/**
 * lazy loader engine
 */
export class UnitLoader {
  constructor(loader) {
    this.name = "";
    this.load = async (adapterClass = null) => {
      let unit = loader;
      // case function
      if (unit instanceof Function) unit = unit();
      // case promise
      if (unit instanceof Promise) {
        const m = await unit.then();
        // may be as 'export default class'
        if (m.default instanceof Function) unit = new m.default();
      }
      // case worker
      if (unit instanceof Worker) {
        if (!adapterClass) adapterClass = UnitWorker;
        unit = new adapterClass(unit);
      }
      // case shared worker
      // @ts-ignore
      if (unit instanceof SharedWorker) {
        if (!adapterClass) adapterClass = UnitSharedWorker;
        unit = new adapterClass(unit);
      }
      // finaly unit has to be as
      if (!(unit instanceof UnitBase))
        throw new Error(`Wrong class of unit: ${this.name}`);
      // call proper method
      return unit;
    };
  }

  static load(loader, adapterClass = null) {
    const unit = new UnitLoader(loader);
    return unit.load(adapterClass);
  }
}

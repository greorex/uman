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
  constructor(loader, name = "") {
    this.start = async (adapterClass = null) => {
      let unit = loader;
      // case function
      if (unit instanceof Function) unit = unit();
      // case promise
      if (unit instanceof Promise) {
        unit = await unit;
        // may be as 'export default class'
        if (unit.default instanceof Function) unit = new unit.default();
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
        throw new Error(`Wrong class of unit: ${name}`);
      // own start
      unit.name = name;
      await unit.start();
      return unit;
    };
  }

  static start(loader, adapterClass = null) {
    return new UnitLoader(loader).start(adapterClass);
  }
}

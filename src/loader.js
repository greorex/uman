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
import { UnitServiceWorker } from "./adapters/service";

/**
 * lazy loader engine
 */
export class UnitLoader {
  constructor(loader, name = "") {
    this.instance = async (adapterClass = null) => {
      let unit = loader;

      // load
      // case function
      if (unit instanceof Function) unit = unit();
      // case promise
      if (unit instanceof Promise) {
        unit = await unit;
        // may be as 'export default class'
        if (unit && unit.default instanceof Function) unit = new unit.default();
      }

      // init
      if (unit) {
        // case worker
        if (typeof Worker !== "undefined" && unit instanceof Worker) {
          if (!adapterClass) adapterClass = UnitWorker;
          unit = new adapterClass(unit);
        }
        // case shared worker
        if (
          // @ts-ignore
          typeof SharedWorker !== "undefined" &&
          // @ts-ignore
          unit instanceof SharedWorker
        ) {
          if (!adapterClass) adapterClass = UnitSharedWorker;
          unit = new adapterClass(unit);
        }
        // case service worker
        // should be ServiceWorkerContainer
        if (
          typeof navigator !== "undefined" &&
          "serviceWorker" in navigator &&
          "controller" in unit
        ) {
          // and the page has to be controlled
          if (!unit.controller)
            throw new Error(`There is no active service worker for: ${name}`);
          if (!adapterClass) adapterClass = UnitServiceWorker;
          unit = new adapterClass(unit);
        }
      }

      // final check
      if (!(unit instanceof UnitBase))
        throw new Error(`Wrong class of unit: ${name}`);

      // done
      return unit;
    };
  }

  static instance(adapterClass, loader) {
    return new UnitLoader(loader).instance(adapterClass);
  }
}

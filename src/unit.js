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
import { UnitWorkerSelf } from "./workers/dedicated";
import { UnitSharedWorkerSelf } from "./workers/shared";
import { UnitServiceWorkerSelf } from "./workers/service";

/**
 * determines unit base class by globalThis
 */
const UnitAutoClass = () => {
  if (self && self.self && self.importScripts instanceof Function) {
    if ("clients" in self) return UnitServiceWorkerSelf;
    if (self.postMessage instanceof Function) return UnitWorkerSelf;
    if (self.close instanceof Function) return UnitSharedWorkerSelf;
    // don't know where we are
    throw new Error("Unknown global scope");
  }
  return UnitBase;
};

/**
 * unit with autoselected base class
 */
export class Unit extends UnitAutoClass() {
  static instance(unitClass) {
    // create unit instance
    switch (UnitAutoClass()) {
      case UnitWorkerSelf:
      case UnitSharedWorkerSelf:
      case UnitServiceWorkerSelf:
        return new unitClass();
    }
    // on demand
    return unitClass;
  }
}

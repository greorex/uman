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
  // @ts-ignore
  if (typeof DedicatedWorkerGlobalScope !== "undefined") return UnitWorkerSelf;
  // @ts-ignore
  if (typeof SharedWorkerGlobalScope !== "undefined")
    return UnitSharedWorkerSelf;
  // @ts-ignore
  if (typeof ServiceWorkerGlobalScope !== "undefined")
    return UnitServiceWorkerSelf;

  // default
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

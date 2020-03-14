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

import Base from "./base";
import { UnitWorkerSelf } from "./workers/dedicated";
import { UnitSharedWorkerSelf } from "./workers/shared";
import { UnitServiceWorkerSelf } from "./workers/service";

/**
 * local to determine unit base class by globalThis
 */
const _AutoClass = () => {
  switch ("function") {
    // @ts-ignore
    case typeof DedicatedWorkerGlobalScope:
      return UnitWorkerSelf;
    // @ts-ignore
    case typeof SharedWorkerGlobalScope:
      return UnitSharedWorkerSelf;
    // @ts-ignore
    case typeof ServiceWorkerGlobalScope:
      return UnitServiceWorkerSelf;
  }

  // default
  return Base;
};

/**
 * unit with autoselected base class
 */
export class Unit extends _AutoClass() {
  static instance(unitClass) {
    // create unit instance
    switch (_AutoClass()) {
      case UnitWorkerSelf:
      case UnitSharedWorkerSelf:
      case UnitServiceWorkerSelf:
        return new unitClass();
    }
    // on demand
    return unitClass;
  }
}

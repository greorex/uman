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
import { UnitWorkerSelf } from "./worker";

/**
 * determines unit base class by globalThis
 */
const UnitAutoClass = () => {
  if (
    self &&
    !self.window &&
    self.postMessage instanceof Function &&
    self.importScripts instanceof Function
  )
    return UnitWorkerSelf;
  return UnitBase;
};

/**
 * unit with autoselected base class
 */
export class Unit extends UnitAutoClass() {
  static instance(unitClass) {
    if (UnitWorkerSelf === UnitAutoClass()) return new unitClass();
    return unitClass;
  }
}

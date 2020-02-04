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

import { UnitWorkerEngine } from "../worker";

/**
 * unit base for worker script file
 */
export class UnitWorkerSelf extends UnitWorkerEngine {
  constructor(engine) {
    super(engine ? engine : self);

    this._oninit = async (name, options) => {
      this.name = name;
      this.options = { ...options };
      // initialize
      await this.init();
    };

    this._onterminate = async () => {
      await this.terminate();
    };
  }
}

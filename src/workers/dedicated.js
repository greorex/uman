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

import { WorkerBase, WorkerHandler } from "../worker";

/**
 * unit base for worker script file
 */
export class UnitWorkerSelf extends WorkerBase {
  constructor(handler = null) {
    super(handler ? handler : new WorkerHandler(self));
  }

  async _onstart(name, options) {
    const { _handler } = this;
    // set it up
    _handler.name = name;
    _handler.options = { ...options };
    // initialize
    await this.start();
  }

  async _onterminate() {
    await this.terminate();
  }
}

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

import { MessageType as MT } from "../enums";
import WorkerHandler from "../worker";

/**
 * unit handler for worker script file
 */
export default class DedicatedSelf extends WorkerHandler {
  constructor(engine) {
    super(engine ? engine : self);
  }

  // override

  oncall(data) {
    switch (data.type) {
      case MT.START: {
        const [name, options, ...args] = data.args;
        // set it up
        this._unit.name = this.name = name;
        this.options = { ...options };
        // run
        return this.start(...args);
      }
      case MT.TERMINATE:
        // stop
        return this.terminate(...data.args);
    }

    return super.oncall(data);
  }

  async start(...args) {
    await super.start(...args);
    await this._unit.start(...args);
  }

  async terminate(...args) {
    await this._unit.terminate(...args);
    await super.terminate(...args);
  }
}

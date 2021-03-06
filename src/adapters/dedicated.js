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
 * handler to redispatch from worker unit
 */
export default class Dedicated extends WorkerHandler {
  constructor(worker) {
    super(worker);
  }

  // override

  // to tell worker script
  async start(...args) {
    await super.start(...args);
    return this.dispatch({
      type: MT.START,
      args: [this.name, this.options, ...args]
    });
  }

  async terminate(...args) {
    await this.dispatch({
      type: MT.TERMINATE,
      args
    });
    this._engine().terminate();
    return super.terminate(...args);
  }

  // to redispatch
  onevent(data) {
    return data.target ? this.redispatch(data) : super.onevent(data);
  }

  oncall(data) {
    return data.target ? this.redispatch(data) : super.oncall(data);
  }

  static loader() {
    return [
      ({ loader }) => {
        if (loader instanceof Worker) {
          return new Dedicated(loader);
        }
      }
    ];
  }
}

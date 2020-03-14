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
 * local handler to redispatch
 */
class _Handler extends WorkerHandler {
  constructor(worker) {
    super(worker);
  }

  onevent(data) {
    return data.target ? this.redispatch(data) : super.onevent(data);
  }

  oncall(data) {
    return data.target ? this.redispatch(data) : super.oncall(data);
  }
}

/**
 * unit base for worker adapter
 */
export class UnitWorker extends WorkerBase {
  constructor(worker) {
    super(new _Handler(worker));

    // tell worker self

    this.terminate = async () => {
      // @ts-ignore
      await this._onterminate();
      // drop engine
      worker.terminate();
    };

    this.start = async () => {
      const { _handler } = this;
      // @ts-ignore
      await this._onstart(_handler.name, _handler.options);
    };
  }

  static loader() {
    return [
      ({ loader, adapter }) => {
        if (loader instanceof Worker) {
          return adapter ? new adapter(loader) : new UnitWorker(loader);
        }
      }
    ];
  }
}

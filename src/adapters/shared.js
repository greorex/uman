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

import { UnitWorker } from "./dedicated";

/**
 * shared worker adapter
 */
class Adapter {
  constructor(worker) {
    this.postMessage = (...args) => {
      worker.port.postMessage(...args);
    };
    // @ts-ignore
    worker.port.onmessage = event => this.onmessage(event);
    // @ts-ignore
    worker.onerror = error => this.onerror(error);
  }

  // absent
  terminate() {}
}

/**
 * unit base for shared worker adapter
 */
export class UnitSharedWorker extends UnitWorker {
  constructor(worker) {
    super(new Adapter(worker));
  }
}

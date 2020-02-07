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
 * service worker adapter
 */
class Adapter {
  constructor(worker) {
    // @ts-ignore
    worker.addEventListener("message", event => this.onmessage(event));
    this.postMessage = (...args) => {
      worker.controller.postMessage(...args);
    };
    // @ts-ignore
    worker.addEventListener("error", error => this.onerror(error));
  }

  // absent
  terminate() {}
}

/**
 * unit base for service worker adapter
 */
export class UnitServiceWorker extends UnitWorker {
  constructor(worker) {
    super(new Adapter(worker));
  }
}

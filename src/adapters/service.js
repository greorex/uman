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
    this.postMessage = (...args) => worker.controller.postMessage(...args);
    worker.onmessage = event => {
      const port = event.source ? event.source : worker.controller;
      this.postMessage = (...args) => port.postMessage(...args);
      // @ts-ignore
      this.onmessage(event);
    };
    // @ts-ignore
    worker.onerror = error => this.onerror(error);
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

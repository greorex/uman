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

import Dedicated from "./dedicated";

/**
 * local adapter to control shared worker
 */
class _Adapter {
  constructor(worker) {
    const port = worker.port;
    if (!(port && typeof port.postMessage === "function")) {
      throw new Error(`There is no 'postMessage' in ${worker}`);
    }
    this.postMessage = (...args) => port.postMessage(...args);
    // @ts-ignore
    port.addEventListener("message", event => this.onmessage(event));
    port.start();
    // @ts-ignore
    worker.addEventListener("error", error => this.onerror(error));
  }

  // absent
  terminate() {}
}

/**
 * unit base for shared worker adapter
 */
export default class Shared extends Dedicated {
  constructor(worker) {
    super(new _Adapter(worker));
  }

  static loader() {
    return [
      ({ loader }) => {
        // @ts-ignore
        if (loader instanceof SharedWorker) {
          return new Shared(loader);
        }
      }
    ];
  }
}

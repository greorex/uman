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

import { UnitWorkerSelf } from "./dedicated";

/**
 * shared worker adapter
 */
class Adapter {
  constructor(worker) {
    worker.onconnect = e => {
      const port = e.source;
      port.onmessage = event => {
        this.postMessage = (...args) => port.postMessage(...args);
        // @ts-ignore
        this.onmessage(event);
      };
    };
  }
}

/**
 * unit base for shared worker script file
 */
export class UnitSharedWorkerSelf extends UnitWorkerSelf {
  constructor() {
    super(new Adapter(self));
  }
}

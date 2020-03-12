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
 * to control shared worker
 */
class Adapter {
  constructor(worker) {
    const _postMessage = worker.port.postMessage;
    if (typeof _postMessage !== "function") {
      throw new Error(`There is no 'postMessage' in ${worker}`);
    }
    this.postMessage = function() {
      _postMessage.apply(worker.port, arguments);
    };
    worker.port.addEventListener("message", event => {
      // @ts-ignore
      this.onmessage(event);
    });
    worker.port.start();
    worker.addEventListener("error", error => {
      // @ts-ignore
      this.onerror(error);
    });
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

  static loader() {
    return [
      ({ loader, adapter }) => {
        // @ts-ignore
        if (loader instanceof SharedWorker) {
          // use default
          if (!adapter) adapter = UnitSharedWorker;
          // done
          return new adapter(loader);
        }
      }
    ];
  }
}

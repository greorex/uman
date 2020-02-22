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

import { UnitServiceWorkerSelf } from "./service";

/**
 * list of clients
 */
let clientsList = [];

/**
 * shared worker adapter
 */
class Adapter {
  constructor(engine) {
    // to all clients
    this.postMessage = (...args) => {
      for (let port of clientsList) {
        port.postMessage(...args);
      }
    };

    // new client
    engine.addEventListener("connect", e => {
      const port = e.source;

      port.addEventListener("message", event => {
        // engine to reply
        event._engine = port;
        // @ts-ignore
        this.onmessage(event);
      });

      port.start();

      // to broadcast
      clientsList.push(port);
    });
  }
}

/**
 * unit base for shared worker script file
 */
export class UnitSharedWorkerSelf extends UnitServiceWorkerSelf {
  constructor(engine = new Adapter(self)) {
    super(engine);
  }

  // override
  async _onterminate() {
    // active engine
    const engine = this.engine;
    // stop
    await super._onterminate();
    // update list
    if (engine) {
      clientsList = clientsList.filter(c => c !== engine);
      // no clients, terminate
      if (!clientsList.length) {
        close();
      }
    }
  }
}

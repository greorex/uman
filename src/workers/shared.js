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

import ServiceWorkerSelfHandler from "./service";

/**
 * list of clients
 */
let clientsList = [];

/**
 * local shared worker adapter
 */
class _Adapter {
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
export default class SharedWorkerHandlerSelf extends ServiceWorkerSelfHandler {
  constructor(engine) {
    super(engine ? engine : new _Adapter(self));
  }

  // override
  async terminate() {
    // last active engine
    const engine = this._engine();
    // stop
    await super.terminate();
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

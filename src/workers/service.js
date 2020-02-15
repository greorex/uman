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
 * service worker adapter
 */
class Adapter {
  constructor(engine) {
    // new connections
    engine.addEventListener("activate", event => {
      event.waitUntil(engine.clients.claim());
    });

    // to all controlled clients
    this.postMessage = (...args) => {
      engine.clients.matchAll().then(clients => {
        for (let client of clients) client.postMessage(...args);
      });
    };

    engine.addEventListener("message", event => {
      const promise = engine.clients.get(event.source.id).then(client => {
        // engine to reply
        event.data && (event.data.engine = client);
        // @ts-ignore
        this.onmessage(event);
      });

      // extends life of
      if (event.waitUntil) event.waitUntil(promise);
    });
  }
}

/**
 * unit base for service worker script file
 */
export class UnitServiceWorkerSelf extends UnitWorkerSelf {
  constructor(engine = new Adapter(self)) {
    super(engine);

    // active
    this.engine = null;

    // proper engine
    this._engine = data => {
      if (data.engine) this.engine = data.engine;
      return this.engine ? this.engine : engine;
    };
  }
}

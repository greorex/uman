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
    engine.addEventListener("activate", event => {
      event.waitUntil(engine.clients.claim());
    });
    engine.addEventListener("message", event => {
      engine.clients.get(event.source.id).then(client => {
        this.postMessage = (...args) => client.postMessage(...args);
        // @ts-ignore
        this.onmessage(event);
      });
    });
  }
}

/**
 * unit base for service worker script file
 */
export class UnitServiceWorkerSelf extends UnitWorkerSelf {
  constructor(engine = self) {
    super(new Adapter(engine));
  }
}

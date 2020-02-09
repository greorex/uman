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
import options from "../options";

/**
 * to control service worker
 */
class Adapter {
  constructor(worker) {
    worker.addEventListener("message", event => {
      // @ts-ignore
      this.onmessage(event);
    });
    this.postMessage = (...args) => {
      worker.controller.postMessage(...args);
    };
    worker.addEventListener("error", error => {
      // @ts-ignore
      this.onerror(error);
    });
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

  static loader() {
    return [
      // registerServiceWorker
      ({ loader, name }) => {
        if (loader instanceof ServiceWorkerRegistration) {
          if (loader.active) return navigator.serviceWorker;
          else {
            let sw;
            if (loader.installing) sw = loader.installing;
            else if (loader.waiting) sw = loader.waiting;
            if (!sw) throw new Error(`There is no service worker for ${name}`);
            // wait?
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(`Timeout while activating service worker for ${name}`);
              }, options.serviceWorker.timeout);
              sw.onstatechange = e => {
                if (e.target.state === "activated") {
                  clearTimeout(timer);
                  resolve(navigator.serviceWorker);
                }
              };
            });
          }
        }
      },
      // navigator.serviceWorker
      ({ loader, adapter, name }) => {
        if (loader === navigator.serviceWorker) {
          // and the page has to be controlled
          if (!loader.controller)
            throw new Error(`There is no active service worker for: ${name}`);
          if (!adapter) adapter = UnitServiceWorker;
          return new adapter(loader);
        }
      }
    ];
  }
}

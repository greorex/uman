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
    const _postMessage = worker.controller.postMessage;
    if (typeof _postMessage !== "function") {
      throw new Error(`There is no 'postMessage' in ${worker}`);
    }
    this.postMessage = function() {
      _postMessage.apply(worker.controller, arguments);
    };
    worker.addEventListener("message", event => {
      // @ts-ignore
      this.onmessage(event);
    });
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
    // options
    options.serviceWorker = {
      timeout: 5 * 1000 // wait to be controlled
    };

    // loaders
    return [
      // ServiceWorkerRegistration
      ({ loader, name }) => {
        if (loader instanceof ServiceWorkerRegistration) {
          let sw;
          // ready?
          if (loader.active) {
            return navigator.serviceWorker;
          } else if (loader.installing) {
            sw = loader.installing;
          } else if (loader.waiting) {
            sw = loader.waiting;
          } else {
            throw new Error(`There is no service worker for ${name}`);
          }
          // done but
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              reject(
                new Error(`Timeout while activating service worker for ${name}`)
              );
            }, options.serviceWorker.timeout);
            // wait
            sw.onstatechange = e => {
              if (e.target.state === "activated") {
                clearTimeout(timer);
                resolve(navigator.serviceWorker);
              }
            };
          });
        }
      },
      // navigator.serviceWorker
      ({ loader, adapter, name }) => {
        if (loader === navigator.serviceWorker) {
          // the page has to be controlled
          if (!loader.controller) {
            throw new Error(`There is no active service worker for: ${name}`);
          }
          // use default
          if (!adapter) adapter = UnitServiceWorker;
          // done
          return new adapter(loader);
        }
      }
    ];
  }
}

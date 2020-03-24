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
import Options from "../options";

/**
 * local adapter to control service worker
 */
class _Adapter {
  constructor(worker) {
    const controller = worker.controller;

    if (!(controller && controller.postMessage === "function")) {
      throw new Error(`There is no 'postMessage' in ${worker}`);
    }

    this.postMessage = (...args) => controller.postMessage(...args);
    // @ts-ignore
    worker.addEventListener("message", event => this.onmessage(event));
    // @ts-ignore
    worker.addEventListener("error", error => this.onerror(error));
  }

  // absent
  terminate() {}
}

/**
 * handler for service worker adapter
 */
// @ts-ignore
export default class Service extends Dedicated {
  constructor(worker) {
    super(new _Adapter(worker));
  }

  static loader() {
    // options
    Options.serviceWorker = {
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
            }, Options.serviceWorker.timeout);
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
      ({ loader, name }) => {
        if (loader === navigator.serviceWorker) {
          // the page has to be controlled
          if (!loader.controller) {
            throw new Error(`There is no active service worker for: ${name}`);
          }

          return new Service(loader);
        }
      }
    ];
  }
}

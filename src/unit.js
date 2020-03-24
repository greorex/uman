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

import Base from "./base";
import Loader from "./loader";
import Handler from "./handler";
import Dedicated from "./adapters/dedicated";
import Shared from "./adapters/shared";
import Service from "./adapters/service";
import DedicatedSelf from "./workers/dedicated";
import SharedSelf from "./workers/shared";
import ServiceSelf from "./workers/service";
import Manager from "./manager";

// if supported
const _dedicated = typeof Worker === "function",
  // @ts-ignore
  _shared = typeof SharedWorker === "function",
  _service = navigator && "serviceWorker" in navigator;

/**
 * loaders
 */

if (_dedicated) {
  Loader.register(Dedicated.loader());
}

if (_shared) {
  Loader.register(Shared.loader());
}

if (_service) {
  Loader.register(Service.loader());
}

// last to catch all above
Loader.register(({ loader, adapter }) => {
  if (loader instanceof Handler) {
    return new Base(loader, adapter);
  }
});

/**
 * determines class by GlobalScope
 */
const autoHandlerClass = () => {
  // auto detection
  switch ("function") {
    // @ts-ignore
    case typeof DedicatedWorkerGlobalScope:
      return DedicatedSelf;
    // @ts-ignore
    case typeof SharedWorkerGlobalScope:
      return SharedSelf;
    // @ts-ignore
    case typeof ServiceWorkerGlobalScope:
      return ServiceSelf;
  }

  // default
  return Handler;
};

/**
 * to initialiaze unit on demand
 */
export default value => {
  // as async extended loader?
  if (Object.getPrototypeOf(value) === Object.prototype && value.loader) {
    return Loader.instance(value);
  }

  // as async loader?
  if (value instanceof Promise) {
    return Loader.instance({ loader: value });
  }

  // as worker unit?
  if (_dedicated && value instanceof Worker) {
    return class UnitWorker extends Base {
      constructor() {
        super(new Dedicated(value));
      }
    };
  }

  // as shared worker unit?
  // @ts-ignore
  if (_shared && value instanceof SharedWorker) {
    return class UnitSharedWorker extends Base {
      constructor() {
        super(new Shared(value));
      }
    };
  }

  // as service worker unit?
  if (_service && value === navigator.serviceWorker) {
    return class UnitServiceWorker extends Base {
      constructor() {
        super(new Service(value));
      }
    };
  }

  // as Main?
  if (value === Manager || value instanceof Manager) {
    return class UnitMain extends Base {
      constructor(name = "main") {
        const handler = value === Manager ? new Manager() : value;

        super(handler);

        // set it up
        this.add = units => handler.add(units);
        this.select = (filter = "all") => handler.select(filter);

        // attach
        handler.add({ [name]: this });
      }
    };
  }

  // default
  // as auto unit
  class Unit extends Base {
    constructor(handler = null) {
      super(handler ? handler : new (autoHandlerClass())(), value);
    }
  }

  // create instance only if we're in worker's script
  return autoHandlerClass() === Handler ? Unit : new Unit();
};

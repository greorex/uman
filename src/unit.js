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

/**
 * loaders
 */

if (typeof Worker === "function") {
  Loader.register(Dedicated.loader());
}

// @ts-ignore
if (typeof SharedWorker === "function") {
  Loader.register(Shared.loader());
}

if (navigator && "serviceWorker" in navigator) {
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
export default unit => {
  // as async extended loader?
  if (Object.getPrototypeOf(unit) === Object.prototype && unit.loader) {
    return Loader.instance(unit);
  }

  // as async loader?
  if (unit instanceof Promise) {
    return Loader.instance({ loader: unit });
  }

  // as worker unit?
  if (typeof Worker === "function" && unit instanceof Worker) {
    return class UnitWorker extends Base {
      constructor() {
        super(new Dedicated(unit));
      }
    };
  }

  // as shared worker unit?
  // @ts-ignore
  if (typeof SharedWorker === "function" && unit instanceof SharedWorker) {
    return class UnitSharedWorker extends Base {
      constructor() {
        super(new Shared(unit));
      }
    };
  }

  // as service worker unit?
  if (navigator && unit === navigator.serviceWorker) {
    return class UnitServiceWorker extends Base {
      constructor() {
        super(new Service(unit));
      }
    };
  }

  // as Main?
  if (unit === Manager || unit instanceof Manager) {
    return class UnitMain extends Base {
      constructor(name = "main") {
        super(unit === Manager ? new Manager() : unit);
        // @ts-ignore
        this._handler.add({ [name]: this });
      }
      add(units) {
        // @ts-ignore
        return this._handler.add(units);
      }
      select(filter = "all") {
        // @ts-ignore
        return this._handler.select(filter);
      }
    };
  }

  // default
  // as auto unit
  class Unit extends Base {
    constructor(handler = null) {
      super(handler ? handler : new (autoHandlerClass())(), unit);
    }
  }

  // create instance only if we're in worker's script
  return autoHandlerClass() === Handler ? Unit : new Unit();
};

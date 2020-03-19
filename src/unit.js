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

// has to be final
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
  // as loader?
  if (Object.getPrototypeOf(unit) === Object.prototype && unit.loader) {
    return Loader.instance(unit);
  } else if (
    unit instanceof Promise ||
    (typeof Worker === "function" && unit instanceof Worker) ||
    // @ts-ignore
    (typeof SharedWorker === "function" && unit instanceof SharedWorker) ||
    (navigator && unit === navigator.serviceWorker)
  ) {
    return Loader.instance({ loader: unit });
  }

  // auto handled
  class Unit extends Base {
    constructor(handler = null) {
      super(handler ? handler : new (autoHandlerClass())(), unit);
    }
  }

  // create instance only if we're in worker's script
  return autoHandlerClass() === Handler ? Unit : new Unit();
};

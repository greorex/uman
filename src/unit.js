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
import Handler from "./handler";
import DedicatedSelf from "./workers/dedicated";
import SharedSelf from "./workers/shared";
import ServiceSelf from "./workers/service";

/**
 * to initialiaze unit class on demand
 */
export default Unit => {
  let HandlerClass = Handler;

  switch ("function") {
    // @ts-ignore
    case typeof DedicatedWorkerGlobalScope:
      HandlerClass = DedicatedSelf;
      break;
    // @ts-ignore
    case typeof SharedWorkerGlobalScope:
      HandlerClass = SharedSelf;
      break;
    // @ts-ignore
    case typeof ServiceWorkerGlobalScope:
      HandlerClass = ServiceSelf;
      break;
  }

  Object.setPrototypeOf(Unit.prototype, new Base(new HandlerClass()));

  class _Unit extends Unit {
    constructor() {
      super();
      // reattach
      this._handler._unit = this;
    }
  }

  return HandlerClass === Handler ? _Unit : new _Unit();
};

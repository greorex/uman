/**
 * uman
 * Units Manager javascript library to orchestrate web workers
 *
 * Copyright (c) 2019 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO - add easy method call (100%)
// TODO - add lazy loading (100%)
// TODO - add Unit auto class trigger (100%)
// TODO - split by files (100%)
// TODO - add timeout for request (80%, if long calls failed?)
// TODO - add transferable objects (80%, through proxies?)
// TODO - add args and return proxies (80%, cleanup?)
// TODO - add service worker support (80%, tests)
// TODO - add units dependency (0%)
// TODO - add node.js support (0%)
// TODO - add communication with server units (0%)

// @ts-check

import { UnitWorker } from "./adapters/dedicated";
import { UnitSharedWorker } from "./adapters/shared";
import { UnitServiceWorker } from "./adapters/service";
import { UnitLoader } from "./loader";

// register workers
// dedicated
if (typeof Worker !== "undefined") {
  UnitLoader.register(UnitWorker.loader());
}
// shared
// @ts-ignore
if (typeof SharedWorker !== "undefined") {
  UnitLoader.register(UnitSharedWorker.loader());
}
// service
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  UnitLoader.register(UnitServiceWorker.loader());
}

//@ts-ignore
export { version, name } from "./../package.json";

// basic level
export { UnitObject } from "./object";
export { Unit } from "./unit";
export { UnitsManager } from "./manager";
export { UnitMain } from "./main";

// expert level
export { default as options } from "./options";
export { MessageType, TargetType } from "./enums";
export { default as CriticalSection } from "./critical";
export { default as Throttler } from "./throttler";
export { UnitLoader };
// adapters
export { UnitWorker, UnitSharedWorker, UnitServiceWorker };
// workers
export { UnitWorkerSelf } from "./workers/dedicated";
export { UnitSharedWorkerSelf } from "./workers/shared";
export { UnitServiceWorkerSelf } from "./workers/service";

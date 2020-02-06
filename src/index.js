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

// basic level
export { UnitObject } from "./object";
export { Unit } from "./unit";
export { UnitsManager } from "./manager";
export { UnitMain } from "./main";

// expert level
export { MessageType, TargetType } from "./enums";
export { UnitOptionsDefault } from "./options";
export { default as CriticalSection } from "./critical";
export { UnitLoader } from "./loader";
// dedicated worker
export { UnitWorker } from "./adapters/dedicated";
export { UnitWorkerSelf } from "./workers/dedicated";
// shared worker
export { UnitSharedWorker } from "./adapters/shared";
export { UnitSharedWorkerSelf } from "./workers/shared";
// service worker
export { UnitServiceWorker } from "./adapters/service";
export { UnitServiceWorkerSelf } from "./workers/service";

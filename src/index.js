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
// TODO - add transferable objects (100%)
// TODO - add service worker support (100%)
// TODO - add timeout for request (80%, if long calls failed?)
// TODO - add args and return proxies (80%, cleanup?)
// TODO - add units dependency (0%)
// TODO - add node.js support (0%)
// TODO - add communication with server units (0%)

// @ts-check

import Base from "./base";
import Loader from "./loader";
import Manager from "./manager";
import Dedicated from "./adapters/dedicated";
import Shared from "./adapters/shared";
import Service from "./adapters/service";
import DedicatedSelf from "./workers/dedicated";
import SharedSelf from "./workers/shared";
import ServiceSelf from "./workers/service";

/**
 * workers adapters
 */

// dedicated

if (typeof Worker === "function") {
  Loader.register(Dedicated.loader());
}

class UnitWorker extends Base {
  constructor(engine) {
    super(engine instanceof Dedicated ? engine : new Dedicated(engine));
  }
}

class UnitWorkerSelf extends Base {
  constructor(engine) {
    super(new DedicatedSelf(engine));
  }
}

// shared

// @ts-ignore
if (typeof SharedWorker === "function") {
  Loader.register(Shared.loader());
}

class UnitSharedWorker extends Base {
  constructor(engine) {
    super(engine instanceof Shared ? engine : new Shared(engine));
  }
}

class UnitSharedWorkerSelf extends Base {
  constructor(engine) {
    super(new SharedSelf(engine));
  }
}

// service

if (navigator && "serviceWorker" in navigator) {
  Loader.register(Service.loader());
}

class UnitServiceWorker extends Base {
  constructor(engine) {
    super(engine instanceof Service ? engine : new Service(engine));
  }
}

class UnitServiceWorkerSelf extends Base {
  constructor(engine) {
    super(new ServiceSelf(engine));
  }
}

/**
 * exports
 */

//@ts-ignore
export { version, name } from "./../package.json";

// basic level
export { UnitObject } from "./object";
export { default as Unit } from "./unit";
export { UnitMain } from "./main";

// expert level
export { default as options } from "./options";
export { MessageType, TargetType } from "./enums";
export { PackagerMethod } from "./packager";
export { default as CriticalSection } from "./critical";
export { default as Throttler } from "./throttler";
export { Manager as UnitsManager };
export { Loader as UnitLoader };

// adapters
export { UnitWorker, UnitSharedWorker, UnitServiceWorker };
// workers
export { UnitWorkerSelf, UnitSharedWorkerSelf, UnitServiceWorkerSelf };

// array buffer
export { default as LittleEndian } from "./buffer/endian";
export { str2ab } from "./buffer/utf8/str2ab";
export { ab2str } from "./buffer/utf8/ab2str";
export { BufferWriter, json2ab } from "./buffer/writer";
export { BufferReader, ab2json } from "./buffer/reader";

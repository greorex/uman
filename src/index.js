/**
 * uman
 * Units Manager javascript library to orchestrate web workers
 *
 * Copyright (c) 2019 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO - add easy method call (80%, direct calls?)
// TODO - add lazy loading (80%, lazy import?)
// TODO - add timeout for request (80%, long calls failed?)
// TODO - add transferable objects (80%,through proxies?)
// TODO - add Unit auto class trigger (100%)
// TODO - split by files (0%)
// TODO - add args and return proxies (0%)
// TODO - add service worker support (0%)
// TODO - add node.js support (0%)
// TODO - add communication with server units (0%)

// @ts-check

/**
 * message types enum
 */
export class MessageType {
  static EVENT = "event";
  static REQUEST = "request";
  static RESPONSE = "response";
  static RECEIPT = "receipt";
}

/**
 * target types enum
 */
export class TargetType {
  static ALL = "all";
  static THIS = 0;
}

/**
 * unit base call engine
 */
export class UnitBase {
  constructor() {
    this.options = {};
    // manager engine
    this.name = "";
    // to set 'on...' in constructor
    this.units = this._proxyUnits();
    this._unitsProxy = {};
  }

  terminate() {}

  _proxyTarget(target) {
    // cache
    const proxy = this._unitsProxy[target];
    if (proxy) return proxy;

    // method asked
    const base = {
      emit: this._emitFunction(target)
    };
    return (this._unitsProxy[target] = new Proxy(base, {
      get: (t, prop) => {
        // if own asked, 'onmethod'
        if (prop in t) return t[prop];
        // request method
        return this._requestFunction(target, prop);
      }
    }));
  }

  _proxyUnits() {
    // unit's fast access to other units
    // 1. unit.units.emit(method, payload) -> to all units
    // const other = unit.units.other;
    // 2. other.emit(method, payload) -> to other
    // 3. async other.method(...args) -> call other's method
    // 4. set other.onevent(payload)
    const base = {
      emit: this._emitFunction(TargetType.ALL)
    };
    return new Proxy(base, {
      get: (t, prop) => {
        // if own asked
        if (prop in t) return t[prop];
        // if unitsProxy asked
        return this._proxyTarget(prop);
      }
    });
  }

  _emitFunction(target) {
    // to call emit("method", paylod)
    return (method, payload) =>
      this._redispatch({
        type: MessageType.EVENT,
        target,
        method,
        payload
      });
  }

  _requestFunction(target, method) {
    // any number of argiments
    // will be called as method(...args);
    return async (...args) =>
      this._redispatch({
        type: MessageType.REQUEST,
        target,
        method,
        payload: args
      });
  }

  async _oncall(data) {
    const { type, method, payload, sender } = data;

    switch (type) {
      case MessageType.REQUEST:
        // method has to be declared
        // may be async as well
        return this[method](...payload);

      case MessageType.EVENT:
        // do if exists
        // trick to have short 'on...'
        if (sender) {
          // unit.units.sender.onmethod(payload)
          // priority #1
          const p = this._unitsProxy[sender];
          if (p) {
            const m = `on${method}`;
            if (m in p && p[m](payload)) return;
          }

          // onsendermethod(payload)
          // priority #2
          const m = `on${sender}${method}`;
          if (m in this && this[m](payload)) return;
        }

        // raw call 'onmethod(eventobject)'
        // priority #3
        const m = `on${method}`;
        if (m in this && this[m](data)) return;
    }
  }

  async _dispatch(data) {
    return this._oncall(data);
  }

  async _redispatch(data) {
    return this._dispatch(data);
  }
}

/**
 * unit worker communication engine
 */
class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    this._c = {}; // calls
    this._n = 0; // next call index

    this.options.timeout = 0; // 1000;

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => {
      engine.postMessage(...args);
    };
    engine.onmessage = event => {
      this._onmessage(event);
    };
  }

  onmessage(_) {}

  _onmessage(event) {
    const { data } = event;
    // is this our message?
    if (data instanceof Object) {
      switch (data.type) {
        case MessageType.EVENT:
          return this._oncall(data);
        case MessageType.REQUEST:
          return this._onrequest(data);
        case MessageType.RESPONSE:
          return this._onresponse(data);
        case MessageType.RECEIPT:
          return this._clearTimeout(data);
      }
    }
    // call standard listener
    this.onmessage(event);
  }

  _clearTimeout(data) {
    // restore call
    const c = this._c[data.cid];
    if (!c) return;
    const { timeout } = c;
    // drop the timer
    timeout && clearTimeout(timeout);
  }

  async _dispatch(data) {
    switch (data.type) {
      case MessageType.EVENT:
        // just post
        return this.postMessage(data);
      case MessageType.REQUEST:
        // post with promise
        const _this = this;
        return new Promise((resolve, reject) => {
          // store call
          _this._c[(data.cid = ++_this._n)] = {
            resolve,
            reject,
            // just in case no receiver
            timeout: !this.options.timeout
              ? 0
              : setTimeout(() => {
                  _this._onresponse({
                    cid: data.cid,
                    error:
                      "Timeout on request " +
                      data.method +
                      " from " +
                      data.sender
                  });
                }, _this.options.timeout)
          };
          _this.postMessage(data);
        });
    }
  }

  async _onrequest(data) {
    const response = {
      cid: data.cid
    };

    // receipt
    response.type = MessageType.RECEIPT;
    this.postMessage(response);

    // call
    try {
      response.result = await this._oncall(data);
    } catch (error) {
      response.error = error;
    }

    // response
    response.type = MessageType.RESPONSE;
    this.postMessage(response);
  }

  _onresponse(data) {
    const { cid, result, error } = data;
    // restore call
    const c = this._c[cid];
    if (!c) return;
    // remove call
    this._clearTimeout(data);
    delete this._c[cid];
    // promise's time
    error ? c.reject(new Error(error)) : c.resolve(result);
  }
}

/**
 * unit base for worker adapter
 */
export class UnitWorker extends UnitWorkerEngine {
  constructor(worker) {
    super(worker);

    this.terminate = () => worker.terminate();
  }

  async _oncall(data) {
    if (data.target) return this._redispatch(data);
    return super._oncall(data);
  }
}

/**
 * unit base for worker script file
 */
export class UnitWorkerSelf extends UnitWorkerEngine {
  constructor(engine = self) {
    super(engine);
  }
}

/**
 * determines unit base class by globalThis
 */
const _unitAutoClass = () => {
  if (
    self &&
    !self.window &&
    self.postMessage instanceof Function &&
    self.importScripts instanceof Function
  )
    return UnitWorkerSelf;
  return UnitBase;
};

/**
 * unit with autoselected base class
 */
export class Unit extends _unitAutoClass() {
  static use(unitClass) {
    if (_unitAutoClass() === UnitWorkerSelf) {
      return new unitClass();
    }
  }
}

/**
 * units orchestration engine
 */
export class UnitsManager {
  constructor(units = {}) {
    this._units = {};
    // copy entries
    this._copyUnitsEntry(units);
    // lazy loading engine
    this.units = this._proxyUnits();
  }

  _proxyUnits() {
    return new Proxy(this._units, {
      get: (t, prop) => {
        const value = t[prop];
        // unit asked?
        if (value instanceof UnitBase) return value;
        // isn't loaded? call loader
        if (value instanceof Function) return this._attachUnit(prop, value());
        // as is
        return value;
      }
    });
  }

  _attachUnit(name, unit) {
    if (unit instanceof Promise) {
      // resolve it
      unit = (async () => {
        const result = await unit.then();
        console.log(result.default);
        return new result.default();
      })();
    }
    if (!(unit instanceof UnitBase))
      throw new Error("Wrong class of unit: " + name);
    // attach
    unit.name = name;
    // override to redispatch
    unit._redispatch = async data => {
      data.sender = unit.name;
      // redispatch
      return this._redispatch(data);
    };

    return (this._units[name] = unit);
  }

  _copyUnitsEntry(units) {
    for (let e of Object.entries(units)) {
      const [name, unit] = e;
      // check duplication
      if (this._units[name])
        throw new Error("Unit " + unit + " already exists");
      // check name (simple)
      if (typeof name != "string" || name === "emit")
        throw new Error("Wrong unit name: " + name);
      // check unit
      if (unit instanceof Function) this._units[name] = unit;
      else if (unit instanceof UnitBase) this._attachUnit(name, unit);
      else throw new Error("Wrong unit value: " + unit);
    }
  }

  async _redispatch(data) {
    const { target, sender } = data;

    switch (target) {
      case TargetType.ALL:
        // to all except sender
        for (let k of Object.keys(this._units)) {
          if (k !== sender) {
            // only to loaded units
            const u = this._units[k];
            if (u instanceof UnitBase) u._dispatch(data);
          }
        }
        return;

      default:
        // load if doesn't
        const u = this.units[target];
        if (u instanceof UnitBase) return u._dispatch(data);
    }

    // not a unit or wrong target
    throw new Error("Wrong target unit: " + target);
  }

  addUnits(units) {
    this._copyUnitsEntry(units);
    return this;
  }

  deleteUnit(name) {
    const unit = this._units[name];
    // stop it if loaded
    if (unit instanceof UnitBase) unit.terminate();
    // drop it
    if (unit) delete this._units[name];
  }

  deleteAll() {
    for (let name of Object.keys(this._units)) this.deleteUnit(name);
  }
}

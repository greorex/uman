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

// TODO - write tests (80%, direct calls)
// TODO - split by files (0%)
// TODO - add easy method call (80%, direct calls)
// TODO - add lazy loading (80%, lazy import)
// TODO - add args and returns proxies (0%)
// TODO - add node.js support (0%)

/**
 * message types enum
 */
export class MessageType {
  static EVENT = "event";
  static REQUEST = "request";
  static RESPONSE = "response";
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
class UnitBase {
  constructor() {
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
        // don't stop execution
        setTimeout(() => {
          // do if exists
          // trick to have short 'on...'
          if (sender) {
            // unit.units.sender.onmethod(payload)
            // priority #1
            const p = this._unitsProxy[sender];
            if (p) {
              const m = `on${method}`;
              if (m in p) p[m](payload);
            }

            // onsendermethod(payload)
            // priority #2
            const m = `on${sender}${method}`;
            if (m in this) this[m](payload);
          }

          // raw call 'onmethod(eventobject)'
          // priority #3
          const m = `on${method}`;
          if (m in this) this[m](data);
        });
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

    // attach engine (worker or worker self instance)
    this.postMessage = message => engine.postMessage(message);
    engine.onmessage = event => {
      // don't stop execution
      setTimeout(() => this._onmessage(event));
    };
  }

  onmessage(_) {}

  _onmessage(event) {
    const { data } = event;
    // is this our message?
    if (data && data instanceof Object) {
      switch (data.type) {
        case MessageType.EVENT:
          return this._oncall(data);
        case MessageType.REQUEST:
          return this._onrequest(data);
        case MessageType.RESPONSE:
          return this._onresponse(data);
      }
    }
    // call standard listener
    return this.onmessage(event);
  }

  async _dispatch(data) {
    const _this = this;
    switch (data.type) {
      case MessageType.EVENT:
        // just post
        return _this.postMessage(data);
      case MessageType.REQUEST:
        // set call id
        data.cid = ++this._n;
        // post with promise
        return new Promise((resolve, reject) => {
          // store call
          _this._c[data.cid] = {
            resolve,
            reject
          };
          _this.postMessage(data);
        });
    }
  }

  async _onrequest(data) {
    const response = {
      type: MessageType.RESPONSE,
      cid: data.cid
    };
    try {
      response.result = await this._oncall(data);
    } catch (error) {
      response.error = error;
    }
    // response
    this.postMessage(response);
  }

  _onresponse(data) {
    const { cid, result, error } = data;
    // restore call
    const c = this._c[cid];
    if (!c) return;
    // remove call
    delete this._c[cid];
    // promise's time
    if (!error && c.resolve) c.resolve(result);
    if (error && c.reject) c.reject(new Error(error));
  }
}

/**
 * main thread unit base
 */
export class Unit extends UnitBase {}

/**
 * main thread unit worker base
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
 * worker file unit base
 */
export class UnitSelf extends UnitWorkerEngine {
  constructor(engine = self) {
    super(engine);
  }
}

/**
 * units orchestration engine
 */
export class UnitsManager {
  constructor(units) {
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

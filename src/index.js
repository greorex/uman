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
// TODO - add timeout for request (80%, long calls failed?)
// TODO - add transferable objects (80%, through proxies?)
// TODO - add units dependency (0%)
// TODO - split by files (0%)
// TODO - add args and return proxies (0%)
// TODO - add service worker support (0%)
// TODO - add node.js support (0%)
// TODO - add communication with server units (0%)

// @ts-check

/**
 * message types enum
 */
export const MessageType = {
  EVENT: "event",
  REQUEST: "request",
  RESPONSE: "response",
  RECEIPT: "receipt"
};

/**
 * target types enum
 */
export const TargetType = {
  ALL: "all",
  THIS: 0
};

/**
 * unit base call engine
 */
export class UnitBase {
  constructor() {
    this.options = {};
    // manager engine
    this.name = "";
    this._redispatch = data => this._dispatch(data);
    // to set 'on...' in constructor
    this.units = this._proxyUnits();
    this._unitsProxy = {};
    // proxy engine
    return this._proxyThis();
  }

  terminate() {}

  emit(method, payload) {
    return this._dispatch({
      type: MessageType.EVENT,
      method,
      payload
    });
  }

  _proxyThis() {
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // own asked
        if (prop in t) return Reflect.get(t, prop, receiver);
        // method asked
        return (...args) =>
          receiver._dispatch({
            type: MessageType.REQUEST,
            method: prop,
            payload: args
          });
      }
    });
  }

  _proxyTarget(target) {
    // is cached?
    let proxy = this._unitsProxy[target];
    if (!proxy) {
      // proxy engine
      const base = {
        emit: (method, payload) =>
          this._redispatch({
            type: MessageType.EVENT,
            target,
            method,
            payload
          })
      };
      proxy = new Proxy(base, {
        get: (t, prop) => {
          // if own asked, 'onmethod'
          if (prop in t) return t[prop];
          // request method
          return (...args) =>
            this._redispatch({
              type: MessageType.REQUEST,
              target,
              method: prop,
              payload: args
            });
        }
      });
      // cache it
      this._unitsProxy[target] = proxy;
    }
    return proxy;
  }

  _proxyUnits() {
    // unit's fast access to other units
    // 1. unit.units.emit(method, payload) -> to all units
    // const other = unit.units.other;
    // 2. other.emit(method, payload) -> to other
    // 3. async other.method(...args) -> call other's method
    // 4. set other.onevent(payload)
    const base = {
      emit: (method, payload) =>
        this._redispatch({
          type: MessageType.EVENT,
          target: TargetType.ALL,
          method,
          payload
        })
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

  _onevent(data) {
    const { method, payload, sender } = data;
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

  _oncall(data) {
    const { method, payload } = data;
    // method has to be declared
    // may be async as well
    return this[method](...payload);
  }

  _dispatch(data) {
    switch (data.type) {
      case MessageType.EVENT:
        return this._onevent(data);
      case MessageType.REQUEST:
        return this._oncall(data);
    }
  }
}

/**
 * unit worker call stack
 */
class UnitCallStack extends Map {
  constructor() {
    super();
    this._n = 0; // next call index
  }
  next() {
    return ++this._n;
  }
}

/**
 * unit worker communication engine
 */
class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    this._calls = new UnitCallStack();
    this.options.timeout = 5000;

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onmessage = event => {
      const { data } = event;
      // is this our message?
      if (data instanceof Object) {
        switch (data.type) {
          case MessageType.EVENT:
            return this._onevent(data);
          case MessageType.REQUEST:
            return this._onrequest(data);
          case MessageType.RESPONSE:
            return this._onresponse(data);
          case MessageType.RECEIPT:
            return this._onreceipt(data);
        }
      }
      // call standard listener
      // @ts-ignore
      this.onmessage instanceof Function && this.onmessage(event);
    };
  }

  _dispatch(data) {
    switch (data.type) {
      case MessageType.EVENT:
        // just post
        return this.postMessage(data);
      case MessageType.REQUEST:
        // post and wait
        return new Promise((resolve, reject) => {
          const { options, _calls } = this;
          const c = {
            resolve,
            reject
          };
          // next call id
          data.cid = _calls.next();
          // just in case no receiver
          if (options.timeout)
            c.timeout = setTimeout(() => {
              this._onresponse({
                cid: data.cid,
                error: "Timeout on request " + data.method
              });
            }, options.timeout);
          // store call
          _calls.set(data.cid, c);
          // and post
          this.postMessage(data);
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
    const { _calls } = this;
    // restore call
    const c = _calls.get(cid);
    if (c) {
      // remove call
      c.timeout && clearTimeout(c.timeout);
      _calls.delete(cid);
      // promise's time
      !error ? c.resolve(result) : c.reject(new Error(error));
    }
  }

  _onreceipt(data) {
    // drop timeout
    const c = this._calls.get(data.cid);
    c && c.timeout && clearTimeout(c.timeout);
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

  _onevent(data) {
    if (data.target) return this._redispatch(data);
    return super._onevent(data);
  }

  _oncall(data) {
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
  static instance(unitClass) {
    if (_unitAutoClass() === UnitWorkerSelf) return new unitClass();
    return unitClass;
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
    const base = {
      emit: (method, payload) =>
        this._redispatch({
          type: MessageType.EVENT,
          target: TargetType.ALL,
          method,
          payload
        })
    };
    return new Proxy(this._units, {
      get: (t, prop) => {
        const value = t[prop];
        // unit asked?
        if (value instanceof UnitBase) return value;
        // isn't loaded? call loader
        if (
          value instanceof Function ||
          value instanceof Worker ||
          value instanceof Promise
        )
          return this._attachUnit(prop, value);
        // base
        if (prop in base) return base[prop];
        // as is
        return value;
      }
    });
  }

  _attachUnit(name, value) {
    let unit;
    // case function
    if (value instanceof Function) value = value();
    // case worker
    if (value instanceof Worker) unit = new UnitWorker(value);
    // case promise
    if (value instanceof Promise) {
      unit = new UnitBase();
      // resolve it later
      unit._dispatch = async data => {
        let u = await value.then();
        // may be as 'export default class'
        if (u.default instanceof Function) u = new u.default();
        // reatach
        u = this._attachUnit(unit.name, u);
        // call proper method
        return u._dispatch(data);
      };
    }
    // default
    if (!unit) unit = value;
    // finaly unit has to be as
    if (!(unit instanceof UnitBase))
      throw new Error("Wrong class of unit: " + name);
    // attach
    unit.name = name;
    unit._redispatch = data => {
      // redispatch
      data.sender = unit.name;
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
      if (unit instanceof UnitBase) this._attachUnit(name, unit);
      else if (
        unit instanceof Function ||
        unit instanceof Worker ||
        unit instanceof Promise
      )
        this._units[name] = unit;
      else throw new Error("Wrong unit value: " + unit);
    }
  }

  _redispatch(data) {
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

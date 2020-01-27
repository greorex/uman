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
// TODO - add timeout for request (80%, if long calls failed?)
// TODO - add transferable objects (80%, through proxies?)
// TODO - add args and return proxies (80%, weakmap? events?)
// TODO - add units dependency (0%)
// TODO - split by files (0%)
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
 * unit object base, event emitter
 */
export class UnitObject {
  constructor() {
    this._listeners = {};
  }

  on(event, f) {
    if (!(f instanceof Function))
      throw new Error(`Wrong type of listener for ${event}`);
    let el = this._listeners[event];
    if (!el) el = this._listeners[event] = [];
    el.push(f);
    return this;
  }

  off(event, f) {
    const el = this._listeners[event];
    if (el) this._listeners[event] = el.filter(i => i !== f);
    return this;
  }

  fire(event, ...args) {
    const el = this._listeners[event];
    if (el) el.every(f => f(...args));
    return this;
  }

  _oncall(data) {
    const { method, payload } = data;
    // method has to be declared
    // may be async as well
    return this[method](...payload);
  }
}

/**
 * Units proxy target engine
 */
class UnitsProxyTarget {
  constructor(unit, target) {
    // 2. other.post(method, payload) -> to other
    this.post = (method, payload) =>
      unit._redispatch({
        type: MessageType.EVENT,
        target,
        method,
        payload
      });
    // 3. async other.method(...args) -> call other's method
    // 4. set other.onevent(payload)
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // if own asked, 'onmethod'
        if (prop in t) return Reflect.get(t, prop, receiver);
        // request method
        return (...args) =>
          unit._redispatch({
            type: MessageType.REQUEST,
            target,
            method: prop,
            payload: args
          });
      }
    });
  }
}

/**
 * Units fast access to other units
 */
class UnitsProxy {
  constructor(unit) {
    // 1. unit.units.post(method, payload) -> to all units
    this.post = (method, payload) =>
      unit._redispatch({
        type: MessageType.EVENT,
        target: TargetType.ALL,
        method,
        payload
      });

    // const other = unit.units.other;
    return new Proxy(this, {
      get: (t, prop, receiver) => {
        let value = Reflect.get(t, prop, receiver);
        if (!value) {
          // asume "other" asked
          value = new UnitsProxyTarget(unit, prop);
          Reflect.set(t, prop, value, receiver);
        }
        return value;
      }
    });
  }
}

/**
 * unit base call engine
 */
class UnitBase extends UnitObject {
  constructor() {
    super();

    this.options = {};

    // manager engine
    this.name = "";
    this.units = new UnitsProxy(this);
    this._redispatch = data => this._dispatch(data);

    // proxy engine
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

  terminate() {}

  post(event, payload) {
    return this._dispatch({
      type: MessageType.EVENT,
      method: event,
      payload
    });
  }

  _onevent(data) {
    const { method, payload, sender } = data;
    // do if exists
    // trick to have short 'on...'
    if (sender) {
      // unit.units.sender.onmethod(payload)
      // priority #1
      const p = this.units[sender];
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
 * unit objects cache
 */
class UnitObjectsCache extends UnitCallStack {
  push(object) {
    const key = this.next();
    this.set(key, object);
    return key;
  }
}

/**
 * object proxy
 */
class UnitObjectProxy {
  constructor(object, owner, unit) {
    this.toArgument = () => ({ object, owner });

    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // own + avoid promise then check
        if (prop in t || "then" === prop) return Reflect.get(t, prop, receiver);
        // unit knows
        return (...args) =>
          unit._redispatch({
            type: MessageType.REQUEST,
            target: owner,
            method: prop,
            payload: args,
            object
          });
      }
    });
  }

  static _checkArguments(args, f) {
    // one level only
    if (Array.isArray(args))
      return args.map(a =>
        // and object except
        !(a instanceof Object) ||
        a instanceof UnitObjectProxy ||
        (a.object && a.owner)
          ? f(a)
          : UnitObjectProxy._checkArguments(a, f)
      );
    else if (args instanceof Object) {
      const r = {};
      for (let key of Object.keys(args)) r[key] = f(args[key]);
      return r;
    }
  }

  static toArguments(args) {
    return UnitObjectProxy._checkArguments(args, a =>
      a instanceof UnitObjectProxy ? a.toArgument() : a
    );
  }

  static fromArguments(args, unit) {
    return UnitObjectProxy._checkArguments(args, a =>
      a instanceof Object && a.object && a.owner
        ? new UnitObjectProxy(a.object, a.owner, unit)
        : a
    );
  }
}

/**
 * unit worker communication engine
 */
class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    this.options.timeout = 5000;

    // private
    const _calls = new UnitCallStack();
    const _objects = new UnitObjectsCache();

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onmessage = async event => {
      const { data } = event;
      // is this our message?
      if (data instanceof Object) {
        switch (data.type) {
          case MessageType.EVENT:
            this._onevent(data);
            return;

          case MessageType.REQUEST: {
            const response = {
              cid: data.cid
            };
            // receipt
            response.type = MessageType.RECEIPT;
            engine.postMessage(response);
            // call
            try {
              const { name } = this;
              let result;
              // check arguments
              data.payload = UnitObjectProxy.fromArguments(data.payload, this);
              // do unitobject's
              if (data.object && (!name || name === data.target)) {
                const object = _objects.get(data.object);
                if (!object)
                  throw new Error(`Wrong object for ${data.method} in ${name}`);
                result = await object._oncall(data);
              }
              // do own
              else result = await this._oncall(data);
              // if unitobject returned
              if (result instanceof UnitObject) {
                response.proxy = true;
                result = _objects.push(result);
              }
              response.result = result;
            } catch (error) {
              response.error = error;
            }
            // response
            response.type = MessageType.RESPONSE;
            engine.postMessage(response);
            return;
          }

          case MessageType.RESPONSE: {
            const c = _calls.get(data.cid);
            c && c.onresponse(data);
            return;
          }

          case MessageType.RECEIPT: {
            const c = _calls.get(data.cid);
            c && c.onreceipt instanceof Function && c.onreceipt();
            return;
          }
        }
      }
      // call standard listener
      // @ts-ignore
      this.onmessage instanceof Function && this.onmessage(event);
    };

    // override dispatcher
    this._dispatch = data => {
      switch (data.type) {
        case MessageType.EVENT:
          // just post
          engine.postMessage(data);
          return;

        case MessageType.REQUEST:
          // post and wait
          return new Promise((resolve, reject) => {
            const { name, options } = this;
            const c = {};
            // just in case no receiver
            if (options.timeout) {
              const timeout = setTimeout(
                () =>
                  c.onresponse({
                    error: `Timeout on request ${data.method} in ${name}`
                  }),
                options.timeout
              );
              c.onreceipt = () => clearTimeout(timeout);
            }
            // next call id
            data.cid = _calls.next();
            // to restore call
            c.onresponse = ({ error, result = null, proxy = false }) => {
              c.onreceipt instanceof Function && c.onreceipt();
              // remove call
              _calls.delete(data.cid);
              // promise's time
              if (error) reject(new Error(error));
              else if (!proxy) resolve(result);
              else resolve(new UnitObjectProxy(result, name, this));
            };
            // store call
            _calls.set(data.cid, c);
            // check arguments
            data.payload = UnitObjectProxy.toArguments(data.payload);
            // and post
            engine.postMessage(data);
          });
      }
    };
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
    if (UnitWorkerSelf === _unitAutoClass()) return new unitClass();
    return unitClass;
  }
}

/**
 * lazy loader engine
 */
class UnitLazyLoader extends UnitBase {
  constructor(value) {
    super();

    this._loaded = unit => unit;
    // resolve it later
    this._dispatch = async data => {
      // case function
      if (value instanceof Function) value = value();
      // case worker
      if (value instanceof Worker) value = new UnitWorker(value);
      // case promise
      if (value instanceof Promise) {
        value = await value.then();
        // may be as 'export default class'
        if (value.default instanceof Function) value = new value.default();
      }
      // reatach
      value = this._loaded(value);
      // call proper method
      return value._dispatch(data);
    };
  }
}

/**
 * units orchestration engine
 */
export class UnitsManager {
  constructor(units = {}) {
    // real list
    this._units = {};
    // proxy list
    this.units = new UnitsProxy(this);
    // copy entries
    this.addUnits(units);
  }

  _attachUnit(name, value) {
    let unit;
    // case lazy
    if (
      value instanceof Function ||
      value instanceof Worker ||
      value instanceof Promise
    ) {
      unit = new UnitLazyLoader(value);
      unit._loaded = u => this._attachUnit(unit.name, u);
    }
    // default
    if (!unit) unit = value;
    // finaly unit has to be as
    if (!(unit instanceof UnitBase))
      throw new Error(`Wrong class of unit: ${name}`);
    // attach
    unit.name = name;
    unit._redispatch = data => {
      // redispatch
      data.sender = unit.name;
      return this._redispatch(data);
    };
    // update list
    this._units[name] = unit;
    return unit;
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
            if (!(u instanceof UnitLazyLoader) && u instanceof UnitBase)
              u._dispatch(data);
          }
        }
        return;

      default:
        // load if doesn't
        const u = this._units[target];
        if (u instanceof UnitBase) return u._dispatch(data);
    }

    // not a unit or wrong target
    throw new Error(`Wrong target unit: ${target}`);
  }

  addUnits(units) {
    for (let [name, unit] of Object.entries(units)) {
      // check duplication
      if (this._units[name]) throw new Error(`Unit ${unit} already exists`);
      // check name (simple)
      if (typeof name !== "string" || "post" === name)
        throw new Error(`Wrong unit name: ${name}`);
      // check unit
      this._attachUnit(name, unit);
    }
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

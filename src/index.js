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
 * default unit's options
 */
const _unitOptionsDefault = {
  timeout: 5000
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
    if (!(method in this))
      throw new Error(`Method ${method} has to be declared in ${data.target}`);
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

    this.options = { ..._unitOptionsDefault };

    // call engine
    this._calls = new UnitCallEngine(this);

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
    m in this && this[m](data);
  }

  _dispatch(data) {
    switch (data.type) {
      case MessageType.REQUEST:
        return this._calls.execute(data, this);

      case MessageType.EVENT:
        this._onevent(data);
    }
  }
}

/**
 * object proxy
 */
class UnitObjectProxy {
  constructor(reference, unit) {
    this.reference = reference;

    // no then function
    // if promise check
    this.then = undefined;

    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // own
        if (prop in t) return Reflect.get(t, prop, receiver);
        // unit knows
        return (...args) =>
          unit._redispatch({
            type: MessageType.REQUEST,
            target: reference.owner,
            object: reference,
            method: prop,
            payload: args
          });
      }
    });
  }

  toArgument() {
    return this.reference;
  }

  toResult() {
    return this.reference;
  }
}

/**
 * value checker
 */
export const UnitValue = {
  isValue: a => !(a instanceof Object),
  isArray: a => Array.isArray(a),
  isObject: a => a instanceof Object,
  isUnitObject: a => a instanceof UnitObject,
  isReference: a => a instanceof Object && a._object,
  isProxy: a => a instanceof UnitObjectProxy,
  // to pass to/from worker
  mapArguments: (args, f = a => a) => {
    // one level only
    if (UnitValue.isArray(args))
      return args.map(a =>
        // and object except
        UnitValue.isValue(a) || UnitValue.isProxy(a) || UnitValue.isReference(a)
          ? f(a)
          : UnitValue.mapArguments(a, f)
      );
    else if (UnitValue.isObject(args)) {
      const r = {};
      for (let [key, a] of Object.entries(args)) r[key] = f(a);
      return r;
    }
  }
};

/**
 * engine to execute calls with built in cache
 */
class UnitCallEngine extends Map {
  constructor(handler) {
    super();

    this._unit = handler;
    this._n = 0; // next key
  }

  next() {
    return ++this._n;
  }

  cache(object, owner) {
    const key = this.next();
    this.set(key, {
      object,
      owner
    });
    return {
      _object: key,
      owner
    };
  }

  exists(object) {
    return object ? this.has(object._object) : 0;
  }

  execute(data, handler = null) {
    // find proper handler
    if (this.exists(data.object)) handler = this;
    // call
    return handler._oncall(data);
  }

  _oncall(data) {
    const { _object, owner } = data.object;
    const pointer = this.get(_object);
    if (!pointer)
      throw new Error(`Wrong object for ${data.method} in ${owner}`);
    // do unitobject's
    return pointer.object._oncall(data);
  }

  onresponse(data) {
    const c = this.get(data.cid);
    c && c.onresponse(data);
  }

  onreceipt(data) {
    const c = this.get(data.cid);
    c && c.onreceipt instanceof Function && c.onreceipt();
  }

  toArguments(args) {
    return UnitValue.mapArguments(args, a =>
      UnitValue.isUnitObject(a)
        ? this.cache(a, this._unit.name)
        : UnitValue.isProxy(a)
        ? a.toArgument()
        : a
    );
  }

  fromArguments(args) {
    return UnitValue.mapArguments(args, a =>
      UnitValue.isReference(a) ? new UnitObjectProxy(a, this._unit) : a
    );
  }

  toResult(result, owner = null) {
    return UnitValue.isUnitObject(result)
      ? this.cache(result, owner)
      : UnitValue.isProxy(result)
      ? result.toResult()
      : result;
  }

  fromResult(result) {
    return UnitValue.isReference(result)
      ? new UnitObjectProxy(result, this._unit)
      : result;
  }
}

/**
 * unit worker communication engine
 */
class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    // private
    const _handlers = {
      [MessageType.EVENT]: data => this._onevent(data),

      [MessageType.REQUEST]: async data => {
        const response = {
          cid: data.cid
        };
        // receipt?
        if (data.receipt) {
          response.type = MessageType.RECEIPT;
          engine.postMessage(response);
        }
        // call
        try {
          const { _calls } = this;
          // check arguments
          data.payload = _calls.fromArguments(data.payload);
          // execute and wait
          const result = await _calls.execute(data, this);
          // check result
          response.result = _calls.toResult(result, data.target);
        } catch (error) {
          response.error = error;
        }
        // response
        response.type = MessageType.RESPONSE;
        engine.postMessage(response);
      },

      [MessageType.RESPONSE]: data => this._calls.onresponse(data),

      [MessageType.RECEIPT]: data => this._calls.onreceipt(data)
    };

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onmessage = event => {
      const { data } = event;
      // is this our message?
      if (data instanceof Object && data.type in _handlers)
        return _handlers[data.type](data);
      // call standard listener
      // @ts-ignore
      this.onmessage instanceof Function && this.onmessage(event);
    };

    // override dispatcher
    this._dispatch = data => {
      switch (data.type) {
        case MessageType.REQUEST:
          // post and wait
          return new Promise((resolve, reject) => {
            const { name, options, _calls } = this;
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
              data.receipt = true;
            }
            // next call id
            data.cid = _calls.next();
            // to restore call
            c.onresponse = ({ error, result = null }) => {
              c.onreceipt instanceof Function && c.onreceipt();
              // remove call
              _calls.delete(data.cid);
              // promise's time
              !error
                ? resolve(_calls.fromResult(result))
                : reject(new Error(error));
            };
            // store call
            _calls.set(data.cid, c);
            // check arguments
            data.payload = _calls.toArguments(data.payload);
            // and post
            engine.postMessage(data);
          });

        case MessageType.EVENT:
          // just post
          engine.postMessage(data);
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
export class UnitsManager extends Unit {
  constructor(units = {}) {
    super();

    // real list
    this._units = {};
    // copy entries
    this.add(units);

    // override redispatcher
    this._redispatch = data => {
      const { target, sender } = data;

      switch (target) {
        case TargetType.ALL:
          // to all except sender
          for (let [name, unit] of Object.entries(this._units))
            if (
              name !== sender &&
              !(unit instanceof UnitLazyLoader) &&
              unit instanceof UnitBase
            )
              unit._dispatch(data);
          return;

        default:
          const unit = this._units[target];
          if (unit instanceof UnitBase)
            // load if doesn't
            return unit._dispatch(data);
      }

      // not a unit or wrong target
      throw new Error(`Wrong target unit: ${target}`);
    };
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
      // to know who
      data.sender = unit.name;
      return this._redispatch(data);
    };
    // common call engine
    unit._calls = this._calls;
    // update list
    this._units[name] = unit;
    return unit;
  }

  add(units) {
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

  terminate(name = null) {
    if (!name) {
      // delete this
      super.terminate();
      delete this._units[this.name];
      // delete All
      for (let name of Object.keys(this._units)) this.terminate(name);
    } else {
      // delete by name
      const unit = this._units[name];
      // stop it if loaded
      if (unit instanceof UnitBase) unit.terminate();
      // drop it
      if (unit) delete this._units[name];
    }
  }
}

/**
 * main unit with built in manager
 */
export class UnitMain extends UnitsManager {
  constructor(name = "main") {
    super();

    // atach
    this.name = name;
    this._units = {
      [this.name]: this
    };
  }
}

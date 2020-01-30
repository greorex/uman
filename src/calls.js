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

import { MessageType } from "./enums";
import { UnitObject } from "./object";

// locals
const REQUEST = MessageType.REQUEST;

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
            type: REQUEST,
            target: reference.owner,
            object: reference,
            method: prop,
            args
          });
      }
    });
  }
}

/**
 * value checker
 */
const UnitValue = {
  // simple
  isValue: a => !(a instanceof Object),
  // to check
  isObject: a => a instanceof UnitObject,
  isProxy: a => a instanceof UnitObjectProxy,
  isReference: a => a instanceof Object && (a._object || a._function),
  // to pass to/from worker
  mapArguments: (args, f) => {
    // one level only
    if (Array.isArray(args)) {
      for (let i = args.length; i--; ) {
        const a = args[i];
        // as is
        if (UnitValue.isValue(a) || Array.isArray(a)) continue;
        // and object except
        args[i] =
          UnitValue.isProxy(a) ||
          UnitValue.isReference(a) ||
          a instanceof Function
            ? f(a)
            : UnitValue.mapArguments(a, f);
      }
    } else if (args instanceof Object) {
      for (let [key, a] of Object.entries(args)) args[key] = f(a);
    }

    return args;
  }
};

/**
 * engine to execute calls with built in cache
 */
export class UnitCallsEngine extends Map {
  constructor(handler) {
    super();

    this._unit = handler;
    this._n = 0; // next key
  }

  next() {
    return ++this._n;
  }

  cache(object, key = "_object") {
    const owner = this._unit.name,
      id = this.next();
    this.set(id, object);
    return {
      [key]: id,
      owner
    };
  }

  object(reference) {
    if (reference._object) return new UnitObjectProxy(reference, this._unit);
    if (reference._function)
      return (...args) => {
        this._unit._redispatch({
          type: REQUEST,
          target: reference.owner,
          object: reference,
          args
        });
      };
  }

  execute(data, handler) {
    const { object } = data;
    // default
    if (!(object && object.owner === this._unit.name))
      return handler._oncall(data);
    // object's
    if (object._object) {
      const o = this.get(object._object);
      if (!UnitValue.isObject(o))
        throw new Error(`Wrong object for ${data.method} in ${object.owner}`);
      return o._oncall(data);
    }
    // function's
    if (object._function) {
      const f = this.get(object._function);
      if (!(f instanceof Function))
        throw new Error(`Wrong function in ${object.owner}`);
      return f(...data.args);
    }
  }

  onresponse(data) {
    const c = this.get(data.cid);
    c && c.onresponse(data);
  }

  onreceipt(data) {
    const c = this.get(data.cid);
    c && c.onreceipt instanceof Function && c.onreceipt();
  }

  toResult(result) {
    return UnitValue.isObject(result)
      ? this.cache(result)
      : result instanceof Function
      ? this.cache(result, "_function")
      : UnitValue.isProxy(result)
      ? result.reference
      : result;
  }

  fromResult(result) {
    return UnitValue.isReference(result) ? this.object(result) : result;
  }

  toArguments(args) {
    return UnitValue.mapArguments(args, a => this.toResult(a));
  }

  fromArguments(args) {
    return UnitValue.mapArguments(args, a => this.fromResult(a));
  }
}

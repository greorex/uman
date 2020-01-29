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
const UnitValue = {
  isValue: a => !(a instanceof Object),
  isObject: a => a instanceof UnitObject,
  isReference: a => a instanceof Object && a._object,
  isProxy: a => a instanceof UnitObjectProxy,
  // to pass to/from worker
  mapArguments: (args, f) => {
    // one level only
    if (Array.isArray(args))
      return args.map(a =>
        // and object except
        UnitValue.isValue(a) || UnitValue.isProxy(a) || UnitValue.isReference(a)
          ? f(a)
          : UnitValue.mapArguments(a, f)
      );
    else if (args instanceof Object) {
      const r = {};
      for (let [key, a] of Object.entries(args)) r[key] = f(a);
      return r;
    }
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
      UnitValue.isObject(a)
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
    return UnitValue.isObject(result)
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

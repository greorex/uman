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
import { UnitsProxyTarget } from "./proxy";

// locals
const REQUEST = MessageType.REQUEST;

// referencies
const OBJECT = "_o";
const FUNCTION = "_f";
const UNIT = "_u";

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
            reference,
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
  isReference: a =>
    a instanceof Object && (a[OBJECT] || a[FUNCTION] || a[UNIT]),
  // to pass to/from worker
  mapArguments: (args, f) => {
    // one level only
    if (Array.isArray(args)) {
      for (let i = args.length; i--; ) {
        const a = args[i];
        if (a instanceof Object && !Array.isArray(a))
          // in place
          args[i] = f(a);
      }
    } else if (args instanceof Object) {
      for (let [key, a] of Object.entries(args))
        if (a instanceof Object && !Array.isArray(a))
          // in place
          args[key] = f(a);
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

  cache(handler, type) {
    const owner = this._unit.name,
      id = this.next();
    this.set(id, handler);
    // reference
    return {
      [type]: id,
      owner
    };
  }

  object(reference) {
    if (reference[UNIT]) return this._unit.units[reference[UNIT]];
    if (reference[OBJECT]) return new UnitObjectProxy(reference, this._unit);
    if (reference[FUNCTION])
      return (...args) => {
        this._unit._redispatch({
          type: REQUEST,
          target: reference.owner,
          reference,
          args
        });
      };
  }

  execute(data, handler) {
    const { reference } = data;
    // default
    if (!(reference && reference.owner === this._unit.name))
      return handler._oncall(data);
    // object's
    if (reference[OBJECT]) {
      const o = this.get(reference[OBJECT]);
      if (!(o instanceof UnitObject))
        throw new Error(
          `Wrong object for ${data.method} in ${reference.owner}`
        );
      return o._oncall(data);
    }
    // function's
    if (reference[FUNCTION]) {
      const f = this.get(reference[FUNCTION]);
      if (!(f instanceof Function))
        throw new Error(`Wrong function reference in ${reference.owner}`);
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

  toResult(r) {
    return r instanceof UnitObject
      ? this.cache(r, OBJECT)
      : r instanceof Function
      ? this.cache(r, FUNCTION)
      : r instanceof UnitObjectProxy
      ? r.reference
      : r instanceof UnitsProxyTarget
      ? { [UNIT]: r.target }
      : Array.isArray(r) || r instanceof Object
      ? this.toArguments(r)
      : r;
  }

  fromResult(r) {
    return UnitValue.isReference(r)
      ? this.object(r)
      : Array.isArray(r) || r instanceof Object
      ? this.fromArguments(r)
      : r;
  }

  toArguments(args) {
    return UnitValue.mapArguments(args, a => this.toResult(a));
  }

  fromArguments(args) {
    return UnitValue.mapArguments(args, a => this.fromResult(a));
  }
}

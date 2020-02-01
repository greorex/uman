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
  constructor(reference, handler) {
    this._reference = reference;

    // no then function
    // if promise check
    this.then = undefined;

    return new Proxy(this, {
      get: (t, prop, receiver) => {
        // own
        if (prop in t) return Reflect.get(t, prop, receiver);
        // unit knows
        return (...args) =>
          handler._redispatch({
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
 * engine to execute calls with built in cache
 */
export class UnitCallsEngine extends Map {
  constructor(handler) {
    super();

    this._n = 0; // next key

    // redispatcher
    this._handler = handler;
    this._redispatch = data => handler._redispatch(data);
  }

  next() {
    return ++this._n;
  }

  cache(handler, type) {
    const owner = this._handler.name,
      id = this.next();
    this.set(id, handler);
    // reference
    return {
      [type]: id,
      owner
    };
  }

  object(reference) {
    if (reference[UNIT]) return this._handler.units[reference[UNIT]];
    if (reference[OBJECT]) return new UnitObjectProxy(reference, this);
    if (reference[FUNCTION])
      return (...args) => {
        this._redispatch({
          type: REQUEST,
          target: reference.owner,
          reference,
          args
        });
      };
  }

  _oncall(data, handler) {
    const { reference } = data;
    // default
    if (!(reference && reference.owner === this._handler.name))
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

  mapArguments(args, f) {
    // one level only
    // array
    if (Array.isArray(args)) {
      return args.map(a =>
        a instanceof Object && !Array.isArray(a) ? f(a) : a
      );
    }
    // object
    else if (args instanceof Object) {
      const r = {};
      for (let [key, a] of Object.entries(args))
        r[key] = a instanceof Object && !Array.isArray(a) ? f(a) : a;
      return r;
    }
    // as is
    return args;
  }

  toResult(r) {
    return r instanceof UnitObject
      ? this.cache(r, OBJECT)
      : r instanceof Function
      ? this.cache(r, FUNCTION)
      : r instanceof UnitsProxyTarget
      ? { [UNIT]: r._target }
      : r instanceof UnitObjectProxy
      ? r._reference
      : this.toArguments(r);
  }

  fromResult(r) {
    return r instanceof Object && (r[OBJECT] || r[FUNCTION] || r[UNIT])
      ? this.object(r)
      : this.fromArguments(r);
  }

  toArguments(args) {
    return this.mapArguments(args, a => this.toResult(a));
  }

  fromArguments(args) {
    return this.mapArguments(args, a => this.fromResult(a));
  }
}

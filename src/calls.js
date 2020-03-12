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

import { MessageType as MT } from "./enums";
import { UnitObject } from "./object";
import { UnitsProxyTarget } from "./proxy";

// reference
const REFERENCE = "_ref";
// types
const ReferenceType = {
  OBJECT: 1,
  FUNCTION: 2,
  UNIT: 3
};

// alais
const RT = ReferenceType;

/**
 * creates reference object
 */
const Reference = (type, id = null, owner = null) => {
  const r =
    typeof type === "object"
      ? type
      : {
          type,
          id
        };
  if (owner) r.owner = owner;
  return {
    [REFERENCE]: r
  };
};

/**
 * object proxy
 */
class UnitObjectProxy {
  constructor(ref, handler) {
    this._ref = ref;

    // no then function
    // if promise check
    this.then = undefined;

    // no toJSON
    this.toJSON = undefined;

    return new Proxy(this, {
      get: (t, prop, receiver) =>
        prop in t
          ? // if own asked
            Reflect.get(t, prop, receiver)
          : // unit knows
            (...args) =>
              handler._redispatch({
                type: MT.REQUEST,
                target: ref.owner,
                handler: ref,
                method: prop,
                args
              })
    });
  }
}

/**
 * engine to execute calls with built in cache
 */
export default class extends Map {
  constructor(handler) {
    super();

    // key
    let _n = 0;
    this.store = value => {
      _n++;
      this.set(_n, value);
      return _n;
    };

    // redispatcher
    this._handler = handler;
  }

  _oncall(data, handler) {
    const ref = data.handler;

    // default context
    if (!(ref && ref.owner === handler.name)) {
      return handler._oncall(data);
    }

    // by reference
    const { type, id, owner } = ref;

    switch (type) {
      case RT.OBJECT: {
        const { method } = data,
          o = this.get(id),
          f = o[method];
        if (!(o instanceof UnitObject && typeof f === "function")) {
          throw new Error(`Wrong object for ${method} in ${owner}`);
        }
        return f.apply(o, data.args);
      }

      case RT.FUNCTION: {
        const f = this.get(id);
        if (typeof f !== "function") {
          throw new Error(`Wrong function reference in ${owner}`);
        }
        return f.apply(f, data.args);
      }
    }
  }

  replacer(v) {
    if (v instanceof UnitObjectProxy) {
      return Reference(v._ref);
    }
    if (v instanceof UnitsProxyTarget) {
      return Reference(RT.UNIT, v._target);
    }
    if (v instanceof UnitObject) {
      return Reference(RT.OBJECT, this.store(v), this._handler.name);
    }
    if (typeof v === "function") {
      return Reference(RT.FUNCTION, this.store(v), this._handler.name);
    }

    // as is
    return v;
  }

  reviver(v) {
    if (REFERENCE in v) {
      const handler = this._handler,
        { name, units } = handler,
        ref = v[REFERENCE],
        { type, id, owner } = ref;

      switch (type) {
        case RT.OBJECT:
          return owner === name
            ? this.get(id)
            : new UnitObjectProxy(ref, handler);

        case RT.FUNCTION:
          return owner === name
            ? this.get(id)
            : (...args) =>
                handler._redispatch({
                  type: MT.REQUEST,
                  target: owner,
                  handler: ref,
                  args
                });

        case RT.UNIT:
          return units[id];
      }
    }

    // as is
    return v;
  }
}
